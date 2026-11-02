import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getGoogleCalendarAuthUrl } from "@/services/googleCalendar.service";
import GoogleCalendarConfig from "@/models/GoogleCalendarConfig.model";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("clientId")?.trim();
    const clientSecretParam = searchParams.get("clientSecret")?.trim();
    const queryAdminId = searchParams.get("adminId")?.trim();

    const roleSlug = authContext.role?.slug || "";
    let effectiveAdminId: string;

    if (roleSlug === "admin") {
      effectiveAdminId = authContext.user._id.toString();
    } else if (roleSlug === "super_admin" && queryAdminId) {
      effectiveAdminId = queryAdminId;
    } else if (authContext.user.parentAdminId) {
      effectiveAdminId = authContext.user.parentAdminId.toString();
    } else {
      effectiveAdminId = authContext.user._id.toString();
    }

    // Check existing config if custom credentials aren't passed
    const existingConfig: any = await GoogleCalendarConfig.findOne({
      adminId: new mongoose.Types.ObjectId(effectiveAdminId),
    }).lean();

    const effectiveClientId =
      clientIdParam ||
      existingConfig?.clientId ||
      process.env.GOOGLE_CALENDAR_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID;

    const effectiveClientSecret =
      clientSecretParam ||
      existingConfig?.clientSecret ||
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET;

    if (!effectiveClientId || !effectiveClientSecret) {
      return errorResponse(
        "Google OAuth Client ID and Secret are required to initiate Google Calendar connection.",
        400,
      );
    }

    // If custom credentials were provided in the request, save/persist them so tokens match
    if (clientIdParam && clientSecretParam) {
      await GoogleCalendarConfig.findOneAndUpdate(
        { adminId: new mongoose.Types.ObjectId(effectiveAdminId) },
        {
          adminId: new mongoose.Types.ObjectId(effectiveAdminId),
          clientId: clientIdParam,
          clientSecret: clientSecretParam,
        },
        { upsert: true, new: true },
      );
    }

    const authUrl = getGoogleCalendarAuthUrl({
      adminId: effectiveAdminId,
      userId: authContext.user._id.toString(),
      clientId: effectiveClientId,
      clientSecret: effectiveClientSecret,
    });

    return jsonResponse({
      url: authUrl,
      clientId: effectiveClientId,
    });
  } catch (error: any) {
    console.error("[GoogleCalendarAuthError]:", error);
    return errorResponse(error.message || "Failed to generate Google Calendar auth URL", 500);
  }
}

