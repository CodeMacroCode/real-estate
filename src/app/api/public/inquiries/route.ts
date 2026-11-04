import { NextRequest, NextResponse } from "next/server";
import { ingestWebsiteInquiry } from "@/services/leadIngestionService";

/**
 * POST /api/public/inquiries
 * Public lead ingestion webhook & form endpoint.
 *
 * Accepts JSON or Form-URLencoded data from website contact forms,
 * visit schedule widgets, and brochure download popups.
 *
 * Automatically deduplicates against existing CRM leads by phone/email.
 */
export async function POST(request: NextRequest) {
  try {
    let payload: any = {};

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      // Fallback try JSON
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }
    }

    if (!payload.name || !payload.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name and phone number are required to submit an inquiry.",
        },
        { status: 400 }
      );
    }

    const result = await ingestWebsiteInquiry({
      adminId: payload.adminId,
      inquiryType: payload.inquiryType,
      propertyId: payload.propertyId,
      projectId: payload.projectId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      whatsApp: payload.whatsApp,
      preferredDateTime: payload.preferredDateTime,
      message: payload.message,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/public/inquiries Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process inquiry submission.",
      },
      { status: 500 }
    );
  }
}

