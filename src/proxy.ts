import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/auth/constants";
import { verifyAuthToken } from "./lib/auth/jwt";
import { isPlatformHost, normalizeHostname } from "./lib/domains/normalize";

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/portal-properties",
  "/portal-projects",
  "/portal-contact",
  "/forms",
  "/api/forms/submit",
  "/api/public",
  "/api/files",
];

// Protected CRM dashboard route prefixes (src/app/(dashboard)/* and /uploads)
const PROTECTED_APP_PREFIXES = [
  "/dashboard",
  "/properties",
  "/projects",
  "/leads",
  "/appointments",
  "/bookings",
  "/client-information",
  "/client-confirmations",
  "/owners",
  "/inquiries",
  "/website-management",
  "/domains",
  "/staff",
  "/roles",
  "/users",
  "/audit-logs",
  "/custom-forms",
  "/master-settings",
  "/lead-social-media",
  "/content-social-media",
  "/settings",
  "/uploads",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static resources and internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    console.log(
      `\x1b[34m[API Request]\x1b[0m ${request.method} ${pathname}${request.nextUrl.search}`,
    );
  }

  const rawHost = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const hostname = normalizeHostname(rawHost);
  const isPlatform = !hostname || isPlatformHost(hostname);

  const isCustomDomainRoot = !isPlatform && pathname === "/";
  const isPublicPath =
    isCustomDomainRoot || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // CSRF protection: evaluate cookie-authenticated state-changing requests
  const method = request.method.toUpperCase();
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isStateChanging && token) {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "cross-site") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Cross-site request rejected by CSRF policy",
        },
        { status: 403 },
      );
    }

    const host = request.headers.get("host");
    const origin = request.headers.get("origin");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            {
              success: false,
              error: "Forbidden: Origin mismatch rejected by CSRF policy",
            },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Forbidden: Invalid Origin header" },
          { status: 403 },
        );
      }
    }
  }

  let isValidSession = false;
  if (token) {
    const payload = await verifyAuthToken(token);
    if (payload && payload.userId) {
      isValidSession = true;
    }
  }

  // Redirect unauthenticated requests to login page
  if (!isValidSession && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const isProtectedAppRoute = PROTECTED_APP_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!isPlatform && !isProtectedAppRoute) {
      const forwardedProto = (request.headers.get("x-forwarded-proto") || "")
        .split(",")[0]
        .trim();
      const isLocalHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".localhost");
      const protocol = forwardedProto || (isLocalHost ? "http" : "https");
      const rootUrl = rawHost
        ? new URL("/", `${protocol}://${rawHost}`)
        : new URL("/", request.url);
      return NextResponse.redirect(rootUrl);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root path to dashboard or login on platform hosts only
  if (pathname === "/" && isPlatform) {
    if (isValidSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
