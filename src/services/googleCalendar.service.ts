import crypto from "crypto";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import GoogleCalendarConfig, {
  IGoogleCalendarConfig,
} from "../models/GoogleCalendarConfig.model";
import { getAuthSecret } from "../lib/auth/jwt";

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

export interface GoogleOAuthStatePayload {
  adminId: string;
  userId: string;
  origin: string;
  redirectUri: string;
  iat: number;
}

/**
 * Resolves the external browser origin from the incoming request headers so
 * OAuth redirect URIs and post-callback redirects stay on the same origin.
 */
export function resolveRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host) {
    const isLocal =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    const protocol = forwardedProto || (isLocal ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return req.nextUrl.origin || "http://localhost:3000";
}

export function buildGoogleCalendarRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/google-calendar/oauth2callback`;
}

function signStatePayload(payload: GoogleOAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyGoogleOAuthState(stateString?: string | null): GoogleOAuthStatePayload {
  if (!stateString || !stateString.includes(".")) {
    throw new Error("Invalid or missing OAuth state parameter");
  }

  const parts = stateString.split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed OAuth state parameter");
  }

  const [encoded, providedSig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    throw new Error("OAuth state signature verification failed");
  }

  const parsed = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as GoogleOAuthStatePayload;

  if (!parsed?.adminId || !parsed?.origin || !parsed?.redirectUri) {
    throw new Error("Incomplete OAuth state payload");
  }

  if (!parsed.iat || Date.now() - parsed.iat > OAUTH_STATE_TTL_MS) {
    throw new Error("OAuth authorization session expired. Please try again.");
  }

  return parsed;
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const createOAuth2Client = (
  clientId: string,
  clientSecret: string,
  redirectUri?: string,
) => {
  if (!clientId || !clientSecret) {
    throw new Error("Admin Google OAuth Client ID and Secret are required");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getGoogleCalendarAuthUrl = (args: {
  adminId: string;
  userId: string;
  clientId: string;
  clientSecret: string;
  origin: string;
  redirectUri: string;
}) => {
  const oauth2Client = createOAuth2Client(
    args.clientId,
    args.clientSecret,
    args.redirectUri,
  );
  const state = signStatePayload({
    adminId: args.adminId,
    userId: args.userId,
    origin: args.origin,
    redirectUri: args.redirectUri,
    iat: Date.now(),
  });
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
};

export const exchangeCodeForTokens = async (
  code: string,
  statePayload: GoogleOAuthStatePayload,
) => {
  const { adminId, userId, redirectUri } = statePayload;

  const existingConfig = await GoogleCalendarConfig.findOne({ adminId });
  if (!existingConfig?.clientId || !existingConfig?.clientSecret) {
    throw new Error(
      "Google Calendar OAuth credentials not found for this Admin account",
    );
  }

  const oauth2Client = createOAuth2Client(
    existingConfig.clientId,
    existingConfig.clientSecret,
    redirectUri,
  );
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const accountEmail = userInfo.data.email || "";

  const config = await GoogleCalendarConfig.findOneAndUpdate(
    { adminId },
    {
      adminId,
      clientId: existingConfig.clientId,
      clientSecret: existingConfig.clientSecret,
      accountEmail,
      accessToken: tokens.access_token || "",
      refreshToken: tokens.refresh_token || existingConfig.refreshToken || "",
      tokenExpiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      scope: tokens.scope || "",
      isConnected: true,
      connectedBy: userId,
    },
    { upsert: true, new: true },
  );

  return { config, accountEmail };
};

export const getCalendarClientForAdmin = async (adminId: string) => {
  const config = await GoogleCalendarConfig.findOne({
    adminId,
    isConnected: true,
  });
  if (
    !config ||
    !config.clientId ||
    !config.clientSecret ||
    (!config.refreshToken && !config.accessToken)
  ) {
    return null;
  }

  const oauth2Client = createOAuth2Client(config.clientId, config.clientSecret);
  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
    expiry_date: config.tokenExpiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updateData: Partial<IGoogleCalendarConfig> = {
        accessToken: tokens.access_token || config.accessToken,
        tokenExpiryDate: tokens.expiry_date || config.tokenExpiryDate,
      };
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
      await GoogleCalendarConfig.findByIdAndUpdate(config._id, updateData);
    } catch (err) {
      console.error(
        "[GoogleCalendarService] Failed to auto-save refreshed token:",
        err,
      );
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
};

export interface CreateCalendarEventArgs {
  adminId: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string | Date;
  endDateTime?: string | Date;
  attendees?: Array<{ email: string; displayName?: string }>;
  isVirtual?: boolean;
}

export const createGoogleCalendarEvent = async (
  args: CreateCalendarEventArgs,
) => {
  try {
    const calendar = await getCalendarClientForAdmin(args.adminId);
    if (!calendar) return { success: false, message: "Calendar not connected" };

    const startDate = new Date(args.startDateTime);
    const endDate = args.endDateTime
      ? new Date(args.endDateTime)
      : new Date(startDate.getTime() + 45 * 60 * 1000);

    const eventPayload: any = {
      summary: args.summary,
      description: args.description || "",
      location: args.location || "",
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      attendees: args.attendees?.filter((a) => a.email) || [],
    };

    if (args.isVirtual) {
      eventPayload.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventPayload,
      conferenceDataVersion: args.isVirtual ? 1 : 0,
      sendUpdates: "all",
    });

    const googleMeetLink =
      response.data.conferenceData?.entryPoints?.find(
        (e: any) => e.entryPointType === "video",
      )?.uri ||
      response.data.htmlLink ||
      "";

    return {
      success: true,
      eventId: response.data.id,
      hangoutLink: googleMeetLink,
    };
  } catch (error: any) {
    console.error("[createGoogleCalendarEvent Error]:", error);
    return { success: false, message: error.message };
  }
};
