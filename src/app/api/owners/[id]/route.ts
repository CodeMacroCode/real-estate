import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Owner } from "@/models/Owner";
import { Property } from "@/models/Property";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getOwner360View } from "@/services/ownerService";

export const dynamic = "force-dynamic";

/**
 * GET /api/owners/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid owner ID", 400);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const orgAdminId = isSuperAdmin ? undefined : authContext.user._id;

    // Check query for 360 view request
    const { searchParams } = new URL(req.url);
    const is360 = searchParams.get("view") === "360";

    if (is360) {
      const data360 = await getOwner360View(id, orgAdminId);
      if (!data360) {
        return errorResponse("Owner not found or unauthorized", 404);
      }
      return jsonResponse(data360);
    }

    await connectToDatabase();
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const owner = await Owner.findOne(query)
      .populate("assignedStaffId", "name email")
      .populate("createdById", "name email");

    if (!owner) {
      return errorResponse("Owner not found or unauthorized", 404);
    }

    return jsonResponse(owner);
  } catch (error: any) {
    console.error("GET /api/owners/[id] error:", error);
    return errorResponse(error.message || "Failed to retrieve owner", 500);
  }
}

/**
 * PATCH /api/owners/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid owner ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const owner = await Owner.findOne(query);
    if (!owner) {
      return errorResponse("Owner not found or unauthorized", 404);
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.name) updateFields.name = body.name.trim();
    if (body.whatsApp) updateFields.whatsApp = body.whatsApp.trim();
    if (body.email) updateFields.email = body.email.trim().toLowerCase();
    if (body.address) updateFields.address = body.address.trim();
    if (body.company) updateFields.company = body.company.trim();
    if (body.panGstNumber)
      updateFields.panGstNumber = body.panGstNumber.trim().toUpperCase();
    if (body.ownershipType) updateFields.ownershipType = body.ownershipType;
    if (body.preferredContactMethod)
      updateFields.preferredContactMethod = body.preferredContactMethod;
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (Array.isArray(body.documents)) updateFields.documents = body.documents;
    if (body.assignedStaffId)
      updateFields.assignedStaffId = new mongoose.Types.ObjectId(
        body.assignedStaffId,
      );

    const updated = await Owner.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true },
    );

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: owner.adminId.toString(),
      },
      action: "update",
      entity: "Owner",
      entityId: id,
      newValues: updateFields,
      source: "api",
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/owners/[id] error:", error);
    return errorResponse(error.message || "Failed to update owner", 500);
  }
}

/**
 * DELETE /api/owners/[id]
 * Enforces business rule: Owner cannot be deleted if active properties exist!
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid owner ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const owner = await Owner.findOne(query);
    if (!owner) {
      return errorResponse("Owner not found or unauthorized", 404);
    }

    // Guard: Check if properties exist for this owner
    const propertyCount = await Property.countDocuments({ ownerId: owner._id });
    if (propertyCount > 0) {
      return errorResponse(
        `Cannot delete owner: ${propertyCount} properties are currently linked to this owner. Reassign or archive properties first.`,
        400,
      );
    }

    await Owner.findByIdAndDelete(id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: owner.adminId.toString(),
      },
      action: "delete",
      entity: "Owner",
      entityId: id,
      oldValues: { ownerId: owner.ownerId, name: owner.name },
      source: "api",
    });

    return jsonResponse({
      success: true,
      message: "Owner deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/owners/[id] error:", error);
    return errorResponse(error.message || "Failed to delete owner", 500);
  }
}
