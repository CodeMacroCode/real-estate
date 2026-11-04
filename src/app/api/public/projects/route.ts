import { NextRequest, NextResponse } from "next/server";
import { getPublicProjects } from "@/services/publicPortalService";

/**
 * GET /api/public/projects
 * Public-facing project listings for website visitors.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const adminId = searchParams.get("adminId") || undefined;
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

