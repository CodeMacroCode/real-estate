import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import {
  deleteDomain,
  DomainServiceError,
  getDomainById,
  setPrimaryDomain,
  updateDomain,
} from "@/services/domainService";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

async function authorizeDomainAccess(req: NextRequest, id: string) {
  const authContext = await getAuthenticatedContext(req);
  if (!authContext) {
    return { error: errorResponse("Unauthorized", 401) };
  }

  const roleSlug = authContext.role?.slug;
  if (!roleSlug || !ALLOWED_ROLES.has(roleSlug)) {
    return {
      error: errorResponse(
        "Forbidden: Only administrators can manage custom domains",
        403,
      ),
    };
  }

  const existing = await getDomainById(id);
  if (!existing) {
    return { error: errorResponse("Domain not found", 404) };
  }

  const isSuperAdmin = roleSlug === "super_admin";
  if (!isSuperAdmin && existing.agencyId !== String(authContext.user._id)) {
    return {
      error: errorResponse(
        "Forbidden: You can only manage domains belonging to your own agency",
        403,
      ),
    };
  }

  return { authContext, existing, isSuperAdmin };
}

/**
 * GET /api/domains/[id]
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const access = await authorizeDomainAccess(req, id);
    if ("error" in access) {
      return access.error;
    }

    return jsonResponse(access.existing, 200);
  } catch (error: unknown) {
    if (error instanceof DomainServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("GET /api/domains/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch domain";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/domains/[id]
 * Supports updating hostname, isActive, and isPrimary (including promoting primary).
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const access = await authorizeDomainAccess(req, id);
    if ("error" in access) {
      return access.error;
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("Invalid JSON request body", 400);
    }

    const hasHostname = body.hostname !== undefined;
    const hasIsActive = body.isActive !== undefined;
    const hasIsPrimary = body.isPrimary !== undefined;

    if (!hasHostname && !hasIsActive && !hasIsPrimary) {
      return errorResponse(
        "Provide at least one field to update (hostname, isPrimary, or isActive)",
        400,
      );
    }

    const updated =
      body.isPrimary === true && !hasHostname && !hasIsActive
        ? await setPrimaryDomain(id)
        : await updateDomain(id, {
            ...(hasHostname ? { hostname: String(body.hostname) } : {}),
            ...(hasIsPrimary ? { isPrimary: Boolean(body.isPrimary) } : {}),
            ...(hasIsActive ? { isActive: Boolean(body.isActive) } : {}),
          });

    return jsonResponse(updated, 200);
  } catch (error: unknown) {
    if (error instanceof DomainServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("PATCH /api/domains/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update domain";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/domains/[id]
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const access = await authorizeDomainAccess(req, id);
    if ("error" in access) {
      return access.error;
    }

    const deleted = await deleteDomain(id);
    return jsonResponse(deleted, 200);
  } catch (error: unknown) {
    if (error instanceof DomainServiceError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error("DELETE /api/domains/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete domain";
    return errorResponse(message, 500);
  }
}
