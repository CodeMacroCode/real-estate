import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import { Lead } from "@/models/Lead";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const roleSlug = authContext.role?.slug || "";
    let targetAdminId: mongoose.Types.ObjectId;

    if (roleSlug === "admin") {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (roleSlug === "super_admin") {
      const { searchParams } = new URL(req.url);
      const queryAdminId = searchParams.get("adminId");
      targetAdminId = queryAdminId
        ? new mongoose.Types.ObjectId(queryAdminId)
        : new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role
      if (!authContext.user.parentAdminId) {
        return errorResponse(
          "Sub-role has no associated Admin organization",
          403,
        );
      }
      targetAdminId = new mongoose.Types.ObjectId(
        authContext.user.parentAdminId.toString(),
      );
    }

    let settings: any = await AdminSocialSettings.findOne({
      adminId: targetAdminId,
    }).lean();

    if (!settings) {
      // Create initial settings document with a default secret key for Google Ads
      const initialKey = `gads_${crypto.randomBytes(16).toString("hex")}`;
      const created = await AdminSocialSettings.create({
        adminId: targetAdminId,
        meta: { isActive: false, leadGenFormIds: [] },
        linkedIn: { isActive: false },
        googleAds: { isActive: false, webhookSecretKey: initialKey },
        googleCalendar: { isConnected: false },
      });
      settings = created.toObject();
    }

    // Count leads by channel for this admin
    const [metaLeads, googleLeads, linkedInLeads] = await Promise.all([
      Lead.countDocuments({ adminId: targetAdminId, source: "Meta" }),
      Lead.countDocuments({ adminId: targetAdminId, source: "GoogleAds" }),
      Lead.countDocuments({ adminId: targetAdminId, source: "LinkedIn" }),
    ]);

    return jsonResponse({
      settings,
      leadCounts: {
        meta: metaLeads,
        googleAds: googleLeads,
        linkedIn: linkedInLeads,
        calendar: 0,
      },
      adminId: targetAdminId.toString(),
    });
  } catch (error: any) {
    return errorResponse(
      error.message || "Failed to fetch social settings",
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const roleSlug = authContext.role?.slug || "";
    if (roleSlug !== "admin" && roleSlug !== "super_admin") {
      return errorResponse(
        "Only an Admin or Super Admin can update social credentials",
        403,
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { platform, config, adminId } = body;

    const targetAdminId =
      roleSlug === "super_admin" && adminId
        ? new mongoose.Types.ObjectId(adminId)
        : new mongoose.Types.ObjectId(authContext.user._id);

    let settings = await AdminSocialSettings.findOne({
      adminId: targetAdminId,
    });
    if (!settings) {
      settings = new AdminSocialSettings({ adminId: targetAdminId });
    }

    if (platform === "meta") {
      settings.meta = {
        ...settings.meta,
        ...config,
      };
      // Also update MetaConnection collection
      const MetaConnection = (await import("@/models/MetaConnection.model")).default;
      await MetaConnection.findOneAndUpdate(
        { adminId: targetAdminId },
        { isConnected: Boolean(config.isActive ?? config.isConnected ?? false) },
        { upsert: false }
      );
    } else if (platform === "googleAds") {
      settings.googleAds = {
        ...settings.googleAds,
        ...config,
      };
      // Also update GoogleAdsConfig collection
      const GoogleAdsConfig = (await import("@/models/GoogleAdsConfig.model")).default;
      await GoogleAdsConfig.findOneAndUpdate(
        { adminId: targetAdminId },
        { isConnected: Boolean(config.isActive ?? config.isConnected ?? false) },
        { upsert: false }
      );
    } else if (platform === "linkedIn") {
      settings.linkedIn = {
        ...settings.linkedIn,
        ...config,
      };
    } else if (platform === "googleCalendar") {
      settings.googleCalendar = {
        ...settings.googleCalendar,
        ...config,
      };
      // Also update GoogleCalendarConfig collection
      const GoogleCalendarConfig = (await import("@/models/GoogleCalendarConfig.model")).default;
      await GoogleCalendarConfig.findOneAndUpdate(
        { adminId: targetAdminId },
        { isConnected: Boolean(config.isActive ?? config.isConnected ?? false) },
        { upsert: false }
      );
    }

    await settings.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "update",
      entity: "admin_social_settings",
      entityId: settings._id.toString(),
      newValues: { platform, targetAdminId: targetAdminId.toString() },
    });

    return jsonResponse({
      message: `${platform} configuration updated successfully`,
      settings,
    });
  } catch (error: any) {
    return errorResponse(
      error.message || "Failed to update social settings",
      500,
    );
  }
}
