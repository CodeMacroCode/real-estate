import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Client } from "@/models/Client";
import { User } from "@/models/User";
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

    const [clients, total] = await Promise.all([
      Client.find(query)
        .populate("adminId", "name email designation")
        .populate("leadId", "leadTitle source")
        .populate("createdById", "name email")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(query),
    ]);

    return jsonResponse(clients, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch clients", 500);
  }
}
