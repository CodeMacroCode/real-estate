import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { ClientConfirmation } from "@/models/ClientConfirmation";
import { Appointment } from "@/models/Appointment";
import { Lead } from "@/models/Lead";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
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

    const confirmation = await ClientConfirmation.findById(id)
      .populate("appointmentId")
      .populate("leadId")
      .lean();

    if (!confirmation) {
      return errorResponse("Confirmation record not found", 404);
    }

    return jsonResponse(confirmation);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch confirmation", 500);
  }
}

export async function PUT(
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

    const confirmation = await ClientConfirmation.findById(id);
    if (!confirmation) {
      return errorResponse("Confirmation not found", 404);
    }

    const body = await req.json();
    const {
      clientConfirmation,
      clientFeedback,
      agreedDeliveryDate,
      followUpDate,
      rejectionReason,
      quotationAmount,
      quotationNumber,
      invoiceUrl,
      deliveryOrSiteAddress,
    } = body;

    if (clientConfirmation)
      confirmation.clientConfirmation = clientConfirmation;
    if (clientFeedback !== undefined)
      confirmation.clientFeedback = clientFeedback;
    if (agreedDeliveryDate !== undefined)
      confirmation.agreedDeliveryDate = agreedDeliveryDate
        ? new Date(agreedDeliveryDate)
        : undefined;
    if (followUpDate !== undefined)
      confirmation.followUpDate = followUpDate
        ? new Date(followUpDate)
        : undefined;
    if (rejectionReason !== undefined)
      confirmation.rejectionReason = rejectionReason;
    if (quotationAmount !== undefined)
      confirmation.quotationAmount = Number(quotationAmount) || 0;
    if (quotationNumber !== undefined)
      confirmation.quotationNumber = quotationNumber;
    if (invoiceUrl !== undefined) confirmation.invoiceUrl = invoiceUrl;
    if (deliveryOrSiteAddress !== undefined)
      confirmation.deliveryOrSiteAddress = deliveryOrSiteAddress;

    await confirmation.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "update",
      entity: "client_confirmations",
      entityId: id,
      newValues: body,
    });

    return jsonResponse(confirmation);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update confirmation", 500);
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

    const confirmation = await ClientConfirmation.findById(id);
    if (!confirmation) {
      return errorResponse("Confirmation not found", 404);
    }

    await ClientConfirmation.findByIdAndDelete(id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "delete",
      entity: "client_confirmations",
      entityId: id,
    });

    return jsonResponse({ message: "Confirmation deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete confirmation", 500);
  }
}
