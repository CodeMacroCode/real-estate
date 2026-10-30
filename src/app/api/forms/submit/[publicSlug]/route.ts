import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb/db";
import {
  FormAdminAssignment,
  CustomForm,
  FormField,
} from "@/models/CustomForm";
import { Lead } from "@/models/Lead";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicSlug: string }> },
) {
  try {
    await connectToDatabase();
    const { publicSlug } = await params;

    const assignment = await FormAdminAssignment.findOne({
      publicSlug: publicSlug.toLowerCase().trim(),
      isActive: true,
    })
      .populate("formId")
      .populate("adminId");

    if (!assignment || !assignment.formId || !assignment.adminId) {
      return errorResponse("Form not found or has been deactivated", 404);
    }

    const form = assignment.formId as any;
    const admin = assignment.adminId as any;

    const body = await req.json();
    const rawAnswers = body.answers || body;

    // Semantic Mapping Extraction
    let clientName = "";
    let clientPhone = "";
    let clientEmail = "";
    let clientAddress = "";
    let customLeadTitle = "";
    const rawSubmissionData: Record<string, any> = {};

    for (const field of form.fields as FormField[]) {
      const val =
        rawAnswers[field.id] !== undefined
          ? rawAnswers[field.id]
          : rawAnswers[field.label];

      // Check required
      if (field.required && (val === undefined || val === null || val === "")) {
        return errorResponse(`Missing required field: ${field.label}`, 400);
      }

      // Check if user specifically entered a Lead Title field
      const labelLower = (field.label || "").toLowerCase();
      const idLower = (field.id || "").toLowerCase();
      if (
        labelLower === "lead title" ||
        labelLower === "title" ||
        idLower === "leadtitle" ||
        idLower === "lead_title"
      ) {
        if (val) customLeadTitle = String(val).trim();
      }

      if (field.mapping === "client_name") {
        if (!clientName) clientName = String(val || "").trim();
      } else if (field.mapping === "client_phone") {
        if (!clientPhone) clientPhone = String(val || "").trim();
      } else if (field.mapping === "client_email") {
        if (!clientEmail)
          clientEmail = String(val || "")
            .trim()
            .toLowerCase();
      } else if (field.mapping === "client_address") {
        if (!clientAddress) clientAddress = String(val || "").trim();
      } else {
        rawSubmissionData[field.label || field.id] = val;
      }
    }

    if (!clientName || !clientPhone) {
      return errorResponse(
        "Submission failed: Client Name and Phone Number are required",
        400,
      );
    }

    const finalizedLeadTitle =
      customLeadTitle || `${clientName} - ${form.name}`;

    // Auto-create Lead mapped to this Admin
    const newLead = await Lead.create({
      leadTitle: finalizedLeadTitle,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      clientAddress: clientAddress || undefined,
      source: "DynamicForm",
      campaignName: form.name,
      rawSubmissionData,
      status: "Pending",
      adminId: admin._id,
      notes: `Captured via dynamic form slug: /forms/${publicSlug}`,
      createdById: admin._id,
    });

    await recordAuditEvent({
      actor: {
        userId: admin._id.toString(),
        name: "Public Form Visitor",
        email: clientEmail || "visitor@public.lead",
        roleSlug: "public_lead",
        parentAdminId: admin._id.toString(),
      },
      action: "create",
      entity: "leads",
      entityId: newLead._id.toString(),
      source: "web_app",
      newValues: {
        leadTitle: newLead.leadTitle,
        adminId: admin._id.toString(),
        publicSlug,
      },
    });

    return jsonResponse(
      {
        leadId: newLead._id,
        message: "Thank you! Your inquiry has been submitted successfully.",
      },
      201,
    );
  } catch (error: any) {
    return errorResponse(error.message || "Failed to submit form", 500);
  }
}
