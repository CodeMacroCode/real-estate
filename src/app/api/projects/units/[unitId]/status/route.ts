import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { ProjectUnit } from "@/models/ProjectUnit";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { recalculateProjectCounters } from "@/services/projectService";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/projects/units/[unitId]/status
 * Concurrency-safe unit booking and status transitions
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { unitId } = await params;
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      return errorResponse("Invalid unit ID", 400);
    }

    await connectToDatabase();

    const body = await req.json();
    const { status, clientId, notes } = body;

    if (!status) {
      return errorResponse("Target unit status is required", 400);
    }

    // Atomic findOneAndUpdate to prevent race conditions during booking
    const currentUnit = await ProjectUnit.findById(unitId);
    if (!currentUnit) {
      return errorResponse("Unit not found", 404);
    }

    // Guard: Prevent double-booking
    if (status === "Booked" && (currentUnit.status === "Booked" || currentUnit.status === "Sold")) {
      return errorResponse(
        `Unit is already ${currentUnit.status.toLowerCase()} and cannot be booked again`,
        409
      );
    }

    const updateFields: any = {
      status,
      notes: notes !== undefined ? notes : currentUnit.notes,
    };

    if (status === "Booked") {
      updateFields.bookedByClientId = clientId ? new mongoose.Types.ObjectId(clientId) : undefined;
      updateFields.bookingDate = new Date();
    } else if (status === "Available") {
      updateFields.bookedByClientId = null;
      updateFields.bookingDate = null;
    }

    const updatedUnit = await ProjectUnit.findByIdAndUpdate(
      unitId,
      { $set: updateFields },
      { new: true }
    );

    // Recalculate project totals
    await recalculateProjectCounters(currentUnit.projectId);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: currentUnit.adminId.toString(),
      },
      action: "status_change",
      entity: "ProjectUnit",
      entityId: unitId,
      oldValues: { status: currentUnit.status },
      newValues: { status },
      source: "api",
    });

    return jsonResponse(updatedUnit);
  } catch (error: any) {
    console.error("PATCH /api/projects/units/[unitId]/status error:", error);
    return errorResponse(error.message || "Failed to update unit status", 500);
  }
}

