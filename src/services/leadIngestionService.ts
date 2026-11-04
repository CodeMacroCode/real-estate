import { connectToDatabase } from "@/lib/mongodb/db";
import { PublicInquiry, IPublicInquiryDocument, PublicInquiryType } from "@/models/PublicInquiry";
import { Lead } from "@/models/Lead";
import { Property } from "@/models/Property";
import { Project } from "@/models/Project";
import { Types } from "mongoose";

export interface InboundInquiryPayload {
  adminId?: string;
  inquiryType?: PublicInquiryType;
  propertyId?: string;
  projectId?: string;
  name: string;
  phone: string;
  email?: string;
  whatsApp?: string;
  preferredDateTime?: string | Date;
  message?: string;
}

export interface IngestionResult {
  inquiryId: string;
  status: "Converted_To_Lead" | "Appended_To_Existing_Lead";
  leadId: string;
  leadTitle: string;
  isNewLead: boolean;
  message: string;
}

/**
 * Lead Ingestion & Deduplication Service
 *
 * BUSINESS RULES:
 * 1. Checks if a Lead already exists under the target `adminId` with the same `phone` (or optional `email`).
 * 2. If MATCH FOUND:
 *    - Does NOT create a duplicate Lead.
 *    - Appends a new activity event to the existing Lead's timeline detailing the new inquiry.
 *    - Updates the inquiry status to 'Appended_To_Existing_Lead' and links the `crmLeadId`.
 * 3. If NO MATCH:
 *    - Ingests a new Lead with source='Website', status='Pending' (or 'New').
 *    - Links the Property/Project context.
 *    - Updates the inquiry status to 'Converted_To_Lead' and links the `crmLeadId`.
 */
export async function ingestWebsiteInquiry(payload: InboundInquiryPayload): Promise<IngestionResult> {
  await connectToDatabase();

  const phone = payload.phone?.trim();
  const name = payload.name?.trim();

  if (!phone || !name) {
    throw new Error("Name and Phone number are required fields for inquiry submission.");
  }

  // 1. Resolve Target adminId
  let targetAdminId: Types.ObjectId | null = null;

  if (payload.adminId && Types.ObjectId.isValid(payload.adminId)) {
    targetAdminId = new Types.ObjectId(payload.adminId);
  } else if (payload.propertyId && Types.ObjectId.isValid(payload.propertyId)) {
    const property = await Property.findById(payload.propertyId).select("adminId title");
    if (property) {
      targetAdminId = property.adminId;
    }
  } else if (payload.projectId && Types.ObjectId.isValid(payload.projectId)) {
    const project = await Project.findById(payload.projectId).select("adminId name");
    if (project) {
      targetAdminId = project.adminId;
    }
  }

  if (!targetAdminId) {
    throw new Error("Unable to determine target organization (adminId) for inquiry.");
  }

  // Fetch contextual title if property or project linked
  let contextTitle = "";
  if (payload.propertyId && Types.ObjectId.isValid(payload.propertyId)) {
    const p = await Property.findById(payload.propertyId).select("title propertyId");
    if (p) contextTitle = `Property: ${p.title} (${p.propertyId})`;
  } else if (payload.projectId && Types.ObjectId.isValid(payload.projectId)) {
    const prj = await Project.findById(payload.projectId).select("name projectId");
    if (prj) contextTitle = `Project: ${prj.name} (${prj.projectId})`;
  }

  // 2. Save Raw Public Inquiry Record
  const inquiry = await PublicInquiry.create({
    adminId: targetAdminId,
    inquiryType: payload.inquiryType || "General",
    propertyId: payload.propertyId && Types.ObjectId.isValid(payload.propertyId) ? payload.propertyId : undefined,
    projectId: payload.projectId && Types.ObjectId.isValid(payload.projectId) ? payload.projectId : undefined,
    name,
    phone,
    email: payload.email?.trim().toLowerCase() || undefined,
    whatsApp: payload.whatsApp?.trim() || undefined,
    preferredDateTime: payload.preferredDateTime ? new Date(payload.preferredDateTime) : undefined,
    message: payload.message?.trim() || undefined,
    status: "Pending",
  });

  // 3. Deduplication Check against existing Leads for targetAdminId
  const sanitizedPhone = phone.replace(/\D/g, "").slice(-10); // Standardize last 10 digits
  const phoneRegex = new RegExp(`${sanitizedPhone}$`);

  const existingLead = await Lead.findOne({
    adminId: targetAdminId,
    $or: [
      { clientPhone: { $regex: phoneRegex } },
      ...(payload.email ? [{ clientEmail: payload.email.trim().toLowerCase() }] : []),
    ],
  });

  if (existingLead) {
    // Lead exists: Append activity timeline without creating duplicate lead
    const activityEvent = {
      action: "Website Inquiry Received",
      description: `Visitor inquired via Website (${payload.inquiryType || "General"})${
        contextTitle ? ` for ${contextTitle}` : ""
      }. Message: ${payload.message || "No message provided."}`,
      timestamp: new Date(),
      metadata: {
        inquiryId: inquiry._id,
        propertyId: payload.propertyId,
        projectId: payload.projectId,
        inquiryType: payload.inquiryType,
      },
    };

    if (!existingLead.activityTimeline) {
      existingLead.activityTimeline = [];
    }
    existingLead.activityTimeline.push(activityEvent);

    if (contextTitle && !existingLead.preferredProperty) {
      existingLead.preferredProperty = contextTitle;
    }

    await existingLead.save();

    inquiry.status = "Appended_To_Existing_Lead";
    inquiry.crmLeadId = existingLead._id;
    await inquiry.save();

    return {
      inquiryId: inquiry._id.toString(),
      status: "Appended_To_Existing_Lead",
      leadId: existingLead._id.toString(),
      leadTitle: existingLead.leadTitle,
      isNewLead: false,
      message: `Inquiry successfully matched and appended to existing lead '${existingLead.clientName}'.`,
    };
  }

  // 4. No Match Found: Ingest Fresh New Lead
  const newLeadTitle = contextTitle
    ? `Web Lead: ${name} (${contextTitle})`
    : `Web Inquiry: ${name}`;

  const newLead = await Lead.create({
    leadTitle: newLeadTitle,
    clientName: name,
    clientPhone: phone,
    clientEmail: payload.email?.trim().toLowerCase(),
    source: "Website",
    status: "Pending",
    adminId: targetAdminId,
    preferredProperty: contextTitle || undefined,
    notes: payload.message || "Inbound inquiry submitted via public portal.",
    rawSubmissionData: {
      inquiryId: inquiry._id,
      inquiryType: payload.inquiryType || "General",
      preferredDateTime: payload.preferredDateTime,
    },
    activityTimeline: [
      {
        action: "Lead Created via Website",
        description: `New lead created from inbound web inquiry (${payload.inquiryType || "General"})${
          contextTitle ? ` for ${contextTitle}` : ""
        }.`,
        timestamp: new Date(),
        metadata: {
          inquiryId: inquiry._id,
        },
      },
    ],
    createdById: targetAdminId, // Scoped to organization admin
  });

  inquiry.status = "Converted_To_Lead";
  inquiry.crmLeadId = newLead._id;
  await inquiry.save();

  return {
    inquiryId: inquiry._id.toString(),
    status: "Converted_To_Lead",
    leadId: newLead._id.toString(),
    leadTitle: newLead.leadTitle,
    isNewLead: true,
    message: `New Lead successfully created in CRM for visitor '${name}'.`,
  };
}

/**
 * SSR Service: Fetch inquiries for organization dashboard
 */
export async function getSsrPublicInquiries(adminId: string, page = 1, limit = 20) {
  await connectToDatabase();

  const skip = (page - 1) * limit;
  const [inquiries, total] = await Promise.all([
    PublicInquiry.find({ adminId })
      .populate("propertyId", "title propertyId")
      .populate("projectId", "name projectId")
      .populate("crmLeadId", "leadTitle status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PublicInquiry.countDocuments({ adminId }),
  ]);

  return {
    inquiries: inquiries.map((doc: any) => ({
      id: doc._id.toString(),
      inquiryType: doc.inquiryType,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      whatsApp: doc.whatsApp,
      preferredDateTime: doc.preferredDateTime ? new Date(doc.preferredDateTime).toISOString() : null,
      message: doc.message,
      status: doc.status,
      crmLead: doc.crmLeadId
        ? {
            id: doc.crmLeadId._id?.toString() || doc.crmLeadId.toString(),
            title: doc.crmLeadId.leadTitle,
            status: doc.crmLeadId.status,
          }
        : null,
      property: doc.propertyId
        ? {
            id: doc.propertyId._id?.toString() || doc.propertyId.toString(),
            title: doc.propertyId.title,
            propertyId: doc.propertyId.propertyId,
          }
        : null,
      project: doc.projectId
        ? {
            id: doc.projectId._id?.toString() || doc.projectId.toString(),
            name: doc.projectId.name,
            projectId: doc.projectId.projectId,
          }
        : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

