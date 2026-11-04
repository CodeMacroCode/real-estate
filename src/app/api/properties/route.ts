import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Property } from "@/models/Property";
import { Owner } from "@/models/Owner";
import { User } from "@/models/User";
import { jsonResponse, errorResponse } from "@/lib/apiResponse";
import { recordAuditEvent } from "@/services/auditService";
import { getSsrProperties, calculateInvestmentRoi, shouldAutoUnpublishStatus } from "@/services/propertyService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const transactionType = searchParams.get("transactionType") || undefined;
    const status = searchParams.get("status") || undefined;
    const city = searchParams.get("city") || undefined;
    const ownerId = searchParams.get("ownerId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSsrProperties({
      userId: authContext.user._id,
      roleSlug: authContext.role.slug,
      search,
      category,
      transactionType,
      status,
      city,
      ownerId,
      projectId,
      page,
      limit,
    });

    return jsonResponse(result.properties, 200, result.pagination);
  } catch (error: any) {
    console.error("GET /api/properties error:", error);
    return errorResponse(error.message || "Failed to retrieve properties", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse("Unauthorized", 401);
    }

    await connectToDatabase();

    const isSuperAdmin = authContext.role.slug === "super_admin";
    const isAdmin = authContext.role.slug === "admin";

    // Target Admin resolution
    let targetAdminId: mongoose.Types.ObjectId;
    if (isSuperAdmin) {
      const body = await req.clone().json();
      if (!body.adminId) {
        return errorResponse("adminId is required when creating a property as Super Admin", 400);
      }
      targetAdminId = new mongoose.Types.ObjectId(body.adminId);
    } else if (isAdmin) {
      targetAdminId = new mongoose.Types.ObjectId(authContext.user._id);
    } else {
      const currentUser = await User.findById(authContext.user._id).lean();
      if (!currentUser?.parentAdminId) {
        return errorResponse("User must belong to an organization admin", 403);
      }
      const parentId =
        typeof currentUser.parentAdminId === "object" && "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      targetAdminId = new mongoose.Types.ObjectId(String(parentId));
    }

    const body = await req.json();
    const {
      title,
      propertyCategory,
      propertyType,
      transactionType,
      listingType,
      status,
      ownerId,
      projectId,
      unitId,
      pricing,
      areaDetails,
      location,
      residentialSpecs,
      commercialSpecs,
      plotSpecs,
      investmentSpecs,
      amenities,
      media,
      publishing,
    } = body;

    // Enforce mandatory fields
    if (!title?.trim() || !propertyCategory || !propertyType || !transactionType || !location?.city?.trim()) {
      return errorResponse("Title, category, propertyType, transactionType, and city are mandatory", 400);
    }

    const resolvedAddress = (location.address && location.address.trim()) || `${location.city.trim()} Central`;

    // MANDATORY OWNER LINKAGE
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return errorResponse("Valid ownerId is mandatory for every property record", 400);
    }

    const ownerExists = await Owner.findById(ownerId);
    if (!ownerExists) {
      return errorResponse("Linked Owner does not exist", 404);
    }

    // Auto-generate Property ID
    const count = await Property.countDocuments({ adminId: targetAdminId });
    const year = new Date().getFullYear();
    const propertyId = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;

    // Auto-calculate Pre-Leased Investment ROI if applicable
    let finalInvestmentSpecs = investmentSpecs;
    if (propertyCategory === "Special Investment" || propertyType === "pre_leased_commercial") {
      const monthly = pricing?.monthlyRent || investmentSpecs?.currentMonthlyRent || 0;
      const totalVal = pricing?.price || 0;
      const calculated = calculateInvestmentRoi(monthly, totalVal);
      finalInvestmentSpecs = {
        ...investmentSpecs,
        currentMonthlyRent: monthly,
        expectedAnnualRent: calculated.expectedAnnualRent,
        grossYieldPercent: calculated.grossYieldPercent,
      };
    }

    // Check auto-unpublish rules on initial status
    let finalPublish = Boolean(publishing?.publishOnWebsite);
    let finalUnpublishReason = publishing?.unpublishReason;

    if (finalPublish && (await shouldAutoUnpublishStatus(status || "Available"))) {
      finalPublish = false;
      finalUnpublishReason = `Status '${status}' triggered automatic website unpublish`;
    }

    // Normalize residentialSpecs furnishing if provided
    let finalResidentialSpecs = residentialSpecs;
    if (finalResidentialSpecs?.furnishing) {
      const f = finalResidentialSpecs.furnishing.trim();
      let normalizedFurnishing = f;
      if (/^fully[\s-_]?furnished$/i.test(f)) {
        normalizedFurnishing = "Fully-Furnished";
      } else if (/^semi[\s-_]?furnished$/i.test(f)) {
        normalizedFurnishing = "Semi-Furnished";
      } else if (/^unfurnished$/i.test(f)) {
        normalizedFurnishing = "Unfurnished";
      }
      finalResidentialSpecs = {
        ...finalResidentialSpecs,
        furnishing: normalizedFurnishing,
      };
    }

    const newProperty = await Property.create({
      adminId: targetAdminId,
      propertyId,
      title: title.trim(),
      propertyCategory,
      propertyType: propertyType.trim(),
      transactionType,
      listingType: listingType || "Direct",
      status: status || "Available",
      ownerId: new mongoose.Types.ObjectId(ownerId),
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
      unitId: unitId ? new mongoose.Types.ObjectId(unitId) : undefined,
      pricing: pricing || {},
      areaDetails: areaDetails || { areaUnit: "Sq. Ft." },
      location: {
        address: resolvedAddress,
        city: location.city.trim(),
        landmark: location.landmark || "",
        state: location.state || "",
        pincode: location.pincode || "",
        lat: location.lat,
        lng: location.lng,
      },
      residentialSpecs: finalResidentialSpecs || undefined,
      commercialSpecs: commercialSpecs || undefined,
      plotSpecs: plotSpecs || undefined,
      investmentSpecs: finalInvestmentSpecs || undefined,
      amenities: Array.isArray(amenities) ? amenities : [],
      media: media || { images: [], videos: [], floorPlans: [] },
      publishing: {
        publishOnWebsite: finalPublish,
        featuredProperty: Boolean(publishing?.featuredProperty),
        publishedAt: finalPublish ? new Date() : undefined,
        unpublishReason: finalUnpublishReason,
        seo: {
          slug: title.toLowerCase().replace(/[\s-]+/g, "_").slice(0, 60),
        },
      },
      createdById: new mongoose.Types.ObjectId(authContext.user._id),
    });

    // Update Owner totalPropertiesOwned count
    const ownerPropCount = await Property.countDocuments({ ownerId: ownerExists._id });
    await Owner.findByIdAndUpdate(ownerExists._id, { totalPropertiesOwned: ownerPropCount });

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        parentAdminId: targetAdminId.toString(),
      },
      action: "create",
      entity: "Property",
      entityId: newProperty._id.toString(),
      newValues: { propertyId, title, propertyCategory, status },
      source: "api",
    });

    return jsonResponse(newProperty, 201);
  } catch (error: any) {
    console.error("POST /api/properties error:", error);
    return errorResponse(error.message || "Failed to create property", 500);
  }
}

