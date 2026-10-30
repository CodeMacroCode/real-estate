import { google } from "googleapis";
import GoogleCalendarConfig, { IGoogleCalendarConfig } from "../models/GoogleCalendarConfig.model";

const DEFAULT_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || "";
const DEFAULT_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:9090/api/google-calendar/oauth2callback";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const createOAuth2Client = (customClientId?: string, customClientSecret?: string) => {
  return new google.auth.OAuth2(
    customClientId || DEFAULT_CLIENT_ID,
    customClientSecret || DEFAULT_CLIENT_SECRET,
    REDIRECT_URI
  );
};

export const getGoogleCalendarAuthUrl = (statePayload: { adminId: string; userId?: string; clientId?: string; clientSecret?: string }) => {
  const oauth2Client = createOAuth2Client(statePayload.clientId, statePayload.clientSecret);
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
};

export const exchangeCodeForTokens = async (code: string, stateString?: string) => {
  if (!stateString) throw new Error("Missing state in OAuth callback");
  const decodedState = JSON.parse(Buffer.from(stateString, "base64").toString("utf8"));
  const { adminId, userId, clientId, clientSecret } = decodedState;

  const existingConfig = await GoogleCalendarConfig.findOne({ adminId });
  const effectiveClientId = clientId || existingConfig?.clientId || DEFAULT_CLIENT_ID;
  const effectiveClientSecret = clientSecret || existingConfig?.clientSecret || DEFAULT_CLIENT_SECRET;

  const oauth2Client = createOAuth2Client(effectiveClientId, effectiveClientSecret);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const accountEmail = userInfo.data.email || "";

  const config = await GoogleCalendarConfig.findOneAndUpdate(
    { adminId },
    {
      adminId,
      clientId: effectiveClientId,
      clientSecret: effectiveClientSecret,
      accountEmail,
      accessToken: tokens.access_token || "",
      refreshToken: tokens.refresh_token || "",
      tokenExpiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      scope: tokens.scope || "",
      isConnected: true,
      connectedBy: userId,
    },
    { upsert: true, new: true }
  );

  return { config, accountEmail };
};

export const getCalendarClientForAdmin = async (adminId: string) => {
  const config = await GoogleCalendarConfig.findOne({ adminId, isConnected: true });
  if (!config || (!config.refreshToken && !config.accessToken)) return null;

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
      console.error("[GoogleCalendarService] Failed to auto-save refreshed token:", err);
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

export const createGoogleCalendarEvent = async (args: CreateCalendarEventArgs) => {
  try {
    const calendar = await getCalendarClientForAdmin(args.adminId);
    if (!calendar) return { success: false, message: "Calendar not connected" };

    const startDate = new Date(args.startDateTime);
    const endDate = args.endDateTime ? new Date(args.endDateTime) : new Date(startDate.getTime() + 45 * 60 * 1000);

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
    });

    const googleMeetLink = response.data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || response.data.htmlLink || "";

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

