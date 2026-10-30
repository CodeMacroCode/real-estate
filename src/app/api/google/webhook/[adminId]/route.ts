import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb/db";
import GoogleAdsConfig from "@/models/GoogleAdsConfig.model";
import { Lead } from "@/models/Lead";

// GET /api/google/webhook/[adminId] -> Get or generate config
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ adminId: string }> | { adminId: string } }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await Promise.resolve(context.params);
    const adminId = resolvedParams.adminId;

    let config = await GoogleAdsConfig.findOne({ adminId });
    if (!config) {
      const webhookKey = crypto.randomBytes(16).toString("hex");
      config = await GoogleAdsConfig.create({ adminId, webhookKey, isConnected: false });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: `${baseUrl}/api/google/webhook/${adminId}`,
        webhookKey: config.webhookKey,
        leadsIngestedCount: config.leadsIngestedCount,
        isConnected: config.isConnected,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST /api/google/webhook/[adminId] -> Listener for Google Ads Lead Form extension
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ adminId: string }> | { adminId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { adminId } = resolvedParams;
    const body = await req.json();
    const { google_key, lead_id, user_column_data } = body;

    await connectToDatabase();
    const config = await GoogleAdsConfig.findOne({ adminId });
    if (!config || config.webhookKey !== google_key) {
      return NextResponse.json(
        { success: false, message: "Invalid secret google_key" },
        { status: 401 }
      );
    }

    // Process ingestion
    const fieldsMap: Record<string, string> = {};
    if (Array.isArray(user_column_data)) {
      user_column_data.forEach((col: any) => {
        if (col.column_id) {
          fieldsMap[col.column_id.toUpperCase()] = col.string_value || "";
        }
      });
    }

    const clientName =
      fieldsMap["FULL_NAME"] ||
      `${fieldsMap["FIRST_NAME"] || ""} ${fieldsMap["LAST_NAME"] || ""}`.trim() ||
      "Google Ads Lead";
    const clientPhone =
      fieldsMap["PHONE_NUMBER"] || fieldsMap["WORK_PHONE"] || "";
    const clientEmail = fieldsMap["EMAIL"] || fieldsMap["WORK_EMAIL"] || "";
    const clientAddress = [fieldsMap["CITY"], fieldsMap["POSTAL_CODE"]]
      .filter(Boolean)
      .join(", ");

    const existingLead = await Lead.findOne({
      adminId,
      clientPhone: clientPhone
        ? { $regex: `${clientPhone.slice(-10)}$` }
        : "NONE",
    });

    if (existingLead) {
      await Lead.findByIdAndUpdate(existingLead._id, {
        status: "In-Progress",
        $push: {
          notesHistory: `Google Ads inquiry re-submitted on ${new Date().toISOString()}`,
        },
      });
    } else {
      await Lead.create({
        leadTitle: `Google Ads: ${clientName}`,
        clientName,
        clientPhone,
        clientEmail,
        clientAddress,
        source: "GoogleAds",
        adId: lead_id,
        rawSubmissionData: fieldsMap,
        status: "Pending",
        adminId,
        createdById: adminId,
      });

      await GoogleAdsConfig.findByIdAndUpdate(config._id, {
        $inc: { leadsIngestedCount: 1 },
        lastLeadReceivedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, message: "Google Lead Ingested" });
  } catch (error: any) {
    console.error("[handleGoogleAdsWebhook Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
