import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";
import { ClientConfirmation } from "@/models/ClientConfirmation";
import { Client } from "@/models/Client";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { leadId } = await params;
    if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // 1. Fetch Lead with populated references
    const lead = await Lead.findById(leadId)
      .populate("clientId")
      .populate("assignedSubRoleId", "name email designation role")
      .populate("adminId", "name email")
      .lean();

    if (!lead) {
      return errorResponse("Lead not found", 404);
    }

    // 2. Fetch all appointments in chronological meeting sequence
    const appointments = await Appointment.find({ leadId: lead._id })
      .sort({ meetingSequence: 1, meetingDate: 1, createdAt: 1 })
      .populate("assignedSubRoleId", "name email role")
      .populate("confirmationId")
      .lean();

    // 3. Fetch all confirmation records for this lead
    const confirmations = await ClientConfirmation.find({ leadId: lead._id })
      .sort({ createdAt: 1 })
      .populate("appointmentId")
      .lean();

    // 4. Fetch Client master record if exists
    let clientRecord = null;
    if (lead.clientId) {
      clientRecord = lead.clientId;
    } else {
      clientRecord = await Client.findOne({
        phone: lead.clientPhone,
        adminId: lead.adminId,
      }).lean();
    }

    // 5. Structure the 360-degree timeline response
    return jsonResponse({
      lead: {
        _id: lead._id,
        leadTitle: lead.leadTitle,
        clientName: lead.clientName,
        clientPhone: lead.clientPhone,
        clientEmail: lead.clientEmail,
        clientAddress: lead.clientAddress,
        source: lead.source,
        campaignName: lead.campaignName,
        status: lead.status,
        rawSubmissionData: lead.rawSubmissionData,
        assignedSubRoleId: lead.assignedSubRoleId,
        adminId: lead.adminId,
        createdAt: lead.createdAt,
      },
      client: clientRecord || null,
      metrics: {
        totalMeetings: appointments.length,
        completedMeetings: appointments.filter((a) => a.status === "Completed")
          .length,
        isWon: lead.status === "Completed",
        isRejected: lead.status === "Rejected",
        latestOutcome:
          appointments.length > 0
            ? appointments[appointments.length - 1].outcome
            : undefined,
      },
      appointments,
      confirmations,
    });
  } catch (error: any) {
    return errorResponse(
      error.message || "Failed to fetch lead 360 timeline",
      500,
    );
  }
}
