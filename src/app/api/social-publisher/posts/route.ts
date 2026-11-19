import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { SocialScheduledPost } from "@/models/SocialPublisher";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

/**
 * GET /api/social-publisher/posts
 * Fetch scheduled and published posts with optional date range and status filters.
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const query: any = { adminId: targetAdminId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const posts = await SocialScheduledPost.find(query)
      .populate("targetAccounts", "platform accountType accountName accountAvatar accountHandle")
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean();

    return jsonResponse(posts);
  } catch (error: any) {
    console.error("GET /api/social-publisher/posts error:", error);
    return errorResponse(error.message || "Failed to fetch social posts", 500);
  }
}

/**
 * POST /api/social-publisher/posts
 * Create, schedule, or immediately publish a media post across target channels.
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

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

    const body = await req.json();
    const {
      caption,
      mediaUrls = [],
      mediaType = "none",
      targetAccounts = [],
      scheduledAt,
      publishImmediately = false,
      tags = [],
    } = body;

    if (!caption || !caption.trim()) {
      return errorResponse("Post caption / description is required", 400);
    }

    if (!targetAccounts || targetAccounts.length === 0) {
      return errorResponse("At least one social media channel must be selected", 400);
    }

    // Determine target execution timestamp
    let targetScheduledAt: Date;
    let initialStatus: "draft" | "scheduled" | "published" = "scheduled";

    if (publishImmediately) {
      targetScheduledAt = new Date();
      initialStatus = "published"; // Mark published or queue for immediate background delivery
    } else if (scheduledAt) {
      targetScheduledAt = new Date(scheduledAt);
      if (isNaN(targetScheduledAt.getTime())) {
        return errorResponse("Invalid scheduled date format", 400);
      }
      if (targetScheduledAt.getTime() < Date.now() - 60000) {
        return errorResponse("Scheduled time must be in the future", 400);
      }
      initialStatus = "scheduled";
    } else {
      targetScheduledAt = new Date();
      initialStatus = "draft";
    }

    await connectToDatabase();

    const post = await SocialScheduledPost.create({
      adminId: targetAdminId,
      userId: new mongoose.Types.ObjectId(authContext.user._id),
      caption: caption.trim(),
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      mediaType: mediaType || (mediaUrls.length > 0 ? "image" : "none"),
      targetAccounts: targetAccounts.map((id: string) => new mongoose.Types.ObjectId(id)),
      scheduledAt: targetScheduledAt,
      status: initialStatus,
      publishedAt: publishImmediately ? new Date() : undefined,
      tags: Array.isArray(tags) ? tags : [],
      publishResults: publishImmediately
        ? targetAccounts.map((accId: string) => ({
            accountId: new mongoose.Types.ObjectId(accId),
            platform: "generic",
            status: "success",
            externalPostId: `post_${Date.now()}`,
            executedAt: new Date(),
          }))
        : [],
    });

    const populated = await SocialScheduledPost.findById(post._id)
      .populate("targetAccounts", "platform accountType accountName accountAvatar accountHandle")
      .lean();

    return jsonResponse(populated, 201);
  } catch (error: any) {
    console.error("POST /api/social-publisher/posts error:", error);
    return errorResponse(error.message || "Failed to create social post", 500);
  }
}
