import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { MasterOption, MasterCategory } from "@/models/MasterOption";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES: MasterCategory[] = [
  "property_types",
  "transaction_types",
  "property_statuses",
  "lead_sources",
  "lead_statuses",
  "locations",
  "amenities",
  "furnishing_options",
];

/**
 * GET /api/masters
 * Query Params:
 *  - category: MasterCategory (required)
 *  - includeInactive: boolean (optional, default false)
 *
 * Scoping:
 *  - Merges Global Defaults (adminId: null) with current organization's custom entries (adminId: targetAdminId).
 *  - For sub-roles, queries using their parentAdminId.
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as MasterCategory;
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid or missing category. Allowed values: ${VALID_CATEGORIES.join(", ")}`,
        400,
      );
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Determine target admin ID for scoping
    let orgAdminId: mongoose.Types.ObjectId | null = null;
    if (isAdmin) {
      orgAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else if (!isSuperAdmin) {
      // Sub-role: look up parent admin
      const currentUser = await User.findById(authContext.user._id).lean();
      if (currentUser?.parentAdminId) {
        const parentId =
          typeof currentUser.parentAdminId === "object" && "_id" in currentUser.parentAdminId
            ? (currentUser.parentAdminId as any)._id
            : currentUser.parentAdminId;
        orgAdminId = new mongoose.Types.ObjectId(String(parentId));
      }
    }

    // Build query: global defaults OR tenant's custom masters
    const filter: any = {
      category,
      $or: [{ adminId: null }],
    };

    if (orgAdminId) {
      filter.$or.push({ adminId: orgAdminId });
    }

    if (!includeInactive) {
      filter.isActive = true;
    }

    // Sort: system defaults first, then by displayOrder, then label
    const options = await MasterOption.find(filter)
      .sort({ displayOrder: 1, label: 1 })
      .lean();

    // Deduplicate: If tenant has customized a value matching a global default, tenant's override takes precedence
    const optionMap = new Map<string, any>();
    for (const opt of options) {
      const existing = optionMap.get(opt.value);
      if (!existing || (!existing.adminId && opt.adminId)) {
        optionMap.set(opt.value, opt);
      }
    }

    return jsonResponse(Array.from(optionMap.values()));
  } catch (error: any) {
    console.error("GET /api/masters error:", error);
    return errorResponse(
      error.message || "Failed to retrieve master options",
      500,
    );
  }
}

/**
 * POST /api/masters
 * Body:
 *  - category: MasterCategory
 *  - label: string
 *  - value: string
 *  - metadata?: object
 *  - displayOrder?: number
 *
 * Permissions:
 *  - Super Admin: Can create Global Defaults (isSystemDefault: true, adminId: null) or Org custom
 *  - Admin: Can create Custom Masters scoped to own organization (adminId: authContext.user._id)
 *  - Sub-roles: Blocked (403 Forbidden)
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Permission check: Only Super Admin and Admin can create master options
    if (!isSuperAdmin && !isAdmin) {
      return errorResponse(
        "Forbidden: Insufficient privileges to create master settings",
        403,
      );
    }

    const body = await req.json();
    const { category, label, value, metadata, displayOrder } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid or missing category. Allowed values: ${VALID_CATEGORIES.join(", ")}`,
        400,
      );
    }

    if (
      !label ||
      !value ||
      typeof label !== "string" ||
      typeof value !== "string"
    ) {
      return errorResponse(
        "Missing required fields: label and value are required strings",
        400,
      );
    }

    const sanitizedValue = value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    // Multi-tenant adminId assignment
    let targetAdminId: mongoose.Types.ObjectId | null = null;
    let isSystemDefault = false;

    if (isSuperAdmin && body.isGlobalDefault === true) {
      targetAdminId = null;
      isSystemDefault = true;
    } else if (isSuperAdmin && body.adminId) {
      targetAdminId = new mongoose.Types.ObjectId(body.adminId);
    } else {
      // Admin creating for own org
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    }

    // Check for duplicate value within same tenant scope
    const existing = await MasterOption.findOne({
      adminId: targetAdminId,
      category,
      value: sanitizedValue,
    });

    if (existing) {
      return errorResponse(
        `A master option with value '${sanitizedValue}' already exists in this category`,
        409,
      );
    }

    const newOption = await MasterOption.create({
      adminId: targetAdminId,
      category,
      label: label.trim(),
      value: sanitizedValue,
      metadata: metadata || {},
      displayOrder: typeof displayOrder === "number" ? displayOrder : 99,
      isSystemDefault,
      isActive: true,
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Audit Logging
    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: targetAdminId?.toString(),
      },
      action: "create",
      entity: "MasterOption",
      entityId: newOption._id.toString(),
      newValues: { category, value: sanitizedValue, isSystemDefault },
      source: "api",
    });

    return jsonResponse(newOption, 201);
  } catch (error: any) {
    console.error("POST /api/masters error:", error);
    return errorResponse(
      error.message || "Failed to create master option",
      500,
    );
  }
}
