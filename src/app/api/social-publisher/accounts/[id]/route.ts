import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { SocialConnectedAccount } from "@/models/SocialPublisher";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

/**
 * DELETE /api/social-publisher/accounts/[id]
 * Disconnects (deactivates) a linked social media account.
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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid account ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    let targetAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin || isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const parentId = authContext.user.parentAdminId;
      targetAdminId = new mongoose.Types.ObjectId(
        typeof parentId === "object" && parentId ? (parentId as any)._id : parentId || authContext.user._id
      );
    }

    // Verify ownership and soft-delete/deactivate
    const account = await SocialConnectedAccount.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        adminId: targetAdminId,
      },
      {
        $set: { isActive: false },
      },
      { new: true }
    );

    if (!account) {
      return errorResponse("Account not found or access denied", 404);
    }

    return jsonResponse({
      message: "Social media account disconnected successfully",
      accountId: id,
    });
  } catch (error: any) {
    console.error("DELETE /api/social-publisher/accounts/[id] error:", error);
    return errorResponse(error.message || "Failed to disconnect account", 500);
  }
}
