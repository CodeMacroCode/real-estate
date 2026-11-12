import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import {
  getWebsiteSettingsByAdminId,
  upsertWebsiteSettings,
} from "@/services/websiteSettingService";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedAdminId = searchParams.get("adminId");

    // SuperAdmin can query any admin's settings; Admin queries requested or their own
    let targetAdminId = authContext.user._id.toString();
    if (requestedAdminId && (authContext.role.slug === "super-admin" || authContext.role.slug === "admin")) {
      targetAdminId = requestedAdminId;
    }

    const settings = await getWebsiteSettingsByAdminId(targetAdminId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("GET /api/website-management/settings Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch website settings",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(request);
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const requestedAdminId = searchParams.get("adminId");

    // Resolve target admin ID from session or requested admin query
    let targetAdminId = requestedAdminId || authContext?.user?._id?.toString();

    if (!targetAdminId && !authContext) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing administrative session" },
        { status: 401 },
      );
    }

    if (!targetAdminId) {
      targetAdminId = authContext?.user?._id?.toString();
    }

    const updated = await upsertWebsiteSettings(targetAdminId!, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PUT /api/website-management/settings Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update website settings",
      },
      { status: 500 },
    );
  }
}
