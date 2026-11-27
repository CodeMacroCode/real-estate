import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { getSsrWebsitePortals } from "@/services/websiteManagementService";
import { AgencyDomain } from "@/models/AgencyDomain";
import {
  normalizeHostname,
  isValidHostname,
  isPlatformHost,
} from "@/lib/domains/normalize";
import { invalidateDomainCache } from "@/services/domainService";

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

    if (!mongoose.Types.ObjectId.isValid(updateUserId)) {
      return errorResponse("Invalid target admin ID", 400);
    }
    const updateObjectId = new mongoose.Types.ObjectId(updateUserId);

    await connectToDatabase();

    const existingUser = await User.findById(updateObjectId)
      .select("_id customDomain agencyName agencySlug")
      .lean();
    if (!existingUser) {
      return errorResponse("Agency user not found", 404);
    }

    const cleanSlug = agencySlug
      ? agencySlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
      : undefined;

    const hasCustomDomainInput = customDomain !== undefined;
    const rawCustomDomain =
      typeof customDomain === "string" ? customDomain.trim() : "";
    const cleanDomain = rawCustomDomain
      ? normalizeHostname(rawCustomDomain)
      : undefined;

    if (rawCustomDomain) {
      if (!cleanDomain || !isValidHostname(cleanDomain)) {
        return errorResponse(
          "Invalid custom domain hostname. Provide a valid domain or subdomain (e.g. portal.agency.com).",
          400,
        );
      }
      if (isPlatformHost(cleanDomain)) {
        return errorResponse(
          "Platform hostnames cannot be used as custom domains.",
          400,
        );
      }
    }

    // Check uniqueness if slug changed
    if (cleanSlug) {
      const existingSlug = await User.findOne({
        agencySlug: cleanSlug,
        _id: { $ne: updateObjectId },
      });
      if (existingSlug) {
        return errorResponse(`Agency slug "${cleanSlug}" is already in use by another agency`, 400);
      }
    }

    if (cleanDomain) {
      const [existingUserDomain, existingAgencyDomain] = await Promise.all([
        User.findOne({
          customDomain: cleanDomain,
          _id: { $ne: updateObjectId },
        })
          .select("_id")
          .lean(),
        AgencyDomain.findOne({
          hostname: cleanDomain,
          agencyId: { $ne: updateObjectId },
        })
          .select("_id")
          .lean(),
      ]);

      if (existingUserDomain || existingAgencyDomain) {
        return errorResponse(
          `Domain "${cleanDomain}" is already bound to another agency`,
          409,
        );
      }
    }

    const updateDoc: any = {};
    const unsetDoc: any = {};

    if (agencyName !== undefined) {
      updateDoc.agencyName = String(agencyName).trim();
    }
    if (cleanSlug) {
      updateDoc.agencySlug = cleanSlug;
    }

    if (cleanDomain) {
      updateDoc.customDomain = cleanDomain;
    } else if (hasCustomDomainInput) {
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

    const updatedUser =
      Object.keys(updateOperations).length > 0
        ? await User.findByIdAndUpdate(updateObjectId, updateOperations, {
            new: true,
          }).select("_id name email agencyName agencySlug customDomain")
        : await User.findById(updateObjectId).select(
            "_id name email agencyName agencySlug customDomain",
          );

    // Sync AgencyDomain records and invalidate tenant domain cache
    if (cleanDomain) {
      await AgencyDomain.updateMany(
        {
          agencyId: updateObjectId,
          isPrimary: true,
          hostname: { $ne: cleanDomain },
        },
        { $set: { isPrimary: false } },
      );

      await AgencyDomain.findOneAndUpdate(
        { agencyId: updateObjectId, hostname: cleanDomain },
        { $set: { isPrimary: true, isActive: true } },
        { upsert: true, new: true },
      );

      invalidateDomainCache(cleanDomain);
      if (
        existingUser.customDomain &&
        existingUser.customDomain !== cleanDomain
      ) {
        invalidateDomainCache(existingUser.customDomain);
      }
    } else if (hasCustomDomainInput) {
      const domainFilter: any = {
        agencyId: updateObjectId,
        isActive: true,
        $or: [{ isPrimary: true }],
      };
      if (existingUser.customDomain) {
        domainFilter.$or.push({ hostname: existingUser.customDomain });
      }

      const domainsToDeactivate = await AgencyDomain.find(domainFilter)
        .select("_id hostname")
        .lean();

      if (domainsToDeactivate.length > 0) {
        await AgencyDomain.updateMany(
          { _id: { $in: domainsToDeactivate.map((d) => d._id) } },
          { $set: { isActive: false, isPrimary: false } },
        );
        for (const d of domainsToDeactivate) {
          invalidateDomainCache(d.hostname);
        }
      }

      if (existingUser.customDomain) {
        invalidateDomainCache(existingUser.customDomain);
      }
    }

    if (agencyName !== undefined) {
      const agencyDomains = await AgencyDomain.find({
        agencyId: updateObjectId,
      })
        .select("hostname")
        .lean();
      for (const d of agencyDomains) {
        invalidateDomainCache(d.hostname);
      }
    }

    return jsonResponse(updatedUser);
  } catch (error: any) {
    console.error("PATCH /api/website-management error:", error);
    return errorResponse(error.message || "Failed to update website domain settings", 500);
  }
}
