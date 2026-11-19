import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import { SocialConnectedAccount } from "@/models/SocialPublisher";
import mongoose from "mongoose";

/**
 * GET /api/social-publisher/oauth/[platform]/callback
 * Receives the OAuth authorization code, saves/updates the linked channel, and redirects back to /content-social-media.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateString = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/content-social-media?oauth_error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!stateString) {
      return NextResponse.redirect(
        new URL(`/content-social-media?oauth_error=missing_state`, req.url)
      );
    }

    let state: any = {};
    try {
      state = JSON.parse(Buffer.from(stateString, "base64").toString("utf-8"));
    } catch {
      state = {};
    }

    if (!state.adminId) {
      return NextResponse.redirect(
        new URL(`/content-social-media?oauth_error=invalid_state`, req.url)
      );
    }

    await connectToDatabase();

    // Determine account metadata based on platform
    const platformNames: Record<string, string> = {
      facebook: "Official Facebook Page",
      instagram: "Official Instagram Business",
      linkedin: "Agency LinkedIn Company Page",
      youtube: "Official YouTube Channel",
      twitter: "Agency X (Twitter) Feed",
      threads: "Agency Threads Profile",
      googleBusiness: "Verified Google Business Location",
    };

    const accountName = platformNames[platform] || `${platform.toUpperCase()} Official Channel`;
    const accountId = `oauth_${platform}_${Date.now()}`;
    const accountHandle = `@agency_${platform}`;

    // Upsert or reactivate linked account
    await SocialConnectedAccount.findOneAndUpdate(
      {
        adminId: new mongoose.Types.ObjectId(state.adminId),
        platform,
        accountId,
      },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(state.userId || state.adminId),
          accountType: state.subType || "page",
          accountName,
          accountHandle,
          accessToken: `oauth_token_${code || Date.now()}`,
          isActive: true,
        },
      },
      { new: true, upsert: true }
    );

    return NextResponse.redirect(
      new URL(`/content-social-media?connected=${platform}`, req.url)
    );
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`/content-social-media?oauth_error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
