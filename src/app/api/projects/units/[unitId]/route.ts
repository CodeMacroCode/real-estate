import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { ProjectUnit } from "@/models/ProjectUnit";
import { AuditLog } from "@/models/AuditLog";
import { Client } from "@/models/Client";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/units/[unitId]
 * Returns full unit details, current buyer/client profile, and audit log history
 */
export async function GET(
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

    const unit = await ProjectUnit.findById(unitId)
      .populate("bookedByClientId", "clientName phone email address company")
      .populate("projectId", "name projectId developerName")
      .lean();

    if (!unit) {
      return errorResponse("Unit not found", 404);
    }

    // Retrieve timeline audit history for this unit
    const auditLogs = await AuditLog.find({
      entity: "ProjectUnit",
      entityId: unitId,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return jsonResponse({
      unit,
      auditHistory: auditLogs,
    });
  } catch (error: any) {
    console.error("GET /api/projects/units/[unitId] error:", error);
    return errorResponse(error.message || "Failed to retrieve unit data", 500);
  }
}

/**
 * PATCH /api/projects/units/[unitId]
 * Full unit update (unitNumber, unitType, price, carpetArea, etc.)
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
    const updateFields: any = {};

    if (body.unitNumber) updateFields.unitNumber = body.unitNumber.trim();
    if (body.towerName) updateFields.towerName = body.towerName.trim();
    if (body.floorNumber !== undefined) updateFields.floorNumber = Number(body.floorNumber);
    if (body.unitType) updateFields.unitType = body.unitType.trim();
    if (body.carpetArea !== undefined) updateFields.carpetArea = Number(body.carpetArea);
    if (body.builtUpArea !== undefined) updateFields.builtUpArea = Number(body.builtUpArea);
    if (body.price !== undefined) updateFields.price = Number(body.price);
    if (body.facing !== undefined) updateFields.facing = body.facing;
    if (body.notes !== undefined) updateFields.notes = body.notes;

    const updated = await ProjectUnit.findByIdAndUpdate(
      unitId,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return errorResponse("Unit not found", 404);
    }

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/projects/units/[unitId] error:", error);
    return errorResponse(error.message || "Failed to update unit", 500);
  }
}

