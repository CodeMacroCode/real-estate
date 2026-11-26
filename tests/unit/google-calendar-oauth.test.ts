import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

const {
  mockGetAuthenticatedContext,
  mockConnectToDatabase,
  mockGcalFindOne,
  mockGcalFindOneAndUpdate,
  mockSocialFindOne,
  mockSocialCreate,
  mockSocialFindOneAndUpdate,
  mockLeadCountDocuments,
  mockMetaConnFindOne,
  mockGadsConfigFindOne,
  mockRecordAuditEvent,
  mockGenerateAuthUrl,
  mockGetToken,
  mockUserinfoGet,
} = vi.hoisted(() => ({
  mockGetAuthenticatedContext: vi.fn(),
  mockConnectToDatabase: vi.fn().mockResolvedValue(undefined),
  mockGcalFindOne: vi.fn(),
  mockGcalFindOneAndUpdate: vi.fn(),
  mockSocialFindOne: vi.fn(),
  mockSocialCreate: vi.fn(),
  mockSocialFindOneAndUpdate: vi.fn(),
  mockLeadCountDocuments: vi.fn().mockResolvedValue(0),
  mockMetaConnFindOne: vi.fn(),
  mockGadsConfigFindOne: vi.fn(),
  mockRecordAuditEvent: vi.fn().mockResolvedValue(undefined),
  mockGenerateAuthUrl: vi.fn(),
  mockGetToken: vi.fn(),
  mockUserinfoGet: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedContext: mockGetAuthenticatedContext,
}));

vi.mock("@/lib/mongodb/db", () => ({
  connectToDatabase: mockConnectToDatabase,
}));

vi.mock("@/models/GoogleCalendarConfig.model", () => ({
  default: {
    findOne: mockGcalFindOne,
    findOneAndUpdate: mockGcalFindOneAndUpdate,
  },
}));

vi.mock("@/models/AdminSocialSettings", () => ({
  AdminSocialSettings: {
    findOne: mockSocialFindOne,
    create: mockSocialCreate,
    findOneAndUpdate: mockSocialFindOneAndUpdate,
  },
}));

vi.mock("@/models/MetaConnection.model", () => ({
  default: {
    findOne: mockMetaConnFindOne,
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/models/GoogleAdsConfig.model", () => ({
  default: {
    findOne: mockGadsConfigFindOne,
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/models/Lead", () => ({
  Lead: {
    countDocuments: mockLeadCountDocuments,
  },
}));

vi.mock("@/services/auditService", () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

vi.mock("googleapis", () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(function (
          this: any,
          clientId: string,
          clientSecret: string,
          redirectUri?: string,
        ) {
          this.clientId = clientId;
          this.clientSecret = clientSecret;
          this.redirectUri = redirectUri;
          this.generateAuthUrl = (opts: any) => {
            mockGenerateAuthUrl({
              clientId,
              clientSecret,
              redirectUri,
              ...opts,
            });
            const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            u.searchParams.set("client_id", clientId);
            u.searchParams.set("redirect_uri", redirectUri || "");
            u.searchParams.set("state", opts.state);
            return u.toString();
          };
          this.getToken = mockGetToken;
          this.setCredentials = vi.fn();
        }),
      },
      oauth2: vi.fn(() => ({
        userinfo: {
          get: mockUserinfoGet,
        },
      })),
    },
  };
});

import {
  buildGoogleCalendarRedirectUri,
  getGoogleCalendarAuthUrl,
  resolveRequestOrigin,
  verifyGoogleOAuthState,
} from "@/services/googleCalendar.service";
import { POST as authPost } from "@/app/api/google-calendar/auth/route";
import { GET as callbackGet } from "@/app/api/google-calendar/oauth2callback/route";
import {
  GET as socialSettingsGet,
  POST as socialSettingsPost,
} from "@/app/api/social-settings/route";

describe("Google Calendar OAuth Admin Isolation & Redirect Fix", () => {
  const adminAId = new mongoose.Types.ObjectId().toString();
  const adminBId = new mongoose.Types.ObjectId().toString();
  const superAdminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGcalFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    mockMetaConnFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    mockGadsConfigFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
  });

  it("resolves origin from request headers and signs state without leaking clientSecret", () => {
    const req = new NextRequest("http://internal:3000/api/google-calendar/auth", {
      headers: {
        "x-forwarded-host": "agency-one.example.com",
        "x-forwarded-proto": "https",
      },
    });

    const origin = resolveRequestOrigin(req);
    expect(origin).toBe("https://agency-one.example.com");

    const redirectUri = buildGoogleCalendarRedirectUri(origin);
    expect(redirectUri).toBe(
      "https://agency-one.example.com/api/google-calendar/oauth2callback",
    );

    const authUrl = getGoogleCalendarAuthUrl({
      adminId: adminAId,
      userId: adminAId,
      clientId: "adminA-client-id",
      clientSecret: "super-secret-value",
      origin,
      redirectUri,
    });

    const parsed = new URL(authUrl);
    const state = parsed.searchParams.get("state")!;
    expect(state).not.toContain("super-secret-value");

    const verified = verifyGoogleOAuthState(state);
    expect(verified.adminId).toBe(adminAId);
    expect(verified.origin).toBe("https://agency-one.example.com");
    expect(verified.redirectUri).toBe(redirectUri);

    // Tampered state must fail verification
    expect(() => verifyGoogleOAuthState(`${state}tampered`)).toThrow();
  });

  it("blocks Super Admin from initiating Admin-only Google Calendar OAuth", async () => {
    mockGetAuthenticatedContext.mockResolvedValue({
      user: { _id: superAdminId, email: "super@crm.com", name: "Super Admin" },
      role: { slug: "super_admin" },
    });

    const req = new NextRequest("https://crm.example.com/api/google-calendar/auth", {
      method: "POST",
      body: JSON.stringify({
        clientId: "cid",
        clientSecret: "csec",
      }),
    });

    const res = await authPost(req);
    expect(res.status).toBe(403);
  });

  it("scopes OAuth initiation strictly to the logged-in Admin and ignores env global fallback", async () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "global-env-client-id";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "global-env-secret";

    mockGetAuthenticatedContext.mockResolvedValue({
      user: { _id: adminAId, email: "admina@crm.com", name: "Admin A" },
      role: { slug: "admin" },
    });
    mockGcalFindOneAndUpdate.mockResolvedValue({});
    mockSocialFindOneAndUpdate.mockResolvedValue({});

    // Without admin's own credentials, must return 400 (never fall back to global env)
    const missingCredsReq = new NextRequest(
      "https://admin-a.crm.com/api/google-calendar/auth",
      {
        method: "POST",
        headers: { host: "admin-a.crm.com", "x-forwarded-proto": "https" },
        body: JSON.stringify({}),
      },
    );
    const missingRes = await authPost(missingCredsReq);
    expect(missingRes.status).toBe(400);

    // With Admin A credentials (even if a foreign adminId is passed in body), uses Admin A's own ID and request origin
    const req = new NextRequest(
      "https://admin-a.crm.com/api/google-calendar/auth",
      {
        method: "POST",
        headers: { host: "admin-a.crm.com", "x-forwarded-proto": "https" },
        body: JSON.stringify({
          adminId: adminBId,
          clientId: "adminA-client",
          clientSecret: "adminA-secret",
        }),
      },
    );

    const res = await authPost(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.redirectUri).toBe(
      "https://admin-a.crm.com/api/google-calendar/oauth2callback",
    );

    const authUrl = new URL(body.data.url);
    const state = verifyGoogleOAuthState(authUrl.searchParams.get("state"));
    expect(state.adminId).toBe(adminAId);
    expect(state.origin).toBe("https://admin-a.crm.com");
  });

  it("redirects callback back to the initiating Admin origin and blocks Super Admin / mismatched Admin sessions", async () => {
    process.env.APP_URL = "http://localhost:3000";

    const origin = "https://admin-a.crm.com";
    const redirectUri = buildGoogleCalendarRedirectUri(origin);
    const authUrl = getGoogleCalendarAuthUrl({
      adminId: adminAId,
      userId: adminAId,
      clientId: "adminA-client",
      clientSecret: "adminA-secret",
      origin,
      redirectUri,
    });
    const state = new URL(authUrl).searchParams.get("state")!;

    // 1. If Super Admin is active in the browser, reject and redirect to /dashboard (never Super Admin /lead-social-media)
    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: superAdminId, email: "super@crm.com", name: "Super" },
      role: { slug: "super_admin" },
    });
    const superReq = new NextRequest(
      `https://admin-a.crm.com/api/google-calendar/oauth2callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    const superRes = await callbackGet(superReq);
    expect(superRes.status).toBe(307);
    const superLocation = superRes.headers.get("location")!;
    expect(superLocation).toContain("https://admin-a.crm.com/dashboard");
    expect(mockGetToken).not.toHaveBeenCalled();

    // 2. If Admin B is active in the browser, reject and do not save Admin A's tokens
    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: adminBId, email: "adminb@crm.com", name: "Admin B" },
      role: { slug: "admin" },
    });
    const adminBReq = new NextRequest(
      `https://admin-a.crm.com/api/google-calendar/oauth2callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    const adminBRes = await callbackGet(adminBReq);
    expect(adminBRes.status).toBe(307);
    expect(adminBRes.headers.get("location")).toContain(
      "https://admin-a.crm.com/lead-social-media?gcal_error=",
    );
    expect(mockGetToken).not.toHaveBeenCalled();

    // 3. When Admin A is active, exchange tokens and redirect back to Admin A's exact origin (ignoring APP_URL=localhost)
    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: adminAId, email: "admina@crm.com", name: "Admin A" },
      role: { slug: "admin" },
    });
    mockGcalFindOne.mockResolvedValueOnce({
      adminId: adminAId,
      clientId: "adminA-client",
      clientSecret: "adminA-secret",
    });
    mockGetToken.mockResolvedValueOnce({
      tokens: {
        access_token: "at_a",
        refresh_token: "rt_a",
        expiry_date: Date.now() + 3600000,
      },
    });
    mockUserinfoGet.mockResolvedValueOnce({
      data: { email: "admina.cal@gmail.com" },
    });
    mockGcalFindOneAndUpdate.mockResolvedValueOnce({
      adminId: adminAId,
      clientId: "adminA-client",
      clientSecret: "adminA-secret",
    });
    mockSocialFindOneAndUpdate.mockResolvedValueOnce({});

    const adminAReq = new NextRequest(
      `https://admin-a.crm.com/api/google-calendar/oauth2callback?code=valid_code&state=${encodeURIComponent(state)}`,
    );
    const adminARes = await callbackGet(adminAReq);
    expect(adminARes.status).toBe(307);
    const finalLoc = adminARes.headers.get("location")!;
    expect(finalLoc).toBe(
      "https://admin-a.crm.com/lead-social-media?gcal_success=true&email=admina.cal%2540gmail.com",
    );
    expect(finalLoc).not.toContain("localhost:3000");
  });

  it("prevents Super Admin from owning social settings and keeps Admin POST strictly scoped to self", async () => {
    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: superAdminId, email: "super@crm.com", name: "Super" },
      role: { slug: "super_admin" },
    });
    const getRes = await socialSettingsGet(
      new NextRequest("https://crm.example.com/api/social-settings"),
    );
    expect(getRes.status).toBe(403);

    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: superAdminId, email: "super@crm.com", name: "Super" },
      role: { slug: "super_admin" },
    });
    const postSuperRes = await socialSettingsPost(
      new NextRequest("https://crm.example.com/api/social-settings", {
        method: "POST",
        body: JSON.stringify({
          adminId: adminAId,
          platform: "googleCalendar",
          config: { clientId: "x" },
        }),
      }),
    );
    expect(postSuperRes.status).toBe(403);

    // Admin A posting with a spoofed adminId in body still writes only to Admin A
    mockGetAuthenticatedContext.mockResolvedValueOnce({
      user: { _id: adminAId, email: "admina@crm.com", name: "Admin A" },
      role: { slug: "admin" },
    });
    const mockSave = vi.fn().mockResolvedValue(undefined);
    mockSocialFindOne.mockResolvedValueOnce({
      _id: new mongoose.Types.ObjectId(),
      adminId: new mongoose.Types.ObjectId(adminAId),
      googleCalendar: {},
      save: mockSave,
    });
    mockGcalFindOneAndUpdate.mockResolvedValueOnce({});

    const postAdminRes = await socialSettingsPost(
      new NextRequest("https://crm.example.com/api/social-settings", {
        method: "POST",
        body: JSON.stringify({
          adminId: adminBId,
          platform: "googleCalendar",
          config: { clientId: "cid-a", clientSecret: "csec-a" },
        }),
      }),
    );
    expect(postAdminRes.status).toBe(200);
    const findQuery = mockSocialFindOne.mock.calls[0][0];
    expect(findQuery.adminId.toString()).toBe(adminAId);
  });
});
