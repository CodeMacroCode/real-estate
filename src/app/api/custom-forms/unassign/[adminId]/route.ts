import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { FormAdminAssignment } from "@/models/CustomForm";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ adminId: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    if (authContext.role?.slug !== "super_admin") {
      return errorResponse(
        "Only Super Admin can unassign forms from Admins",
        403,
      );
    }

    await connectToDatabase();
    const { adminId } = await params;

    const existingAssignment = await FormAdminAssignment.findOne({
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!existingAssignment) {
      return errorResponse(
        "No active form assignment found for this Admin",
        404,
      );
    }

    await FormAdminAssignment.findOneAndDelete({
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "delete",
      entity: "form_assignments",
      entityId: existingAssignment._id.toString(),
      oldValues: {
        adminId,
        formId: existingAssignment.formId.toString(),
        publicSlug: existingAssignment.publicSlug,
      },
    });

    return jsonResponse({ message: "Form assignment removed successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to unassign form", 500);
  }
}
