import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Client } from "@/models/Client";
import { ClientRequirement } from "@/models/ClientRequirement";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

/**
 * GET /api/clients/[id]/requirements
 * List all requirements captured for a client
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
      return errorResponse("Invalid client ID", 400);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    let targetAdminId: mongoose.Types.ObjectId | null = null;
    if (isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (!isSuperAdmin) {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (currentUser?.parentAdminId) {
        const parentId =
          typeof currentUser.parentAdminId === "object" &&
          "_id" in currentUser.parentAdminId
            ? (currentUser.parentAdminId as any)._id
            : currentUser.parentAdminId;
        targetAdminId = new mongoose.Types.ObjectId(String(parentId));
      }
    }

    const query: any = { clientId: new mongoose.Types.ObjectId(id) };
    if (targetAdminId) {
      query.adminId = targetAdminId;
    }

    const requirements = await ClientRequirement.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return jsonResponse(requirements);
  } catch (error: any) {
    console.error("GET /api/clients/[id]/requirements error:", error);
    return errorResponse(
      error.message || "Failed to retrieve client requirements",
      500,
    );
  }
}

/**
 * POST /api/clients/[id]/requirements
 * Save or update buyer/tenant property requirement criteria
 */
export async function POST(
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
      return errorResponse("Invalid client ID", 400);
    }

    await connectToDatabase();

    const client = await Client.findById(id);
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const body = await req.json();
    const {
      transactionType,
      propertyCategories,
      propertyTypes,
      minBudget,
      maxBudget,
      preferredLocations,
      minBedrooms,
      furnishing,
      notes,
    } = body;

    if (!transactionType || maxBudget === undefined) {
      return errorResponse("transactionType and maxBudget are required", 400);
    }

    const requirement = await ClientRequirement.create({
      adminId: client.adminId,
      clientId: client._id,
      transactionType: transactionType || "Buy",
      propertyCategories: Array.isArray(propertyCategories)
        ? propertyCategories
        : ["Residential"],
      propertyTypes: Array.isArray(propertyTypes) ? propertyTypes : [],
      minBudget: typeof minBudget === "number" ? minBudget : 0,
      maxBudget: Number(maxBudget),
      preferredLocations: Array.isArray(preferredLocations)
        ? preferredLocations
        : [],
      minBedrooms: typeof minBedrooms === "number" ? minBedrooms : undefined,
      furnishing: furnishing || undefined,
      notes: notes || "",
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: client.adminId.toString(),
      },
      action: "create",
      entity: "ClientRequirement",
      entityId: requirement._id.toString(),
      newValues: { transactionType, maxBudget, propertyTypes },
      source: "api",
    });

    return jsonResponse(requirement, 201);
  } catch (error: any) {
    console.error("POST /api/clients/[id]/requirements error:", error);
    return errorResponse(
      error.message || "Failed to create client requirement",
      500,
    );
  }
}
