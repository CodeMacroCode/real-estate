import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Client } from "@/models/Client";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";
import { ClientConfirmation } from "@/models/ClientConfirmation";
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

    let clientQuery: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      clientQuery = { _id: id };
    } else {
      const decoded = decodeURIComponent(id).trim();
      clientQuery = {
        $or: [
          { clientName: { $regex: new RegExp(`^${decoded.replace(/[-_]/g, "[ -_]")}$`, "i") } },
          { clientName: decoded },
        ],
      };
    }

    const client = await Client.findOne(clientQuery)
      .populate("adminId", "name email designation")
      .populate("leadId")
      .populate("confirmationId")
      .lean();

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    // Fetch all leads associated with this client
    const leadsQuery: any = {
      $or: [
        { clientId: client._id },
        { clientPhone: client.phone },
      ],
    };
    if (client.leadId?._id) {
      leadsQuery.$or.push({ _id: client.leadId._id });
    }

    const leads = await Lead.find(leadsQuery)
      .populate("adminId", "name email designation")
      .populate({
        path: "assignedSubRoleId",
        select: "name email designation roleId",
        populate: { path: "roleId", select: "name slug" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return jsonResponse({
      ...client,
      leads: leads || [],
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch client", 500);
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

    let clientQuery: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      clientQuery = { _id: id };
    } else {
      const decoded = decodeURIComponent(id).trim();
      clientQuery = {
        $or: [
          { clientName: { $regex: new RegExp(`^${decoded.replace(/[-_]/g, "[ -_]")}$`, "i") } },
          { clientName: decoded },
        ],
      };
    }

    const client = await Client.findOne(clientQuery);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const body = await req.json();
    const { clientName, phone, email, address, companyName, status, notes } =
      body;

    if (clientName) client.clientName = clientName;
    if (phone) client.phone = phone;
    if (email !== undefined) client.email = email;
    if (address !== undefined) client.address = address;
    if (companyName !== undefined) client.companyName = companyName;
    if (status) client.status = status;
    if (notes !== undefined) client.notes = notes;

    await client.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "update",
      entity: "clients",
      entityId: client._id.toString(),
      newValues: body,
    });

    return jsonResponse(client);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update client", 500);
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

    let clientQuery: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      clientQuery = { _id: id };
    } else {
      const decoded = decodeURIComponent(id).trim();
      clientQuery = {
        $or: [
          { clientName: { $regex: new RegExp(`^${decoded.replace(/[-_]/g, "[ -_]")}$`, "i") } },
          { clientName: decoded },
        ],
      };
    }

    const client = await Client.findOne(clientQuery);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const clientIdStr = client._id.toString();
    await Client.findByIdAndDelete(client._id);

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: authContext.user.parentAdminId?.toString(),
      },
      action: "delete",
      entity: "clients",
      entityId: clientIdStr,
    });

    return jsonResponse({ message: "Client deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete client", 500);
  }
}
