import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Property, IPropertyDocument, PropertyCategory, TransactionType, PropertyStatus } from "@/models/Property";
import { Owner } from "@/models/Owner";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { MasterOption } from "@/models/MasterOption";

export interface SsrPropertyItem {
  _id: string;
  adminId: string;
  propertyId: string;
  title: string;
  propertyCategory: PropertyCategory;
  propertyType: string;
  transactionType: TransactionType;
  listingType: string;
  status: PropertyStatus;
  owner: {
    _id: string;
    name: string;
    mobile: string;
  };
  project?: {
    _id: string;
    name: string;
  } | null;
  pricing: {
    price?: number;
    monthlyRent?: number;
    securityDeposit?: number;
    pricePerUnitArea?: number;
  };
  areaDetails: {
    carpetArea?: number;
    builtUpArea?: number;
    plotArea?: number;
    areaUnit: string;
  };
  location: {
    city: string;
    address: string;
    landmark?: string;
  };
  investmentSpecs?: {
    expectedAnnualRent?: number;
    grossYieldPercent?: number;
    tenantCompany?: string;
  };
  publishing: {
    publishOnWebsite: boolean;
    featuredProperty: boolean;
    slug?: string;
    unpublishReason?: string;
  };
  media?: {
    featuredImage?: string;
    images?: string[];
  };
  amenities?: string[];
  furnishing?: string;
  bedrooms?: number;
  bathrooms?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetSsrPropertiesParams {
  userId: string;
  roleSlug: string;
  adminFilter?: string;
  search?: string;
  category?: string;
  transactionType?: string;
  status?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  ownerId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

/**
 * Calculates investment metrics (Annual Rent, Gross Yield %)
 */
export function calculateInvestmentRoi(monthlyRent: number, totalPurchasePrice: number) {
  if (!monthlyRent || !totalPurchasePrice || totalPurchasePrice <= 0) {
    return { expectedAnnualRent: 0, grossYieldPercent: 0 };
  }
  const expectedAnnualRent = monthlyRent * 12;
  const grossYieldPercent = Number(((expectedAnnualRent / totalPurchasePrice) * 100).toFixed(2));
  return { expectedAnnualRent, grossYieldPercent };
}

/**
 * Checks if a status triggers auto-unpublish based on Master Settings dictionary
 */
export async function shouldAutoUnpublishStatus(statusValue: string): Promise<boolean> {
  const masterStatus = await MasterOption.findOne({
    category: "property_statuses",
    value: statusValue.toLowerCase(),
  }).lean();

  if (masterStatus?.metadata?.isUnpublishTrigger === true) {
    return true;
  }
  const hardcodedUnpublish = ["sold", "rented", "leased", "blocked", "archived"];
  return hardcodedUnpublish.includes(statusValue.toLowerCase());
}

/**
 * Server-Side Render (SSR) Data Loader for Properties Inventory.
 * Pre-renders complete multi-category inventory with populated owner & project links.
 */
export async function getSsrProperties({
  userId,
  roleSlug,
  adminFilter,
  search,
  category,
  transactionType,
  status,
  city,
  startDate,
  endDate,
  minPrice,
  maxPrice,
  bedrooms,
  ownerId,
  projectId,
  page = 1,
  limit = 20,
}: GetSsrPropertiesParams) {
  await connectToDatabase();

  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  const query: any = {};

  if (isSuperAdmin) {
    if (adminFilter) {
      query.adminId = new mongoose.Types.ObjectId(adminFilter);
    }
  } else if (isAdmin) {
    query.adminId = new mongoose.Types.ObjectId(userId);
  } else {
    // Sub-roles
    const currentUser = await User.findById(userId).lean();
    if (currentUser?.parentAdminId) {
      const parentId =
        typeof currentUser.parentAdminId === "object" && "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      query.adminId = new mongoose.Types.ObjectId(String(parentId));
    } else {
      query.createdById = new mongoose.Types.ObjectId(userId);
    }
  }

  if (category && category !== "ALL") query.propertyCategory = category;
  if (transactionType && transactionType !== "ALL") query.transactionType = transactionType;
  if (status && status !== "ALL") query.status = status;
  if (city && city !== "ALL") query["location.city"] = new RegExp(`^${city}$`, "i");
  if (ownerId) query.ownerId = new mongoose.Types.ObjectId(ownerId);
  if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
  if (bedrooms) query["residentialSpecs.bedrooms"] = bedrooms;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      if (endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      query.createdAt.$lte = end;
    }
  }

  if (minPrice || maxPrice) {
    const priceQuery: any = {};
    if (minPrice) priceQuery.$gte = minPrice;
    if (maxPrice) priceQuery.$lte = maxPrice;
    query.$or = [
      { "pricing.price": priceQuery },
      { "pricing.monthlyRent": priceQuery },
    ];
  }

  if (search) {
    const s = search.trim();
    query.$or = [
      { title: { $regex: s, $options: "i" } },
      { propertyId: { $regex: s, $options: "i" } },
      { "location.city": { $regex: s, $options: "i" } },
      { "location.address": { $regex: s, $options: "i" } },
      { propertyType: { $regex: s, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, docs] = await Promise.all([
    Property.countDocuments(query),
    Property.find(query)
      .populate("ownerId", "name mobile")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const properties: SsrPropertyItem[] = docs.map((doc: any) => ({
    _id: doc._id.toString(),
    adminId: doc.adminId.toString(),
    propertyId: doc.propertyId,
    title: doc.title,
    propertyCategory: doc.propertyCategory,
    propertyType: doc.propertyType,
    transactionType: doc.transactionType,
    listingType: doc.listingType || "Direct",
    status: doc.status,
    owner: {
      _id: doc.ownerId?._id ? doc.ownerId._id.toString() : "",
      name: doc.ownerId?.name || "Unassigned Owner",
      mobile: doc.ownerId?.mobile || "",
    },
    project: doc.projectId
      ? { _id: doc.projectId._id.toString(), name: doc.projectId.name }
      : null,
    pricing: doc.pricing || {},
    areaDetails: doc.areaDetails || { areaUnit: "Sq. Ft." },
    location: doc.location || { city: "", address: "" },
    investmentSpecs: doc.investmentSpecs,
    publishing: {
      publishOnWebsite: Boolean(doc.publishing?.publishOnWebsite),
      featuredProperty: Boolean(doc.publishing?.featuredProperty),
      slug: doc.publishing?.seo?.slug || doc.propertyId?.toLowerCase(),
      unpublishReason: doc.publishing?.unpublishReason,
    },
    media: {
      featuredImage: doc.media?.featuredImage || "",
      images: Array.isArray(doc.media?.images) ? doc.media.images : [],
    },
    amenities: Array.isArray(doc.amenities) ? doc.amenities : [],
    furnishing: doc.residentialSpecs?.furnishing || "Unfurnished",
    bedrooms: doc.residentialSpecs?.bedrooms || 0,
    bathrooms: doc.residentialSpecs?.bathrooms || 0,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
  }));

  return {
    properties,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lead-to-Property Match Algorithm:
 * Evaluates client requirement criteria against active Available properties.
 */
export async function matchPropertiesForClient(requirement: any) {
  await connectToDatabase();

  const query: any = {
    adminId: requirement.adminId,
    status: "Available",
  };

  if (requirement.transactionType) {
    query.transactionType = requirement.transactionType === "Buy" ? "Sale" : requirement.transactionType;
  }

  if (Array.isArray(requirement.propertyCategories) && requirement.propertyCategories.length > 0) {
    query.propertyCategory = { $in: requirement.propertyCategories };
  }

  if (Array.isArray(requirement.propertyTypes) && requirement.propertyTypes.length > 0) {
    query.propertyType = { $in: requirement.propertyTypes };
  }

  if (requirement.maxBudget) {
    const budgetField = query.transactionType === "Sale" ? "pricing.price" : "pricing.monthlyRent";
    query[budgetField] = {
      $lte: requirement.maxBudget,
      ...(requirement.minBudget ? { $gte: requirement.minBudget } : {}),
    };
  }

  if (requirement.minBedrooms) {
    query["residentialSpecs.bedrooms"] = { $gte: requirement.minBedrooms };
  }

  return Property.find(query)
    .populate("ownerId", "name mobile")
    .sort({ "pricing.price": 1, "pricing.monthlyRent": 1 })
    .limit(25)
    .lean();
}

