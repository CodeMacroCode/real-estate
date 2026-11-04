import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Project } from "@/models/Project";
import { ProjectUnit, ProjectUnitStatus } from "@/models/ProjectUnit";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { recalculateProjectCounters } from "@/services/projectService";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/units
 * List all units belonging to a project, with optional status/tower filters
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
      return errorResponse("Invalid project ID", 400);
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const tower = searchParams.get("tower");
    const status = searchParams.get("status");

    const query: any = { projectId: new mongoose.Types.ObjectId(id) };
    if (tower) query.towerName = tower;
    if (status) query.status = status;

    const units = await ProjectUnit.find(query)
      .sort({ towerName: 1, floorNumber: 1, unitNumber: 1 })
      .lean();

    return jsonResponse(units);
  } catch (error: any) {
    console.error("GET /api/projects/[id]/units error:", error);
    return errorResponse(error.message || "Failed to retrieve units", 500);
  }
}

/**
 * POST /api/projects/[id]/units
 * Add a new unit to a project tower/floor and automatically recalculate project counters
 */
export async function POST(
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
      return errorResponse("Invalid project ID", 400);
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const body = await req.json();
    const {
      towerName,
      floorNumber,
      unitNumber,
      unitType,
      carpetArea,
      builtUpArea,
      balconyArea,
      facing,
      price,
      parkingSlots,
      status,
      notes,
    } = body;

    if (!towerName?.trim() || floorNumber === undefined || !unitNumber?.trim() || !unitType?.trim() || !price) {
      return errorResponse("Tower, floor, unitNumber, unitType, and price are mandatory", 400);
    }

    // Check duplicate unit in same tower
    const existingUnit = await ProjectUnit.findOne({
      projectId: project._id,
      towerName: towerName.trim(),
      unitNumber: unitNumber.trim(),
    });

    if (existingUnit) {
      return errorResponse(
        `Unit '${unitNumber.trim()}' already exists in ${towerName.trim()}`,
        409
      );
    }

    const newUnit = await ProjectUnit.create({
      adminId: project.adminId,
      projectId: project._id,
      towerName: towerName.trim(),
      floorNumber: Number(floorNumber),
      unitNumber: unitNumber.trim(),
      unitType: unitType.trim(),
      carpetArea: Number(carpetArea) || 0,
      builtUpArea: builtUpArea ? Number(builtUpArea) : undefined,
      balconyArea: balconyArea ? Number(balconyArea) : undefined,
      facing: facing?.trim() || "",
      price: Number(price),
      parkingSlots: Number(parkingSlots) || 0,
      status: (status as ProjectUnitStatus) || "Available",
      notes: notes || "",
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Update Project inventory counters
    await recalculateProjectCounters(project._id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: project.adminId.toString(),
      },
      action: "create",
      entity: "ProjectUnit",
      entityId: newUnit._id.toString(),
      newValues: { towerName, floorNumber, unitNumber, unitType, price },
      source: "api",
    });

    return jsonResponse(newUnit, 201);
  } catch (error: any) {
    console.error("POST /api/projects/[id]/units error:", error);
    return errorResponse(error.message || "Failed to create project unit", 500);
  }
}

