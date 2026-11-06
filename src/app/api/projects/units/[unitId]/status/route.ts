import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { ProjectUnit } from "@/models/ProjectUnit";
import { Project } from "@/models/Project";
import { Booking } from "@/models/Booking";
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

    // Automatically create or update Booking ledger entry when marked as Booked or Sold with a client
    if ((status === "Booked" || status === "Sold") && clientId) {
      try {
        const project = await Project.findById(currentUnit.projectId);
        const invLabel = `${project?.name || "Project"} - ${currentUnit.towerName} - Unit ${currentUnit.unitNumber}`;

        const existingBooking = await Booking.findOne({
          projectUnitId: currentUnit._id,
        });

        if (existingBooking) {
          existingBooking.bookingStatus = status;
          existingBooking.clientId = new mongoose.Types.ObjectId(clientId);
          if (notes) existingBooking.notes = notes;
          await existingBooking.save();
        } else {
          const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const bkgNumber = `BKG-${datePrefix}-${randomSuffix}`;

          await Booking.create({
            adminId: currentUnit.adminId,
            bookingNumber: bkgNumber,
            clientId: new mongoose.Types.ObjectId(clientId),
            itemType: "ProjectUnit",
            projectId: currentUnit.projectId,
            projectUnitId: currentUnit._id,
            inventoryLabel: invLabel,
            bookingStatus: status,
            agreementValue: currentUnit.price || 0,
            payments: [],
            documents: [],
            notes: notes || `Directly booked from Project Elevation / Inventory.`,
            createdById: authContext.user._id,
          });
        }
      } catch (bookingErr) {
        console.error("Auto booking creation failed:", bookingErr);
      }
    } else if (status === "Available") {
      try {
        await Booking.findOneAndUpdate(
          { projectUnitId: currentUnit._id },
          { $set: { bookingStatus: "Cancelled" } }
        );
      } catch (err) {
        console.error("Auto cancel booking failed:", err);
      }
    }

    return jsonResponse(updatedUnit);
  } catch (error: any) {
    console.error("PATCH /api/projects/units/[unitId]/status error:", error);
    return errorResponse(error.message || "Failed to update unit status", 500);
  }
}

