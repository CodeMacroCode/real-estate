import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { CustomForm, FormAdminAssignment } from "@/models/CustomForm";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (authContext.role?.slug !== "super_admin") {
      return errorResponse("Only Super Admin can assign forms to Admins", 403);
    }

    await connectToDatabase();

    const body = await req.json();
    const { formId, adminId, publicSlug, isActive = true } = body;

    if (!formId || !adminId || !publicSlug) {
      return errorResponse("formId, adminId, and publicSlug are required", 400);
    }

    // Verify Form exists
    const form = await CustomForm.findById(formId);
    if (!form) {
      return errorResponse("Custom Form template not found", 404);
    }

    // Verify Admin user exists
    const adminUser = await User.findById(adminId);
    if (!adminUser) {
      return errorResponse("Admin user not found", 404);
    }

    // Format & check unique slug
    const cleanSlug = publicSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-");
    const existingSlug = await FormAdminAssignment.findOne({
      publicSlug: cleanSlug,
    });
    if (existingSlug && existingSlug.adminId.toString() !== adminId) {
      return errorResponse(
        "This public URL slug is already taken. Please choose another.",
        400,
      );
    }

    // Upsert assignment for this Admin
    const assignment = await FormAdminAssignment.findOneAndUpdate(
      { adminId: new mongoose.Types.ObjectId(adminId) },
      {
        formId: new mongoose.Types.ObjectId(formId),
        adminId: new mongoose.Types.ObjectId(adminId),
        publicSlug: cleanSlug,
        isActive: Boolean(isActive),
        assignedBy: new mongoose.Types.ObjectId(authContext.user._id),
      },
      { upsert: true, new: true },
    );

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "assign",
      entity: "custom_forms",
      entityId: form._id.toString(),
      newValues: {
        adminId,
        formName: form.name,
        publicSlug: cleanSlug,
      },
    });

    return jsonResponse(assignment, 201);
  } catch (error: any) {
    return errorResponse(
      error.message || "Failed to assign form to admin",
      500,
    );
  }
}
