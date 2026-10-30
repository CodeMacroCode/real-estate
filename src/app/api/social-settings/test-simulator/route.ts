import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const body = await req.json();
    const { platform, clientName, clientPhone, clientEmail, adminId } = body;

    const targetAdminId =
      authContext.role?.slug === "super_admin" && adminId
        ? new mongoose.Types.ObjectId(adminId)
        : authContext.user.parentAdminId
          ? new mongoose.Types.ObjectId(
              authContext.user.parentAdminId.toString(),
            )
          : new mongoose.Types.ObjectId(authContext.user._id);

    if (platform === "calendar") {
      // Simulate creating a test calendar event appointment
      const meetCode = `test-${Math.random().toString(36).substring(2, 6)}`;
      const appointment = await Appointment.create({
        leadId: new mongoose.Types.ObjectId(),
        clientName: clientName || "Google Calendar Test Attendee",
        clientPhone: clientPhone || "+91 99999 00000",
        clientEmail: clientEmail || "test.sync@google.calendar",
        agenda: "Sync Test: 15-Minute Google Calendar Appointment",
        meetingType: "Virtual",
        meetingDate: new Date(Date.now() + 3600000), // 1 hour from now
        durationMinutes: 15,
        status: "Scheduled",
        googleCalendarLink: `https://meet.google.com/${meetCode}`,
        adminId: targetAdminId,
        assignedSubRoleId: new mongoose.Types.ObjectId(authContext.user._id),
        createdById: new mongoose.Types.ObjectId(authContext.user._id),
      });

      return jsonResponse({
        message:
          "Test calendar appointment created successfully with Meet link",
        appointment,
      });
    }

    // Otherwise, simulate inbound lead ingestion (Google Ads, Meta, LinkedIn)
    const sourceMap: Record<string, "Meta" | "GoogleAds" | "LinkedIn"> = {
      meta: "Meta",
      googleAds: "GoogleAds",
      linkedIn: "LinkedIn",
    };

    const source = sourceMap[platform] || "GoogleAds";

    const testLead = await Lead.create({
      leadTitle: `[Test Simulator] ${source} Lead - ${clientName || "Demo Prospect"}`,
      clientName: clientName || `${source} Test Lead`,
      clientPhone: clientPhone || "+91 98765 43210",
      clientEmail: clientEmail || `test.${source.toLowerCase()}@pipeline.crm`,
      source,
      campaignName: `${source} Ingestion Test Campaign`,
      status: "Pending",
      adminId: targetAdminId,
      notes: `Generated via ${source} Integration Simulator to verify webhook ingestion without ad spend.`,
      rawSubmissionData: {
        simulatorTriggeredBy: authContext.user.email,
        timestamp: new Date().toISOString(),
        verified: true,
      },
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "create",
      entity: "leads",
      entityId: testLead._id.toString(),
      newValues: {
        source,
        simulator: true,
        clientName: testLead.clientName,
      },
    });

    return jsonResponse({
      message: `Test lead dispatched to ${source} pipeline successfully`,
      lead: testLead,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Simulator failed", 500);
  }
}
