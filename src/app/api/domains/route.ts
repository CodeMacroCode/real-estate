import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { connectToDatabase } from "@/lib/mongodb/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import {
  createDomain,
  DomainServiceError,
  listDomains,
} from "@/services/domainService";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

/**
 * GET /api/domains
 * Lists custom domains with filtering & pagination.
 * - Admin: strictly scoped to their own agencyId.
 * - SuperAdmin: can filter by any agencyId and optionally fetch ?includeAgencies=true.
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const roleSlug = authContext.role?.slug;
    if (!roleSlug || !ALLOWED_ROLES.has(roleSlug)) {
      return errorResponse(
        "Forbidden: Only administrators can manage custom domains",
        403,
      );
    }

    const isSuperAdmin = roleSlug === "super_admin";
    const { searchParams } = new URL(req.url);

    const requestedAgencyId = searchParams.get("agencyId") || undefined;
    const agencyId = isSuperAdmin
      ? requestedAgencyId
      : String(authContext.user._id);

    const search = searchParams.get("search") || undefined;
    const isActiveParam = searchParams.get("isActive");
    let isActive: boolean | undefined;
    if (isActiveParam === "true") {
      isActive = true;
    } else if (isActiveParam === "false") {
      isActive = false;
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );
    const includeAgencies = searchParams.get("includeAgencies") === "true";

    const result = await listDomains({
      agencyId,
      search,
      isActive,
      page,
      limit,
    });

    let agencies:
      | Array<{
          _id: string;
          id: string;
          name: string;
          email: string;
          agencyName: string;
          agencySlug: string;
        }>
      | undefined;

    if (isSuperAdmin && includeAgencies) {
      await connectToDatabase();
      const adminRoles = await Role.find({
        slug: { $in: ["admin", "super_admin"] },
      })
        .select("_id")
        .lean();

      const roleIds = adminRoles.map((r) => r._id);
      const agencyUsers = await User.find({
        roleId: { $in: roleIds },
        status: "active",
      })
        .select("_id name email agencyName agencySlug")
        .sort({ agencyName: 1, name: 1 })
        .lean();

      agencies = agencyUsers.map((u) => ({
        _id: u._id.toString(),
        id: u._id.toString(),
        name: u.name || "",
        email: u.email || "",
        agencyName: u.agencyName || u.name || "",
        agencySlug: u.agencySlug || "",
      }));
    }

    return jsonResponse(
      {
        domains: result.domains,
        ...(agencies ? { agencies } : {}),
      },
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    );
  } catch (error: unknown) {
    if (error instanceof DomainServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("GET /api/domains error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list domains";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/domains
 * Creates a new custom domain mapping.
 * - Admin: can only create for their own agencyId.
 * - SuperAdmin: can specify agencyId (defaults to their own if omitted).
 */
export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const roleSlug = authContext.role?.slug;
    if (!roleSlug || !ALLOWED_ROLES.has(roleSlug)) {
      return errorResponse(
        "Forbidden: Only administrators can create custom domains",
        403,
      );
    }

    const isSuperAdmin = roleSlug === "super_admin";
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse("Invalid JSON request body", 400);
    }

    const hostname =
      typeof body.hostname === "string" ? body.hostname.trim() : "";
    if (!hostname) {
      return errorResponse("Hostname is required", 400);
    }

    const targetAgencyId = isSuperAdmin
      ? typeof body.agencyId === "string" && body.agencyId.trim()
        ? body.agencyId.trim()
        : String(authContext.user._id)
      : String(authContext.user._id);

    const created = await createDomain({
      agencyId: targetAgencyId,
      hostname,
      isPrimary:
        body.isPrimary !== undefined ? Boolean(body.isPrimary) : false,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return jsonResponse(created, 201);
  } catch (error: unknown) {
    if (error instanceof DomainServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("POST /api/domains error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create domain";
    return errorResponse(message, 500);
  }
}
