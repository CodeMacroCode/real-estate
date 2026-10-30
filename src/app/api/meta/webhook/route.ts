import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";
import { connectToDatabase } from "@/lib/mongodb/db";
import MetaConnection from "@/models/MetaConnection.model";
import { Lead } from "@/models/Lead";

const META_APP_SECRET = process.env.META_APP_SECRET || "";
const VERIFY_TOKEN =
  process.env.META_VERIFY_TOKEN ||
  process.env.META_WEBHOOK_VERIFY_TOKEN ||
  "realestate_meta_leadgen_2026";

// Verification endpoint for Meta App Setup: GET /api/meta/webhook?adminId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return NextResponse.json(
    { error: "Verification token mismatch" },
    { status: 403 },
  );
}

// Inbound Lead webhook handler: POST /api/meta/webhook?adminId=xxx
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId") || searchParams.get("branchId");

    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // 1. Verify HMAC Signature if META_APP_SECRET is set
    if (signature && META_APP_SECRET) {
      const expectedHash =
        "sha256=" +
        crypto.createHmac("sha256", META_APP_SECRET).update(rawBody).digest("hex");
      if (signature !== expectedHash) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    if (body.object !== "page") {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    await connectToDatabase();
    const connection = await MetaConnection.findOne({
      ...(adminId ? { adminId } : {}),
      isConnected: true,
    });

    if (!connection || !connection.pageToken) {
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const targetAdminId = connection.adminId;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen") {
          const leadgenId = change.value.leadgen_id;
          const formId = change.value.form_id;

          // Fetch full lead details from Facebook Graph API
          const graphRes = await axios.get(
            `https://graph.facebook.com/v19.0/${leadgenId}`,
            {
              params: { access_token: connection.pageToken },
            },
          );

          const fieldData = graphRes.data.field_data || [];
          const fieldsMap: Record<string, string> = {};
          fieldData.forEach((f: any) => {
            fieldsMap[f.name.toLowerCase()] = Array.isArray(f.values)
              ? f.values[0]
              : f.values;
          });

          const clientName =
            fieldsMap["full_name"] ||
            `${fieldsMap["first_name"] || ""} ${fieldsMap["last_name"] || ""}`.trim() ||
            "Meta Lead";
          const clientPhone =
            fieldsMap["phone_number"] || fieldsMap["mobile_number"] || "";
          const clientEmail = fieldsMap["email"] || "";
          const clientAddress =
            fieldsMap["city"] || fieldsMap["street_address"] || "";

          // Deduplication
          const existingLead = await Lead.findOne({
            adminId: targetAdminId,
            clientPhone: clientPhone
              ? { $regex: `${clientPhone.slice(-10)}$` }
              : "NONE",
          });

          if (existingLead) {
            await Lead.findByIdAndUpdate(existingLead._id, {
              status: "In-Progress",
              $push: {
                notesHistory: `New Meta re-inquiry received on ${new Date().toISOString()}`,
              },
            });
          } else {
            await Lead.create({
              leadTitle: `Meta Ads: ${clientName}`,
              clientName,
              clientPhone,
              clientEmail,
              clientAddress,
              source: "Meta",
              adId: formId,
              rawSubmissionData: fieldsMap,
              status: "Pending",
              adminId: targetAdminId,
              createdById: connection.adminId,
            });

            await MetaConnection.findByIdAndUpdate(connection._id, {
              $inc: { leadsIngestedCount: 1 },
            });
          }
        }
      }
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("[handleMetaWebhook Error]:", err);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}

