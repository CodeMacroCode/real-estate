import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { getSsrWebsitePortals } from "@/services/websiteManagementService";

export const dynamic = "force-dynamic";

/**
 * GET /api/website-management
 * Multi-tenant paginated website portals endpoint with search and scoping.
 */
export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const host = req.headers.get("host") || "localhost:3000";

    const result = await getSsrWebsitePortals({
      userId: authContext.user._id,
      roleSlug: authContext.role.slug,
      search,
      page,
      limit,
      host,
    });

    return jsonResponse(
      {
        adminPortals: result.adminPortals,
        meta: result.meta,
      },
      200,
      result.pagination
    );
  } catch (error: any) {
    console.error("GET /api/website-management error:", error);
    return errorResponse(error.message || "Failed to retrieve website URLs", 500);
  }
}

/**
 * PATCH /api/website-management
 * Allows an Admin or SuperAdmin to update their agency slug and custom domain.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const roleSlug = authContext.role.slug;
    const isSuperAdmin = roleSlug === "super_admin";
    const isAdmin = roleSlug === "admin";

    if (!isSuperAdmin && !isAdmin) {
      return errorResponse("Only administrators can configure website domain URLs", 403);
    }

    const body = await req.json();
    const { targetAdminId, agencyName, agencySlug, customDomain } = body;

    let updateUserId = authContext.user._id;
    if (isSuperAdmin && targetAdminId) {
      updateUserId = targetAdminId;
    }

    await connectToDatabase();

    const cleanSlug = agencySlug
      ? agencySlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
      : undefined;

    const cleanDomain = customDomain
      ? customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : undefined;

    // Check uniqueness if slug changed
    if (cleanSlug) {
      const existingSlug = await User.findOne({
        agencySlug: cleanSlug,
        _id: { $ne: new mongoose.Types.ObjectId(updateUserId) },
      });
      if (existingSlug) {
        return errorResponse(`Agency slug "${cleanSlug}" is already in use by another agency`, 400);
      }
    }

    if (cleanDomain) {
      const existingDomain = await User.findOne({
        customDomain: cleanDomain,
        _id: { $ne: new mongoose.Types.ObjectId(updateUserId) },
      });
      if (existingDomain) {
        return errorResponse(`Domain "${cleanDomain}" is already bound to another agency`, 400);
      }
    }

    const updateDoc: any = {};
    const unsetDoc: any = {};

    if (agencyName !== undefined) {
      updateDoc.agencyName = agencyName.trim();
    }
    if (cleanSlug) {
      updateDoc.agencySlug = cleanSlug;
    }

    if (cleanDomain) {
      updateDoc.customDomain = cleanDomain;
    } else {
      // Use $unset so MongoDB sparse index customDomain_1 does not store `{ customDomain: null }`
      unsetDoc.customDomain = 1;
    }

    const updateOperations: any = {};
    if (Object.keys(updateDoc).length > 0) {
      updateOperations.$set = updateDoc;
    }
    if (Object.keys(unsetDoc).length > 0) {
      updateOperations.$unset = unsetDoc;
    }

    const updatedUser = await User.findByIdAndUpdate(
      updateUserId,
      updateOperations,
      { new: true }
    ).select("_id name email agencyName agencySlug customDomain");

    return jsonResponse(updatedUser);
  } catch (error: any) {
    console.error("PATCH /api/website-management error:", error);
    return errorResponse(error.message || "Failed to update website domain settings", 500);
  }
}
