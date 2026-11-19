import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { SocialPlatform } from "@/models/SocialPublisher";

/**
 * GET /api/social-publisher/oauth/[platform]
 * Initiates the real OAuth authorization redirection for each supported social network.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const { platform } = await params;
    const { searchParams } = new URL(req.url);
    const subType = searchParams.get("subType") || "page";

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/api/social-publisher/oauth/${platform}/callback`;

    // Encode state with admin ID and subType for the callback to consume
    const state = Buffer.from(
      JSON.stringify({
        adminId: authContext.user._id,
        userId: authContext.user._id,
        subType,
        timestamp: Date.now(),
      })
    ).toString("base64");

    let authUrl = "";

    switch (platform as SocialPlatform) {
      case "facebook": {
        // Facebook Page / Personal Profile OAuth Login
        const fbClientId =
          process.env.META_APP_ID && process.env.META_APP_ID !== "your_meta_app_id"
            ? process.env.META_APP_ID
            : (process.env.FACEBOOK_APP_ID || "1696688622106701");
        const configId = process.env.META_CONFIG_ID || "1836152334255580";

        const isPersonalProfile = subType === "profile";

        let scopes = "";
        if (isPersonalProfile) {
          // Personal Facebook profile authentication / basic identity scopes
          scopes = ["public_profile", "email"].join(",");
        } else {
          // Official Facebook Page publishing permissions
          scopes = [
            "pages_manage_posts",
            "pages_manage_engagement",
            "pages_read_engagement",
            "read_insights",
            "business_management",
            "pages_show_list",
          ].join(",");
        }

        const configParam = (!isPersonalProfile && configId) ? `&config_id=${configId}` : "";
        authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code${configParam}&auth_type=rerequest`;
        break;
      }

      case "instagram": {
        const isDirectIg = subType === "instagram_direct" || subType === "profile";
        const configId = process.env.META_CONFIG_ID || "1836152334255580";

        if (isDirectIg) {
          // Instagram Login / Direct Instagram Business API without Facebook Page
          const igClientId =
            process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_ID !== "your_instagram_app_id"
              ? process.env.INSTAGRAM_APP_ID
              : (process.env.META_APP_ID && process.env.META_APP_ID !== "your_meta_app_id"
                  ? process.env.META_APP_ID
                  : "1696688622106701");

          const igScopes = [
            "instagram_business_basic",
            "instagram_business_content_publish",
            "instagram_business_manage_comments",
            "instagram_business_manage_insights",
          ].join(",");

          // Direct Instagram OAuth with optional config_id support
          const configParam = configId ? `&config_id=${configId}` : "";
          authUrl = `https://www.instagram.com/oauth/authorize?client_id=${igClientId}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}&response_type=code&scope=${encodeURIComponent(igScopes)}&state=${state}&enable_fb_login=1${configParam}`;
        } else {
          // Professional (via Facebook Page) with Login for Business configuration
          const fbClientId =
            process.env.META_APP_ID && process.env.META_APP_ID !== "your_meta_app_id"
              ? process.env.META_APP_ID
              : (process.env.FACEBOOK_APP_ID || "1696688622106701");

          const scopes = [
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_posts",
            "instagram_basic",
            "instagram_content_publish",
            "instagram_manage_insights",
            "instagram_manage_contents",
            "instagram_manage_comments",
            "business_management",
          ].join(",");

          // Facebook Login for Business supports config_id for exact permission sets
          const configParam = configId ? `&config_id=${configId}` : "";
          authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbClientId}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code${configParam}`;
        }
        break;
      }

      case "linkedin": {
        const liClientId = process.env.LINKEDIN_CLIENT_ID || "DEMO_LINKEDIN_CLIENT_ID";
        const scopes = ["r_liteprofile", "r_emailaddress", "w_member_social"].join("%20");
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${liClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=${scopes}`;
        break;
      }

      case "youtube":
      case "googleBusiness": {
        const gClientId = process.env.GOOGLE_CLIENT_ID || "DEMO_GOOGLE_CLIENT_ID";
        const scopes = encodeURIComponent(
          platform === "youtube"
            ? "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
            : "https://www.googleapis.com/auth/business.manage"
        );
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${gClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=${scopes}&access_type=offline&prompt=consent`;
        break;
      }

      case "twitter": {
        const twitterClientId = process.env.TWITTER_CLIENT_ID || "DEMO_TWITTER_CLIENT_ID";
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${twitterClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=tweet.read%20tweet.write%20users.read%20offline.access&code_challenge=challenge&code_challenge_method=plain`;
        break;
      }

      case "threads": {
        const metaClientId = process.env.THREADS_APP_ID || process.env.META_APP_ID || "DEMO_THREADS_APP_ID";
        authUrl = `https://threads.net/oauth/authorize?client_id=${metaClientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=threads_basic,threads_content_publish&response_type=code`;
        break;
      }

      default:
        return NextResponse.redirect(
          new URL(`/content-social-media?error=unsupported_platform`, req.url)
        );
    }

    // If actual environment client IDs are not configured yet in .env, simulate instant successful connection callback
    const isMock = authUrl.includes("DEMO_");
    if (isMock) {
      const mockCallbackUrl = new URL(
        `/api/social-publisher/oauth/${platform}/callback?code=mock_code_${Date.now()}&state=${state}`,
        req.url
      );
      return NextResponse.redirect(mockCallbackUrl.toString());
    }

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("OAuth init error:", err);
    return NextResponse.redirect(
      new URL(`/content-social-media?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
