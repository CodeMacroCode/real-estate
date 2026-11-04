import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Owner } from "@/models/Owner";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getSsrOwners } from "@/services/ownerService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const ownershipType = searchParams.get("ownershipType") || undefined;
    const adminFilter = searchParams.get("adminId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSsrOwners({
      userId: authContext.user._id,
      roleSlug: authContext.role.slug,
      adminFilter,
      search,
      ownershipType,
      page,
      limit,
    });

    return jsonResponse(result.owners, 200, result.pagination);
  } catch (error: any) {
    console.error("GET /api/owners error:", error);
    return errorResponse(error.message || "Failed to retrieve owners", 500);
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

    // Target Admin determination
    let targetAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin) {
      const body = await req.clone().json();
      if (!body.adminId) {
        return errorResponse(
          "adminId is required when creating an owner as Super Admin",
          400,
        );
      }
      targetAdminId = new mongoose.Types.ObjectId(body.adminId);
    } else if (isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse(
          "Sub-role user must belong to an organization admin",
          403,
        );
      }
      const parentId =
        typeof currentUser.parentAdminId === "object" &&
        "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      targetAdminId = new mongoose.Types.ObjectId(String(parentId));
    }

    const body = await req.json();
    const {
      name,
      mobile,
      email,
      whatsApp,
      address,
      company,
      panGstNumber,
      ownershipType,
      preferredContactMethod,
      notes,
      documents,
      assignedStaffId,
    } = body;

    if (!name?.trim() || !mobile?.trim()) {
      return errorResponse("Owner name and mobile number are mandatory", 400);
    }

    // Check duplicate mobile within organization
    const existingMobile = await Owner.findOne({
      adminId: targetAdminId,
      mobile: mobile.trim(),
    });

    if (existingMobile) {
      return errorResponse(
        `An owner with mobile number '${mobile.trim()}' already exists in your organization`,
        409,
      );
    }

    // Auto-generate Owner ID
    const count = await Owner.countDocuments({ adminId: targetAdminId });
    const year = new Date().getFullYear();
    const ownerId = `OWN-${year}-${String(count + 1).padStart(4, "0")}`;

    const newOwner = await Owner.create({
      adminId: targetAdminId,
      ownerId,
      name: name.trim(),
      mobile: mobile.trim(),
      whatsApp: whatsApp?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      address: address?.trim() || "",
      company: company?.trim() || "",
      panGstNumber: panGstNumber?.trim().toUpperCase() || "",
      ownershipType: ownershipType || "Individual",
      preferredContactMethod: preferredContactMethod || "Call",
      notes: notes || "",
      documents: Array.isArray(documents) ? documents : [],
      assignedStaffId: assignedStaffId
        ? new mongoose.Types.ObjectId(assignedStaffId)
        : undefined,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Audit Logging
    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: targetAdminId.toString(),
      },
      action: "create",
      entity: "Owner",
      entityId: newOwner._id.toString(),
      newValues: { ownerId, name, mobile, ownershipType },
      source: "api",
    });

    return jsonResponse(newOwner, 201);
  } catch (error: any) {
    console.error("POST /api/owners error:", error);
    return errorResponse(error.message || "Failed to create owner", 500);
  }
}
