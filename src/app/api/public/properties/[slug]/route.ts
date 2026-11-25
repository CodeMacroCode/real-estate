import { NextRequest, NextResponse } from "next/server";
import { getPublicPropertyBySlug } from "@/services/publicPortalService";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import { resolveTenantByHostname } from "@/services/domainService";

/**
 * GET /api/public/properties/[slug]
 * Public-facing property detail endpoint for website visitors.
 * [slug] can be the URL-friendly SEO slug, propertyId, or Mongo _id.
 *
 * GOVERNANCE:
 *  - Strips all confidential owner and broker fields.
 *  - Requires status === "Available" AND publishing.publishOnWebsite === true.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);

    const rawHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const requestHost = normalizeHostname(rawHost.split(",")[0]?.trim() || "");

    let adminId: string | undefined;

    if (requestHost && !isPlatformHost(requestHost)) {
      const tenant = await resolveTenantByHostname(requestHost);
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: "Unknown or inactive custom domain" },
          { status: 404 }
        );
      }
      // Lock tenant strictly to the resolved custom domain; ignore visitor-supplied ?adminId=
      adminId = tenant.adminId;
    } else {
      adminId = searchParams.get("adminId") || undefined;
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Property slug or ID is required" },
        { status: 400 }
      );
    }

    const property = await getPublicPropertyBySlug(slug, adminId);

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Property not found or is no longer published" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error: any) {
    console.error("GET /api/public/properties/[slug] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch property details" },
      { status: 500 }
    );
  }
}

