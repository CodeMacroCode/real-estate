import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Project } from "@/models/Project";
import { ProjectUnit } from "@/models/ProjectUnit";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

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
    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    let query: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: new mongoose.Types.ObjectId(id) };
    } else {
      const decoded = decodeURIComponent(id).trim();
      query = {
        $or: [
          { "seo.slug": decoded.toLowerCase() },
          { projectId: { $regex: new RegExp(`^${decoded}$`, "i") } },
          { name: { $regex: new RegExp(`^${decoded.replace(/[-_]/g, "[ -_]")}$`, "i") } },
        ],
      };
    }
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const project = await Project.findOne(query);
    if (!project) {
      return errorResponse("Project not found or unauthorized", 404);
    }

    const body = await req.json();
    const { towerName } = body;

    if (!towerName || !towerName.trim()) {
      return errorResponse("Tower / Block Name is required", 400);
    }

    const trimmedTower = towerName.trim();

    if (!project.towers) {
      project.towers = [];
    }

    if (project.towers.includes(trimmedTower)) {
      return errorResponse(`Tower '${trimmedTower}' already exists in this project`, 409);
    }

    project.towers.push(trimmedTower);
    await project.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: project.adminId.toString(),
      },
      action: "create",
      entity: "ProjectTower",
      entityId: project._id.toString(),
      newValues: { towerName: trimmedTower },
    });

    return jsonResponse({
      message: `Tower '${trimmedTower}' created successfully`,
      towers: project.towers,
    });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/towers error:", error);
    return errorResponse(error.message || "Failed to create tower", 500);
  }
}

/**
 * PATCH /api/projects/[id]/towers
 * Rename an existing tower / block and update all constituent units
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
    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    let query: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: new mongoose.Types.ObjectId(id) };
    } else {
      const decoded = decodeURIComponent(id).trim();
      query = {
        $or: [
          { "seo.slug": decoded.toLowerCase() },
          { projectId: { $regex: new RegExp(`^${decoded}$`, "i") } },
          { name: { $regex: new RegExp(`^${decoded.replace(/[-_]/g, "[ -_]")}$`, "i") } },
        ],
      };
    }
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const project = await Project.findOne(query);
    if (!project) {
      return errorResponse("Project not found or unauthorized", 404);
    }

    const body = await req.json();
    const { oldTowerName, newTowerName } = body;

    if (!oldTowerName?.trim() || !newTowerName?.trim()) {
      return errorResponse("Current tower name and new tower name are required", 400);
    }

    const oldName = oldTowerName.trim();
    const newName = newTowerName.trim();

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      return jsonResponse({ message: "No change", towers: project.towers });
    }

    if (!project.towers) project.towers = [];

    // Check duplicate
    if (project.towers.some((t: string) => t.toLowerCase() === newName.toLowerCase())) {
      return errorResponse(`Tower '${newName}' already exists in this project`, 409);
    }

    // Rename in project.towers array
    const towerIndex = project.towers.findIndex((t: string) => t.toLowerCase() === oldName.toLowerCase());
    if (towerIndex !== -1) {
      project.towers[towerIndex] = newName;
    } else {
      project.towers.push(newName);
    }

    await project.save();

    // Cascade rename to all existing ProjectUnit documents
    await ProjectUnit.updateMany(
      { projectId: project._id, towerName: oldName },
      { $set: { towerName: newName } }
    );

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: project.adminId.toString(),
      },
      action: "update",
      entity: "ProjectTower",
      entityId: project._id.toString(),
      oldValues: { towerName: oldName },
      newValues: { towerName: newName },
    });

    return jsonResponse({
      message: `Tower renamed from '${oldName}' to '${newName}'`,
      towers: project.towers,
    });
  } catch (error: any) {
    console.error("PATCH /api/projects/[id]/towers error:", error);
    return errorResponse(error.message || "Failed to rename tower", 500);
  }
}
