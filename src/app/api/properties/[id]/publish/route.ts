import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Property } from "@/models/Property";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { shouldAutoUnpublishStatus } from "@/services/propertyService";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/properties/[id]/publish
 * Website CMS Publishing Engine:
 * Allows Real Estate agents/admins to publish or unpublish any property to/from
 * the public-facing company website portal with validation checks.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid property ID", 400);
    }

    await connectToDatabase();

    const property = await Property.findById(id);
    if (!property) {
      return errorResponse("Property not found", 404);
    }

    // Role check: Only authorized staff belonging to property org can publish
    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";
    const userAdminId = authContext.user.parentAdminId
      ? typeof authContext.user.parentAdminId === "object"
        ? (authContext.user.parentAdminId as any)._id
        : authContext.user.parentAdminId
      : authContext.user._id;

    if (
      !isSuperAdmin &&
      property.adminId.toString() !== userAdminId.toString()
    ) {
      return errorResponse(
        "Forbidden: You do not own this property record",
        403,
      );
    }

    const body = await req.json();
    const targetPublishState = Boolean(body.publishOnWebsite);
    const featuredProperty =
      body.featuredProperty !== undefined
        ? Boolean(body.featuredProperty)
        : property.publishing.featuredProperty;

    // Quality gate: Cannot publish if status is inactive or terminal
    if (targetPublishState) {
      if (await shouldAutoUnpublishStatus(property.status)) {
        return errorResponse(
          `Cannot publish property on website while status is '${property.status}'. Status must be 'Available' or 'Hold'.`,
          400,
        );
      }

      // Check required public marketing fields
      const hasPrice =
        (property.pricing?.price && property.pricing.price > 0) ||
        (property.pricing?.monthlyRent && property.pricing.monthlyRent > 0);
      if (!hasPrice) {
        return errorResponse(
          "Cannot publish without a valid Sale Price or Monthly Rent.",
          400,
        );
      }
    }

    // Apply publishing updates
    property.publishing.publishOnWebsite = targetPublishState;
    property.publishing.featuredProperty = featuredProperty;
    if (targetPublishState) {
      property.publishing.publishedAt = new Date();
      property.publishing.unpublishReason = undefined;
    } else {
      property.publishing.unpublishReason =
        body.unpublishReason || "Unpublished manually by manager";
    }

    await property.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
      },
      action: "publish",
      entity: "properties",
      entityId: property._id.toString(),
      newValues: {
        propertyId: property.propertyId,
        publishOnWebsite: targetPublishState,
        featuredProperty,
      },
    });

    const publicUrl = `/portal-properties/${property.publishing.seo?.slug || property.propertyId.toLowerCase()}`;

    return jsonResponse({
      propertyId: property.propertyId,
      publishOnWebsite: property.publishing.publishOnWebsite,
      featuredProperty: property.publishing.featuredProperty,
      publicUrl,
      message: targetPublishState
        ? `Property ${property.propertyId} is now LIVE on your company website portal!`
        : `Property ${property.propertyId} has been taken OFFLINE from the website.`,
    });
  } catch (error: any) {
    console.error("PATCH /api/properties/[id]/publish error:", error);
    return errorResponse(
      error.message || "Failed to update publishing state",
      500,
    );
  }
}
