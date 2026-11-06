import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Booking } from "@/models/Booking";
import { ProjectUnit } from "@/models/ProjectUnit";
import { Property } from "@/models/Property";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { recalculateProjectCounters } from "@/services/projectService";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid booking ID", 400);
    }

    await connectToDatabase();

    const booking = await Booking.findById(id)
      .populate("clientId")
      .populate("projectId")
      .populate("projectUnitId")
      .populate("propertyId")
      .populate("createdById", "name email")
      .lean();

    if (!booking) {
      return errorResponse("Booking not found", 404);
    }

    return jsonResponse(booking);
  } catch (error: any) {
    console.error("GET /api/bookings/[id] error:", error);
    return errorResponse(
      error.message || "Failed to load booking details",
      500,
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Update booking status, agreement value, payments, or documents
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid booking ID", 400);
    }

    await connectToDatabase();
    const body = await req.json();

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse("Booking not found", 404);
    }

    // 1. Status Update
    if (body.bookingStatus && body.bookingStatus !== booking.bookingStatus) {
      booking.bookingStatus = body.bookingStatus;
      // Sync unit status
      if (booking.itemType === "ProjectUnit" && booking.projectUnitId) {
        let unitStatus: any = "Booked";
        if (body.bookingStatus === "Sold") unitStatus = "Sold";
        else if (body.bookingStatus === "Hold") unitStatus = "Hold";
        else if (body.bookingStatus === "Cancelled") unitStatus = "Available";

        await ProjectUnit.findByIdAndUpdate(booking.projectUnitId, {
          $set: {
            status: unitStatus,
            bookedByClientId:
              body.bookingStatus === "Cancelled" ? null : booking.clientId,
          },
        });
        if (booking.projectId) {
          await recalculateProjectCounters(booking.projectId);
        }
      } else if (booking.itemType === "Property" && booking.propertyId) {
        let propStatus: any = "Booked";
        if (body.bookingStatus === "Sold") propStatus = "Sold";
        else if (body.bookingStatus === "Hold") propStatus = "Hold";
        else if (body.bookingStatus === "Cancelled") propStatus = "Available";

        await Property.findByIdAndUpdate(booking.propertyId, {
          $set: { status: propStatus },
        });
      }
    }

    // 2. Agreement Value Update
    if (body.agreementValue !== undefined && body.agreementValue !== null) {
      booking.agreementValue = Number(body.agreementValue);
    }

    // 3. Add Payment Entry
    if (body.newPayment && Number(body.newPayment.amount) > 0) {
      booking.payments.push({
        paymentType: body.newPayment.paymentType || "Part Payment",
        amount: Number(body.newPayment.amount),
        paymentMode: body.newPayment.paymentMode || "NEFT/RTGS",
        referenceNumber: body.newPayment.referenceNumber,
        receiptNumber: body.newPayment.receiptNumber,
        paymentDate: body.newPayment.paymentDate
          ? new Date(body.newPayment.paymentDate)
          : new Date(),
        notes: body.newPayment.notes,
      });
    }

    // 4. Add Document Entry
    if (
      body.newDocument &&
      body.newDocument.fileUrl &&
      body.newDocument.title
    ) {
      booking.documents.push({
        title: body.newDocument.title,
        fileUrl: body.newDocument.fileUrl,
        fileType: body.newDocument.fileType || "Document",
        uploadedAt: new Date(),
      });
    }

    // 5. Loan Details Update
    if (body.loanDetails !== undefined) {
      booking.loanDetails = {
        isLoanRequired: Boolean(body.loanDetails.isLoanRequired),
        bankName: body.loanDetails.bankName?.trim() || "",
        sanctionedAmount: Number(body.loanDetails.sanctionedAmount || 0),
        disbursedAmount: Number(body.loanDetails.disbursedAmount || 0),
        loanAccountNumber: body.loanDetails.loanAccountNumber?.trim() || "",
        loanStatus: body.loanDetails.loanStatus || "Not Applied",
      };
    }

    // 6. Notes Update
    if (body.notes !== undefined) {
      booking.notes = body.notes;
    }

    await booking.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: booking.adminId.toString(),
      },
      action: "update",
      entity: "Booking",
      entityId: id,
      newValues: {
        bookingStatus: booking.bookingStatus,
        agreementValue: booking.agreementValue,
        totalPaid: booking.totalPaid,
        balanceAmount: booking.balanceAmount,
      },
      source: "api",
    });

    return jsonResponse(booking);
  } catch (error: any) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return errorResponse(error.message || "Failed to update booking", 500);
  }
}
