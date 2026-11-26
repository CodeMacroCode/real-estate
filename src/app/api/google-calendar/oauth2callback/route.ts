import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { getAuthenticatedContext } from "@/lib/auth/session";
import {
  exchangeCodeForTokens,
  resolveRequestOrigin,
  verifyGoogleOAuthState,
} from "@/services/googleCalendar.service";
import { AdminSocialSettings } from "@/models/AdminSocialSettings";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function isSafeHttpOrigin(value?: string): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const requestOrigin = resolveRequestOrigin(req);
  let redirectOrigin = requestOrigin;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const verifiedState = verifyGoogleOAuthState(state);
    if (isSafeHttpOrigin(verifiedState.origin)) {
      redirectOrigin = verifiedState.origin;
    }

    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      const loginUrl = new URL("/login", redirectOrigin);
      loginUrl.searchParams.set("reason", "deactivated");
      return NextResponse.redirect(loginUrl.toString());
    }

    if (authContext.role?.slug !== "admin") {
      const dashboardUrl = new URL("/dashboard", redirectOrigin);
      dashboardUrl.searchParams.set(
        "gcal_error",
        encodeURIComponent(
          "Google Calendar can only be connected by the Admin account that initiated setup.",
        ),
      );
      return NextResponse.redirect(dashboardUrl.toString());
    }

    if (authContext.user._id.toString() !== verifiedState.adminId) {
      const mismatchTarget = new URL("/lead-social-media", redirectOrigin);
      mismatchTarget.searchParams.set(
        "gcal_error",
        encodeURIComponent(
          "Session mismatch: callback does not match the logged-in Admin account.",
        ),
      );
      return NextResponse.redirect(mismatchTarget.toString());
    }

    const redirectTarget = new URL("/lead-social-media", redirectOrigin);

    if (error) {
      console.error("[Google Calendar OAuth Error callback]:", error);
      redirectTarget.searchParams.set("gcal_error", encodeURIComponent(error));
      return NextResponse.redirect(redirectTarget.toString());
    }

    if (!code) {
      redirectTarget.searchParams.set(
        "gcal_error",
        encodeURIComponent("Missing authorization code from Google"),
      );
      return NextResponse.redirect(redirectTarget.toString());
    }

    await connectToDatabase();

    const { config, accountEmail } = await exchangeCodeForTokens(
      code,
      verifiedState,
    );

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
    const authContext = await getAuthenticatedContext(req).catch(() => null);
    if (!authContext) {
      return NextResponse.redirect(new URL("/login", redirectOrigin).toString());
    }
    const targetPath =
      authContext.role?.slug === "admin" ? "/lead-social-media" : "/dashboard";
    const redirectTarget = new URL(targetPath, redirectOrigin);
    redirectTarget.searchParams.set(
      "gcal_error",
      encodeURIComponent(
        err.message || "Failed to exchange Google OAuth tokens",
      ),
    );
    return NextResponse.redirect(redirectTarget.toString());
  }
}

