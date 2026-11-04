import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Property } from "@/models/Property";
import { Owner } from "@/models/Owner";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { shouldAutoUnpublishStatus, calculateInvestmentRoi } from "@/services/propertyService";

export const dynamic = "force-dynamic";

/**
 * GET /api/properties/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid property ID", 400);
    }

    await connectToDatabase();
    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const property = await Property.findOne(query)
      .populate("ownerId", "name mobile email ownershipType panGstNumber")
      .populate("projectId", "name developerName reraNumber")
      .populate("unitId", "towerName floorNumber unitNumber price status");

    if (!property) {
      return errorResponse("Property not found or unauthorized", 404);
    }

    return jsonResponse(property);
  } catch (error: any) {
    console.error("GET /api/properties/[id] error:", error);
    return errorResponse(error.message || "Failed to retrieve property", 500);
  }
}

/**
 * PATCH /api/properties/[id]
 * Includes Automatic Website Unpublishing on status transitions to Sold, Rented, Leased, etc.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid property ID", 400);
    }

    await connectToDatabase();
    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const property = await Property.findOne(query);
    if (!property) {
      return errorResponse("Property not found or unauthorized", 404);
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.title) updateFields.title = body.title.trim();
    if (body.propertyCategory) updateFields.propertyCategory = body.propertyCategory;
    if (body.propertyType) updateFields.propertyType = body.propertyType;
    if (body.transactionType) updateFields.transactionType = body.transactionType;
    if (body.pricing) updateFields.pricing = { ...property.pricing, ...body.pricing };
    if (body.areaDetails) updateFields.areaDetails = { ...property.areaDetails, ...body.areaDetails };
    if (body.location) updateFields.location = { ...property.location, ...body.location };
    if (body.amenities) updateFields.amenities = body.amenities;
    if (body.residentialSpecs) {
      const mergedSpecs = { ...property.residentialSpecs, ...body.residentialSpecs };
      if (mergedSpecs.furnishing) {
        const f = mergedSpecs.furnishing.trim();
        if (/^fully[\s-_]?furnished$/i.test(f)) mergedSpecs.furnishing = "Fully-Furnished";
        else if (/^semi[\s-_]?furnished$/i.test(f)) mergedSpecs.furnishing = "Semi-Furnished";
        else if (/^unfurnished$/i.test(f)) mergedSpecs.furnishing = "Unfurnished";
      }
      updateFields.residentialSpecs = mergedSpecs;
    }
    if (body.media) updateFields.media = { ...property.media, ...body.media };

    // Status transition & Automatic Unpublishing rule
    if (body.status && body.status !== property.status) {
      updateFields.status = body.status;

      // Check if new status triggers unpublish
      const unpublishNeeded = await shouldAutoUnpublishStatus(body.status);
      if (unpublishNeeded && property.publishing.publishOnWebsite) {
        updateFields["publishing.publishOnWebsite"] = false;
        updateFields["publishing.unpublishReason"] = `Automatic unpublish triggered by status '${body.status}'`;
      }
    }

    // Manual publishing toggle
    if (body.publishing) {
      if (body.publishing.publishOnWebsite !== undefined) {
        updateFields["publishing.publishOnWebsite"] = body.publishing.publishOnWebsite;
      }
      if (body.publishing.featuredProperty !== undefined) {
        updateFields["publishing.featuredProperty"] = body.publishing.featuredProperty;
      }
    }

    // Pre-Leased Investment ROI update
    if (body.investmentSpecs || body.pricing?.price || body.pricing?.monthlyRent) {
      const price = body.pricing?.price || property.pricing.price || 0;
      const rent = body.pricing?.monthlyRent || property.pricing.monthlyRent || 0;
      const calculated = calculateInvestmentRoi(rent, price);
      updateFields.investmentSpecs = {
        ...(property.investmentSpecs || {}),
        ...(body.investmentSpecs || {}),
        currentMonthlyRent: rent,
        expectedAnnualRent: calculated.expectedAnnualRent,
        grossYieldPercent: calculated.grossYieldPercent,
      };
    }

    const updated = await Property.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: property.adminId.toString(),
      },
      action: "update",
      entity: "Property",
      entityId: id,
      newValues: updateFields,
      source: "api",
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/properties/[id] error:", error);
    return errorResponse(error.message || "Failed to update property", 500);
  }
}

/**
 * DELETE /api/properties/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid property ID", 400);
    }

    await connectToDatabase();
    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const property = await Property.findOne(query);
    if (!property) {
      return errorResponse("Property not found or unauthorized", 404);
    }

    await Property.findByIdAndDelete(id);

    // Update Owner property count
    if (property.ownerId) {
      const count = await Property.countDocuments({ ownerId: property.ownerId });
      await Owner.findByIdAndUpdate(property.ownerId, { totalPropertiesOwned: count });
    }

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: property.adminId.toString(),
      },
      action: "delete",
      entity: "Property",
      entityId: id,
      oldValues: { propertyId: property.propertyId, title: property.title },
      source: "api",
    });

    return jsonResponse({ success: true, message: "Property deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/properties/[id] error:", error);
    return errorResponse(error.message || "Failed to delete property", 500);
  }
}

