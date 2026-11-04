import { NextRequest, NextResponse } from "next/server";
import { getPublicProperties } from "@/services/publicPortalService";

/**
 * GET /api/public/properties
 * Public-facing listing endpoint for website visitors.
 * Filter query parameters:
 *  - adminId: (optional) Filter properties by specific real estate agency
 *  - category: Residential | Commercial | Land | Special Investment
 *  - propertyType: Apartment, Villa, Office, etc.
 *  - transactionType: Sale | Rent | Lease
 *  - city: e.g. Bengaluru, Mumbai
 *  - bedrooms: number (1, 2, 3, etc.)
 *  - minPrice, maxPrice: numeric budget range
 *  - featured: true | false
 *  - search: keyword search in title, address, landmark
 *  - page, limit, sort
 *
 * GOVERNANCE:
 *  - Strictly excludes owner confidential details (name, phone, PAN, KYC docs).
 *  - Only returns records where publishing.publishOnWebsite === true AND status === "Available".
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const adminId = searchParams.get("adminId") || undefined;
    const category = searchParams.get("category") || undefined;
    const propertyType = searchParams.get("propertyType") || undefined;
    const transactionType = searchParams.get("transactionType") || undefined;
    const city = searchParams.get("city") || undefined;
    const bedrooms = searchParams.get("bedrooms") || undefined;
    const minPrice = searchParams.get("minPrice") || undefined;
    const maxPrice = searchParams.get("maxPrice") || undefined;
    const featured = searchParams.get("featured") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 12;
    const sort = searchParams.get("sort") || undefined;

    const result = await getPublicProperties({
      adminId,
      category,
      propertyType,
      transactionType,
      city,
      bedrooms,
      minPrice,
      maxPrice,
      featured,
      search,
      page,
      limit,
      sort,
    });

    return NextResponse.json({
      success: true,
      data: result.properties,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("GET /api/public/properties Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch public property listings" },
      { status: 500 }
    );
  }
}

