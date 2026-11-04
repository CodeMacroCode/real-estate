import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { MasterOption } from "@/models/MasterOption";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/masters/[id]
 * Updates label, displayOrder, isActive, metadata.
 * Prevents non-super-admins from modifying global defaults.
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
      return errorResponse("Invalid master option ID", 400);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    if (!isSuperAdmin && !isAdmin) {
      return errorResponse(
        "Forbidden: Insufficient privileges to update master settings",
        403,
      );
    }

    const option = await MasterOption.findById(id);
    if (!option) {
      return errorResponse("Master option not found", 404);
    }

    const userAdminId = authContext.user._id?.toString();
    const optionAdminId = option.adminId?.toString();

    // Tenant authorization check
    if (option.adminId === null) {
      // Global system default
      if (!isSuperAdmin) {
        return errorResponse(
          "Forbidden: Only Super Admin can modify global system defaults",
          403,
        );
      }
    } else {
      // Tenant-specific master
      if (!isSuperAdmin && optionAdminId !== userAdminId) {
        return errorResponse(
          "Forbidden: Cannot modify another organization's master settings",
          403,
        );
      }
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.label && typeof body.label === "string") {
      updateFields.label = body.label.trim();
    }
    if (typeof body.displayOrder === "number") {
      updateFields.displayOrder = body.displayOrder;
    }
    if (typeof body.isActive === "boolean") {
      updateFields.isActive = body.isActive;
    }
    if (body.metadata && typeof body.metadata === "object") {
      updateFields.metadata = { ...(option.metadata || {}), ...body.metadata };
    }

    const updated = await MasterOption.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true },
    );

    // Audit Logging
    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: option.adminId?.toString(),
      },
      action: "update",
      entity: "MasterOption",
      entityId: id,
      newValues: updateFields,
      source: "api",
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/masters/[id] error:", error);
    return errorResponse(
      error.message || "Failed to update master option",
      500,
    );
  }
}

/**
 * DELETE /api/masters/[id]
 * Deletes custom master option.
 * Strictly blocks deleting global system defaults.
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
      return errorResponse("Invalid master option ID", 400);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    if (!isSuperAdmin && !isAdmin) {
      return errorResponse(
        "Forbidden: Insufficient privileges to delete master settings",
        403,
      );
    }

    const option = await MasterOption.findById(id);
    if (!option) {
      return errorResponse("Master option not found", 404);
    }

    if (option.isSystemDefault) {
      return errorResponse(
        "Forbidden: System default master options cannot be deleted",
        403,
      );
    }

    const userAdminId = authContext.user._id?.toString();
    const optionAdminId = option.adminId?.toString();

    if (!isSuperAdmin && optionAdminId !== userAdminId) {
      return errorResponse(
        "Forbidden: Cannot delete another organization's master option",
        403,
      );
    }

    await MasterOption.findByIdAndDelete(id);

    // Audit Logging
    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: option.adminId?.toString(),
      },
      action: "delete",
      entity: "MasterOption",
      entityId: id,
      oldValues: { category: option.category, value: option.value },
      source: "api",
    });

    return jsonResponse({
      success: true,
      message: "Master option deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/masters/[id] error:", error);
    return errorResponse(
      error.message || "Failed to delete master option",
      500,
    );
  }
}
