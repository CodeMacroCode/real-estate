import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid appointment ID", 400);
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return errorResponse("Appointment not found", 404);
    }

    const roleSlug = authContext.role?.slug || "";
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    // Scoping check
    if (
      isAdmin &&
      appointment.adminId.toString() !== authContext.user._id.toString()
    ) {
      return errorResponse("Access denied", 403);
    }

    const body = await req.json();
    const {
      meetingDate,
      meetingType,
      meetingLocation,
      agenda,
      durationMinutes,
      status,
      // Quotation management
      quotationTitle,
      quotationAmount,
      quotationUrl,
      // Invoice management
      invoiceUrl,
      invoiceName,
    } = body;

    if (meetingDate) appointment.meetingDate = new Date(meetingDate);
    if (meetingType) {
      appointment.meetingType = meetingType;
      if (meetingType === "Virtual" && !appointment.googleCalendarLink) {
        const meetCode =
          Math.random().toString(36).substring(2, 5) +
          "-" +
          Math.random().toString(36).substring(2, 6) +
          "-" +
          Math.random().toString(36).substring(2, 5);
        appointment.googleCalendarLink = `https://meet.google.com/${meetCode}`;
      }
    }
    if (meetingLocation !== undefined)
      appointment.meetingLocation = meetingLocation;
    if (agenda !== undefined) appointment.agenda = agenda;
    if (durationMinutes !== undefined)
      appointment.durationMinutes = Number(durationMinutes);
    if (status !== undefined) appointment.status = status;

    if (quotationTitle !== undefined)
      appointment.quotationTitle = quotationTitle;
    if (quotationAmount !== undefined)
      appointment.quotationAmount = Number(quotationAmount) || 0;
    if (quotationUrl !== undefined) appointment.quotationUrl = quotationUrl;

    if (invoiceUrl !== undefined) {
      appointment.invoiceUrl = invoiceUrl;
      appointment.invoiceName = invoiceName || "Invoice Receipt";
      appointment.invoiceUploadedAt = invoiceUrl ? new Date() : undefined;
    }

    await appointment.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "update",
      entity: "appointments",
      entityId: appointment._id.toString(),
      newValues: body,
    });

    return jsonResponse(appointment);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update appointment", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid appointment ID", 400);
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return errorResponse("Appointment not found", 404);
    }

    const roleSlug = authContext.role?.slug || "";
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    if (
      isAdmin &&
      appointment.adminId.toString() !== authContext.user._id.toString()
    ) {
      return errorResponse("Access denied", 403);
    }

    const leadId = appointment.leadId;

    await Appointment.findByIdAndDelete(id);

    // If lead has no remaining appointments, revert appointmentScheduled flag
    const remainingCount = await Appointment.countDocuments({ leadId });
    if (remainingCount === 0) {
      await Lead.findByIdAndUpdate(leadId, {
        appointmentScheduled: false,
        appointmentId: null,
        status: "Pending",
      });
    }

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "delete",
      entity: "appointments",
      entityId: id,
    });

    return jsonResponse({ message: "Appointment deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete appointment", 500);
  }
}
