import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getSsrProjects } from "@/services/projectService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const projectType = searchParams.get("projectType") || undefined;
    const constructionStatus = searchParams.get("constructionStatus") || undefined;
    const city = searchParams.get("city") || undefined;
    const adminFilter = searchParams.get("adminId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSsrProjects({
      userId: authContext.user._id,
      roleSlug: authContext.role.slug,
      adminFilter,
      search,
      projectType,
      constructionStatus,
      city,
      page,
      limit,
    });

    return jsonResponse(result.projects, 200, result.pagination);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return errorResponse(error.message || "Failed to retrieve projects", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Organization scoping
    let targetAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin) {
      const body = await req.clone().json();
      if (!body.adminId) {
        return errorResponse("adminId is required when creating a project as Super Admin", 400);
      }
      targetAdminId = new mongoose.Types.ObjectId(body.adminId);
    } else if (isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse("User must belong to an organization admin", 403);
      }
      const parentId =
        typeof currentUser.parentAdminId === "object" && "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      targetAdminId = new mongoose.Types.ObjectId(String(parentId));
    }

    const body = await req.json();
    const {
      name,
      developerName,
      projectType,
      location,
      reraNumber,
      constructionStatus,
      launchDate,
      possessionDate,
      amenities,
      description,
      media,
      isPublishedOnWebsite,
      featuredOnWebsite,
      seo,
    } = body;

    if (!name?.trim() || !developerName?.trim() || !location?.city?.trim()) {
      return errorResponse("Project name, developer name, and city are mandatory", 400);
    }

    // Auto-generate Project ID
    const count = await Project.countDocuments({ adminId: targetAdminId });
    const year = new Date().getFullYear();
    const projectId = `PRJ-${year}-${String(count + 1).padStart(4, "0")}`;

    const newProject = await Project.create({
      adminId: targetAdminId,
      projectId,
      name: name.trim(),
      developerName: developerName.trim(),
      projectType: projectType || "Residential",
      location: {
        address: location.address || "",
        city: location.city.trim(),
        landmark: location.landmark || "",
        pincode: location.pincode || "",
        lat: location.lat,
        lng: location.lng,
      },
      reraNumber: reraNumber?.trim() || "",
      constructionStatus: constructionStatus || "Under Construction",
      launchDate: launchDate ? new Date(launchDate) : undefined,
      possessionDate: possessionDate ? new Date(possessionDate) : undefined,
      amenities: Array.isArray(amenities) ? amenities : [],
      description: description || "",
      media: media || { images: [], videos: [], floorPlans: [] },
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      soldUnits: 0,
      isPublishedOnWebsite: Boolean(isPublishedOnWebsite),
      featuredOnWebsite: Boolean(featuredOnWebsite),
      seo: seo || { slug: name.toLowerCase().replace(/[\s-]+/g, "_") },
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: targetAdminId.toString(),
      },
      action: "create",
      entity: "Project",
      entityId: newProject._id.toString(),
      newValues: { projectId, name, developerName, city: location.city },
      source: "api",
    });

    return jsonResponse(newProject, 201);
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return errorResponse(error.message || "Failed to create project", 500);
  }
}

