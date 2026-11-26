import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getAdminSocialSettingsData } from "@/services/socialSettingsService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const roleSlug = authContext.role?.slug || "";
    let targetAdminId: mongoose.Types.ObjectId;

    if (roleSlug === "admin") {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (roleSlug === "super_admin") {
      const { searchParams } = new URL(req.url);
      const queryAdminId = searchParams.get("adminId")?.trim();
      if (!queryAdminId || !mongoose.Types.ObjectId.isValid(queryAdminId)) {
        return errorResponse(
          "Forbidden: Lead social settings are managed per Admin account.",
          403,
        );
      }
      targetAdminId = new mongoose.Types.ObjectId(queryAdminId);
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

    const payload = await getAdminSocialSettingsData(targetAdminId);
    return jsonResponse(payload);
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
    if (roleSlug !== "admin") {
      return errorResponse(
        "Forbidden: Only an Admin user can configure social and calendar integrations for their organization.",
        403,
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { platform, config } = body;

    // Strictly scope updates to the authenticated Admin's own ID
    const targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);

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
      const existingGcal = settings.googleCalendar || {};
      const nextIsConnected =
        config.isConnected !== undefined
          ? Boolean(config.isConnected)
          : config.isActive !== undefined
            ? Boolean(config.isActive)
            : Boolean(existingGcal.isConnected);

      settings.googleCalendar = {
        ...existingGcal,
        ...config,
        isConnected: nextIsConnected,
        ...(nextIsConnected === false
          ? { connectedEmail: "", calendarEmail: "", accessToken: "", refreshToken: "" }
          : {}),
      };

      // Also sync GoogleCalendarConfig collection strictly for this Admin
      const GoogleCalendarConfig = (
        await import("@/models/GoogleCalendarConfig.model")
      ).default;
      const gcalUpdate: Record<string, any> = {
        adminId: targetAdminId,
        isConnected: nextIsConnected,
      };
      if (config.clientId) gcalUpdate.clientId = config.clientId;
      if (config.clientSecret) gcalUpdate.clientSecret = config.clientSecret;
      if (nextIsConnected === false) {
        gcalUpdate.accountEmail = "";
        gcalUpdate.accessToken = "";
        gcalUpdate.refreshToken = "";
      }

      const hasCredentials = Boolean(config.clientId && config.clientSecret);
      await GoogleCalendarConfig.findOneAndUpdate(
        { adminId: targetAdminId },
        { $set: gcalUpdate },
        { upsert: hasCredentials },
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
