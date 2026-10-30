import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Lead } from "@/models/Lead";
import { FormAdminAssignment } from "@/models/CustomForm";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
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
        "Only Super Admin can check admin impact metrics",
        403,
      );
    }

    await connectToDatabase();
    const { adminId } = await params;

    const [adminUser, assignment, totalLeads, dynamicFormLeads] =
      await Promise.all([
        User.findById(adminId).select("name email designation branch").lean(),
        FormAdminAssignment.findOne({
          adminId: new mongoose.Types.ObjectId(adminId),
        })
          .populate("formId", "name version")
          .lean(),
        Lead.countDocuments({ adminId: new mongoose.Types.ObjectId(adminId) }),
        Lead.countDocuments({
          adminId: new mongoose.Types.ObjectId(adminId),
          source: "DynamicForm",
        }),
      ]);

    if (!adminUser) {
      return errorResponse("Admin user not found", 404);
    }

    return jsonResponse({
      admin: adminUser,
      assignment,
      impact: {
        totalLeads,
        dynamicFormLeads,
        publicSlug: assignment?.publicSlug || null,
        activeCampaigns:
          dynamicFormLeads > 0 ? Math.ceil(dynamicFormLeads / 10) : 0,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to calculate impact", 500);
  }
}
