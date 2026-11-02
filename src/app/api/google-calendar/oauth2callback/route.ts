import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { exchangeCodeForTokens } from "@/services/googleCalendar.service";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const appBaseUrl =
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const redirectTarget = new URL("/connect-social-media", appBaseUrl);

    if (error) {
      console.error("[Google Calendar OAuth Error callback]:", error);
      redirectTarget.searchParams.set("gcal_error", encodeURIComponent(error));
      return NextResponse.redirect(redirectTarget.toString());
    }

    if (!code || !state) {
      redirectTarget.searchParams.set(
        "gcal_error",
        encodeURIComponent("Missing authorization code or state from Google"),
      );
      return NextResponse.redirect(redirectTarget.toString());
    }

    await connectToDatabase();

    const { config, accountEmail } = await exchangeCodeForTokens(code, state);

    // Also sync the connection status and email back into AdminSocialSettings
    if (config?.adminId) {
      await AdminSocialSettings.findOneAndUpdate(
        { adminId: new mongoose.Types.ObjectId(config.adminId.toString()) },
        {
          $set: {
            "googleCalendar.isConnected": true,
            "googleCalendar.connectedEmail": accountEmail,
            "googleCalendar.calendarEmail": accountEmail,
            "googleCalendar.clientId": config.clientId,
            "googleCalendar.clientSecret": config.clientSecret,
          },
        },
        { upsert: true },
      );
    }

    redirectTarget.searchParams.set("gcal_success", "true");
    if (accountEmail) {
      redirectTarget.searchParams.set("email", encodeURIComponent(accountEmail));
    }

    return NextResponse.redirect(redirectTarget.toString());
  } catch (err: any) {
    console.error("[Google Calendar OAuth callback exception]:", err);
    const appBaseUrl =
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";
    const redirectTarget = new URL("/connect-social-media", appBaseUrl);
    redirectTarget.searchParams.set(
      "gcal_error",
      encodeURIComponent(err.message || "Failed to exchange Google OAuth tokens"),
    );
    return NextResponse.redirect(redirectTarget.toString());
  }
}

