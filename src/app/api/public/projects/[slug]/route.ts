import { NextRequest, NextResponse } from "next/server";
import { getPublicProjectBySlug } from "@/services/publicPortalService";

/**
 * GET /api/public/projects/[slug]
 * Public-facing project detail endpoint.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId") || undefined;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Project slug or ID is required" },
        { status: 400 }
      );
    }

    const project = await getPublicProjectBySlug(slug, adminId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found or is no longer published" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error("GET /api/public/projects/[slug] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project details" },
      { status: 500 }
    );
  }
}

