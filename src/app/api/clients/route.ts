import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
import { Lead } from "@/models/Lead";
import { Appointment } from "@/models/Appointment";
import { ClientConfirmation } from "@/models/ClientConfirmation";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const adminFilter = searchParams.get("adminId")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const skip = (page - 1) * limit;

    const roleSlug = authContext.role?.slug || "";
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    const query: any = {};

    if (isSuperAdmin) {
      if (adminFilter) {
        query.adminId = new mongoose.Types.ObjectId(adminFilter);
      }
    } else if (isAdmin) {
      query.adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      // Sub-Role
      const currentUser = await User.findById(authContext.user._id).lean();
      const parentAdminId = currentUser?.parentAdminId;
      if (!parentAdminId) {
        return jsonResponse([], 200, {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          totalVerified: 0,
        });
      }
      query.adminId = parentAdminId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { clientName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { companyName: searchRegex },
      ];
    }

    // Base scope query for counting total verified clients in scope (without search/status filter constraints)
    const baseScopeQuery: any = {};
    if (query.adminId) {
      baseScopeQuery.adminId = query.adminId;
    }

    const [clients, total, totalVerified] = await Promise.all([
      Client.find(query)
        .populate("adminId", "name email designation")
        .populate("leadId", "leadTitle source")
        .populate("createdById", "name email")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(query),
      Client.countDocuments(baseScopeQuery),
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      totalVerified,
    };

    return jsonResponse(
      clients,
      200,
      pagination
    );
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch clients", 500);
  }
}

/**
 * POST /api/clients
 * Create a new Client record directly in the CRM directory
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();
    const body = await req.json();
    const { clientName, phone, email, address, companyName, status = "Active", notes } = body;

    if (!clientName?.trim() || !phone?.trim()) {
      return errorResponse("Client name and phone are required", 400);
    }

    const roleSlug = authContext.role?.slug || "";
    let adminId: mongoose.Types.ObjectId;
    if (roleSlug === "super_admin" && body.adminId) {
      adminId = new mongoose.Types.ObjectId(body.adminId);
    } else if (roleSlug === "admin") {
      adminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      adminId = new mongoose.Types.ObjectId(
        (authContext.user.parentAdminId || authContext.user._id).toString()
      );
    }

    // Check for duplicate phone under the same admin
    const existingClient = await Client.findOne({
      adminId,
      phone: phone.trim(),
    });

    if (existingClient) {
      return errorResponse(
        `A client with phone number ${phone.trim()} already exists (${existingClient.clientName})`,
        409
      );
    }

    const newClient = new Client({
      adminId,
      clientName: clientName.trim(),
      phone: phone.trim(),
      email: email?.trim()?.toLowerCase() || undefined,
      address: address?.trim() || undefined,
      companyName: companyName?.trim() || undefined,
      status,
      notes: notes?.trim() || undefined,
      totalDealsWon: 0,
      totalRevenue: 0,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    await newClient.save();

    return jsonResponse(newClient, 201);
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    return errorResponse(error.message || "Failed to create client", 500);
  }
}
