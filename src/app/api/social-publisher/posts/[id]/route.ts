import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { SocialScheduledPost } from "@/models/SocialPublisher";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

/**
 * PATCH /api/social-publisher/posts/[id]
 * Edit a scheduled post (caption, media, target accounts, or reschedule time).
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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid post ID", 400);
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

    const post = await SocialScheduledPost.findOne({
      _id: new mongoose.Types.ObjectId(id),
      adminId: targetAdminId,
    });

    if (!post) {
      return errorResponse("Post not found or access denied", 404);
    }

    if (post.status === "published") {
      return errorResponse("Cannot edit a post that has already been published", 400);
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.caption !== undefined) updateFields.caption = body.caption.trim();
    if (body.mediaUrls !== undefined) updateFields.mediaUrls = body.mediaUrls;
    if (body.mediaType !== undefined) updateFields.mediaType = body.mediaType;
    if (body.targetAccounts !== undefined) {
      updateFields.targetAccounts = body.targetAccounts.map((accId: string) => new mongoose.Types.ObjectId(accId));
    }
    if (body.scheduledAt !== undefined) {
      const d = new Date(body.scheduledAt);
      if (isNaN(d.getTime())) return errorResponse("Invalid scheduled date format", 400);
      updateFields.scheduledAt = d;
      updateFields.status = "scheduled";
    }
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.tags !== undefined) updateFields.tags = body.tags;

    const updatedPost = await SocialScheduledPost.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate("targetAccounts", "platform accountType accountName accountAvatar accountHandle")
      .lean();

    return jsonResponse(updatedPost);
  } catch (error: any) {
    console.error("PATCH /api/social-publisher/posts/[id] error:", error);
    return errorResponse(error.message || "Failed to update scheduled post", 500);
  }
}

/**
 * DELETE /api/social-publisher/posts/[id]
 * Cancel and delete a scheduled post.
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
      return errorResponse("Invalid post ID", 400);
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

    const deleted = await SocialScheduledPost.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      adminId: targetAdminId,
    });

    if (!deleted) {
      return errorResponse("Post not found or access denied", 404);
    }

    return jsonResponse({
      message: "Scheduled post deleted successfully",
      postId: id,
    });
  } catch (error: any) {
    console.error("DELETE /api/social-publisher/posts/[id] error:", error);
    return errorResponse(error.message || "Failed to delete post", 500);
  }
}
