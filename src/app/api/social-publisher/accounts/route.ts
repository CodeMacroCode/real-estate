import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { SocialConnectedAccount, SocialPlatform } from "@/models/SocialPublisher";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

/**
 * GET /api/social-publisher/accounts
 * Fetches all linked social media accounts for the current user's organization.
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

    // Determine target admin organization
    let targetAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin || isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const parentId = authContext.user.parentAdminId;
      targetAdminId = new mongoose.Types.ObjectId(
        typeof parentId === "object" && parentId ? (parentId as any)._id : parentId || authContext.user._id
      );
    }

    const accounts = await SocialConnectedAccount.find({
      adminId: targetAdminId,
      isActive: true,
    })
      .select("-accessToken -refreshToken") // Never expose raw tokens in list
      .sort({ createdAt: -1 })
      .lean();

    return jsonResponse(accounts);
  } catch (error: any) {
    console.error("GET /api/social-publisher/accounts error:", error);
    return errorResponse(error.message || "Failed to fetch connected accounts", 500);
  }
}

/**
 * POST /api/social-publisher/accounts
 * Link or register a new social media account/channel.
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
      platform,
      accountType = "page",
      accountId,
      accountName,
      accountAvatar,
      accountHandle,
      accessToken,
      refreshToken,
      metadata = {},
    } = body;

    const validPlatforms: SocialPlatform[] = [
      "facebook",
      "instagram",
      "twitter",
      "threads",
      "linkedin",
      "youtube",
      "googleBusiness",
      "telegram",
    ];

    if (!platform || !validPlatforms.includes(platform)) {
      return errorResponse("Invalid or unsupported social platform", 400);
    }

    if (!accountId || !accountName) {
      return errorResponse("Account ID and Account Name are required", 400);
    }

    if (!accessToken && platform !== "telegram") {
      return errorResponse("Access token or credentials are required", 400);
    }

    // Special validation for Telegram
    let finalAccessToken = accessToken || "";
    if (platform === "telegram") {
      const botToken = body.botToken || accessToken;
      const chatId = body.chatId || accountId;
      if (!botToken || !chatId) {
        return errorResponse("Telegram Bot Token and Channel Username / Chat ID are required", 400);
      }
      finalAccessToken = botToken;
      metadata.chatId = chatId;
    }

    await connectToDatabase();

    // Upsert linked account (reactivate if previously disconnected)
    const account = await SocialConnectedAccount.findOneAndUpdate(
      {
        adminId: targetAdminId,
        platform,
        accountId: String(accountId).trim(),
      },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(authContext.user._id),
          accountType,
          accountName: accountName.trim(),
          accountAvatar: accountAvatar || "",
          accountHandle: accountHandle ? accountHandle.trim() : "",
          accessToken: finalAccessToken,
          refreshToken: refreshToken || "",
          metadata,
          isActive: true,
        },
      },
      { new: true, upsert: true }
    );

    return jsonResponse(account, 201);
  } catch (error: any) {
    console.error("POST /api/social-publisher/accounts error:", error);
    return errorResponse(error.message || "Failed to link social media account", 500);
  }
}
