import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import {
  buildGoogleCalendarRedirectUri,
  getGoogleCalendarAuthUrl,
  resolveRequestOrigin,
} from "@/services/googleCalendar.service";
import GoogleCalendarConfig from "@/models/GoogleCalendarConfig.model";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

async function initiateGoogleCalendarOAuth(
  req: NextRequest,
  clientIdInput?: string,
  clientSecretInput?: string,
) {
  const authContext = await getAuthenticatedContext(req);
  if (!authContext) {
    return errorResponse("Unauthorized", 401);
  }

  const roleSlug = authContext.role?.slug || "";
  if (roleSlug !== "admin") {
    return errorResponse(
      "Forbidden: Only Admin users can configure Google Calendar for their organization.",
      403,
    );
  }

  await connectToDatabase();

  const effectiveAdminId = authContext.user._id.toString();
  const adminObjectId = new mongoose.Types.ObjectId(effectiveAdminId);

  const existingConfig: any = await GoogleCalendarConfig.findOne({
    adminId: adminObjectId,
  }).lean();

  const effectiveClientId =
    clientIdInput?.trim() || existingConfig?.clientId || "";
  const effectiveClientSecret =
    clientSecretInput?.trim() || existingConfig?.clientSecret || "";

  if (!effectiveClientId || !effectiveClientSecret) {
    return errorResponse(
      "Google OAuth Client ID and Secret are required for your Admin account.",
      400,
    );
  }

  // Persist this Admin's own credentials separately without marking connected until OAuth succeeds
  if (clientIdInput?.trim() && clientSecretInput?.trim()) {
    await Promise.all([
      GoogleCalendarConfig.findOneAndUpdate(
        { adminId: adminObjectId },
        {
          $set: {
            adminId: adminObjectId,
            clientId: effectiveClientId,
            clientSecret: effectiveClientSecret,
          },
        },
        { upsert: true, new: true },
      ),
      AdminSocialSettings.findOneAndUpdate(
        { adminId: adminObjectId },
        {
          $set: {
            "googleCalendar.clientId": effectiveClientId,
            "googleCalendar.clientSecret": effectiveClientSecret,
          },
        },
        { upsert: true },
      ),
    ]);
  }

  const origin = resolveRequestOrigin(req);
  const redirectUri = buildGoogleCalendarRedirectUri(origin);

  const authUrl = getGoogleCalendarAuthUrl({
    adminId: effectiveAdminId,
    userId: effectiveAdminId,
    clientId: effectiveClientId,
    clientSecret: effectiveClientSecret,
    origin,
    redirectUri,
  });

  return jsonResponse({
    url: authUrl,
    clientId: effectiveClientId,
    redirectUri,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return await initiateGoogleCalendarOAuth(
      req,
      typeof body?.clientId === "string" ? body.clientId : undefined,
      typeof body?.clientSecret === "string" ? body.clientSecret : undefined,
    );
  } catch (error: any) {
    console.error("[GoogleCalendarAuthError POST]:", error);
    return errorResponse(
      error.message || "Failed to generate Google Calendar auth URL",
      500,
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    return await initiateGoogleCalendarOAuth(
      req,
      searchParams.get("clientId") || undefined,
      searchParams.get("clientSecret") || undefined,
    );
  } catch (error: any) {
    console.error("[GoogleCalendarAuthError GET]:", error);
    return errorResponse(
      error.message || "Failed to generate Google Calendar auth URL",
      500,
    );
  }
}

