import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Project } from "@/models/Project";
import { ProjectUnit } from "@/models/ProjectUnit";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getProjectStructureTree, recalculateProjectCounters } from "@/services/projectService";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]
 * Supports:
 *  - Standard project profile
 *  - ?view=structure (Returns full Tower -> Floor -> Unit tree)
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

    const { searchParams } = new URL(req.url);
    const isStructure = searchParams.get("view") === "structure";

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const orgAdminId = isSuperAdmin ? undefined : authContext.user._id;

    if (isStructure) {
      const tree = await getProjectStructureTree(id, orgAdminId);
      if (!tree) {
        return errorResponse("Project not found or unauthorized", 404);
      }
      return jsonResponse(tree);
    }

    await connectToDatabase();
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const project = await Project.findOne(query);
    if (!project) {
      return errorResponse("Project not found or unauthorized", 404);
    }

    return jsonResponse(project);
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return errorResponse(error.message || "Failed to retrieve project", 500);
  }
}

/**
 * PATCH /api/projects/[id]
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
      return errorResponse("Invalid project ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const project = await Project.findOne(query);
    if (!project) {
      return errorResponse("Project not found or unauthorized", 404);
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.name) updateFields.name = body.name.trim();
    if (body.developerName) updateFields.developerName = body.developerName.trim();
    if (body.projectType) updateFields.projectType = body.projectType;
    if (body.constructionStatus) updateFields.constructionStatus = body.constructionStatus;
    if (body.reraNumber !== undefined) updateFields.reraNumber = body.reraNumber;
    if (body.amenities) updateFields.amenities = body.amenities;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.isPublishedOnWebsite !== undefined) updateFields.isPublishedOnWebsite = body.isPublishedOnWebsite;
    if (body.featuredOnWebsite !== undefined) updateFields.featuredOnWebsite = body.featuredOnWebsite;
    if (body.location) updateFields.location = { ...project.location, ...body.location };
    if (body.media) updateFields.media = { ...project.media, ...body.media };

    const updated = await Project.findByIdAndUpdate(
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
        parentAdminId: project.adminId.toString(),
      },
      action: "update",
      entity: "Project",
      entityId: id,
      newValues: updateFields,
      source: "api",
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/projects/[id] error:", error);
    return errorResponse(error.message || "Failed to update project", 500);
  }
}

/**
 * DELETE /api/projects/[id]
 * Guard: Blocks deletion if booked or sold units exist in project!
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
      return errorResponse("Invalid project ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isSuperAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    const project = await Project.findOne(query);
    if (!project) {
      return errorResponse("Project not found or unauthorized", 404);
    }

    // Check for booked or sold units
    const bookedSoldUnitsCount = await ProjectUnit.countDocuments({
      projectId: project._id,
      status: { $in: ["Booked", "Sold"] },
    });

    if (bookedSoldUnitsCount > 0) {
      return errorResponse(
        `Cannot delete project: ${bookedSoldUnitsCount} units are currently Booked or Sold. Reassign or cancel bookings first.`,
        400
      );
    }

    // Clean up units
    await ProjectUnit.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: project.adminId.toString(),
      },
      action: "delete",
      entity: "Project",
      entityId: id,
      oldValues: { projectId: project.projectId, name: project.name },
      source: "api",
    });

    return jsonResponse({ success: true, message: "Project and units deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id] error:", error);
    return errorResponse(error.message || "Failed to delete project", 500);
  }
}

