import { NextRequest, NextResponse } from "next/server";
import { getPublicProjects, resolveAdminByHostOrSlug } from "@/services/publicPortalService";

/**
 * GET /api/public/projects
 * Public-facing project listings for website visitors.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let adminId = searchParams.get("adminId") || undefined;
    const agency = searchParams.get("agency") || undefined;

    if (!adminId && agency) {
      const resolved = await resolveAdminByHostOrSlug(agency);
      if (resolved?.adminId) {
        adminId = resolved.adminId;
      }
    }

    // Require an admin/agency context. Global cross-admin listing is strictly disabled.
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: "Agency or Admin identification is required. Global public marketplace is disabled.",
          data: [],
          pagination: { total: 0, page: 1, limit: 12, pages: 0 },
        },
        { status: 400 }
      );
    }

    const projectType = searchParams.get("projectType") || undefined;
    const city = searchParams.get("city") || undefined;
    const featured = searchParams.get("featured") || undefined;
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 12;

    const result = await getPublicProjects({
      adminId,
      projectType,
      city,
      featured,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.projects,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("GET /api/public/projects Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch public project listings" },
      { status: 500 }
    );
  }
}

