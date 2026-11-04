import { connectToDatabase } from "@/lib/mongodb/db";
import { Property, IPropertyDocument } from "@/models/Property";
import { Project, IProjectDocument } from "@/models/Project";
import { ProjectUnit } from "@/models/ProjectUnit";
import { FilterQuery } from "mongoose";

export interface PublicPropertyFilterParams {
  adminId?: string;
  category?: string;
  propertyType?: string;
  transactionType?: string;
  city?: string;
  bedrooms?: number | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  featured?: boolean | string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sort?: string;
}

export interface SanitizedPublicProperty {
  id: string;
  propertyId: string;
  title: string;
  slug: string;
  propertyCategory: string;
  propertyType: string;
  transactionType: string;
  pricing: {
    price?: number;
    pricePerUnitArea?: number;
    isNegotiable: boolean;
    monthlyRent?: number;
    securityDeposit?: number;
    maintenanceCharges?: number;
  };
  areaDetails: {
    carpetArea?: number;
    builtUpArea?: number;
    superBuiltUpArea?: number;
    plotArea?: number;
    areaUnit: string;
  };
  location: {
    address: string;
    landmark?: string;
    city: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  residentialSpecs?: {
    bedrooms: number;
    bathrooms: number;
    balconies?: number;
    furnishing: string;
    facing?: string;
    floorNumber?: number;
    totalFloors?: number;
    parking?: string;
    ageOfProperty?: string;
    possessionStatus?: string;
  };
  commercialSpecs?: {
    ceilingHeight?: number;
    powerLoad?: string;
    washrooms?: number;
    lockInPeriodMonths?: number;
  };
  plotSpecs?: {
    roadWidth?: number;
    cornerPlot?: boolean;
    gatedLayout?: boolean;
    naStatus?: string;
  };
  investmentSpecs?: {
    currentMonthlyRent?: number;
    expectedAnnualRent?: number;
    grossYieldPercent?: number;
    lockInPeriodMonths?: number;
  };
  amenities: string[];
  media: {
    featuredImage?: string;
    images: string[];
    videos?: string[];
    floorPlans?: string[];
  };
  featuredProperty: boolean;
  publishedAt?: string;
  project?: {
    id: string;
    name: string;
    developerName: string;
    reraNumber?: string;
  } | null;
  agency?: {
    adminId: string;
    agencySlug: string;
    agencyName: string;
  } | null;
  createdAt: string;
}

export interface SanitizedPublicProject {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  developerName: string;
  projectType: string;
  location: {
    address: string;
    city: string;
    landmark?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  reraNumber?: string;
  constructionStatus: string;
  launchDate?: string;
  possessionDate?: string;
  amenities: string[];
  description?: string;
  media: {
    coverImage?: string;
    images: string[];
    videos?: string[];
    brochureUrl?: string;
    masterPlanUrl?: string;
    floorPlans?: Array<{ title: string; imageUrl: string }>;
  };
  totalUnits: number;
  availableUnits: number;
  featuredOnWebsite: boolean;
  agency?: {
    adminId: string;
    agencySlug: string;
    agencyName: string;
  } | null;
  createdAt: string;
}

/**
 * Sanitizes an internal Property document into a safe, public-facing representation.
 * STRICT SECURITY GOVERNANCE:
 * Excludes owner personal identity (name, phone, WhatsApp, email, PAN, KYC docs),
 * internal ownerId, assignedEmployeeId, internal commission/brokerage terms, and internal notes.
 */
export function sanitizePublicProperty(doc: any): SanitizedPublicProperty {
  const property = doc.toObject ? doc.toObject() : doc;

  return {
    id: property._id.toString(),
    propertyId: property.propertyId,
    title: property.title,
    slug: property.publishing?.seo?.slug || property.propertyId.toLowerCase(),
    propertyCategory: property.propertyCategory,
    propertyType: property.propertyType,
    transactionType: property.transactionType,
    pricing: {
      price: property.pricing?.price,
      pricePerUnitArea: property.pricing?.pricePerUnitArea,
      isNegotiable: Boolean(property.pricing?.isNegotiable),
      monthlyRent: property.pricing?.monthlyRent,
      securityDeposit: property.pricing?.securityDeposit,
      maintenanceCharges: property.pricing?.maintenanceCharges,
    },
    areaDetails: {
      carpetArea: property.areaDetails?.carpetArea,
      builtUpArea: property.areaDetails?.builtUpArea,
      superBuiltUpArea: property.areaDetails?.superBuiltUpArea,
      plotArea: property.areaDetails?.plotArea,
      areaUnit: property.areaDetails?.areaUnit || "Sq. Ft.",
    },
    location: {
      address: property.location?.address || "",
      landmark: property.location?.landmark,
      city: property.location?.city || "",
      state: property.location?.state,
      pincode: property.location?.pincode,
      lat: property.location?.lat,
      lng: property.location?.lng,
    },
    residentialSpecs: property.residentialSpecs
      ? {
          bedrooms: property.residentialSpecs.bedrooms,
          bathrooms: property.residentialSpecs.bathrooms,
          balconies: property.residentialSpecs.balconies,
          furnishing: property.residentialSpecs.furnishing,
          facing: property.residentialSpecs.facing,
          floorNumber: property.residentialSpecs.floorNumber,
          totalFloors: property.residentialSpecs.totalFloors,
          parking: property.residentialSpecs.parking,
          ageOfProperty: property.residentialSpecs.ageOfProperty,
          possessionStatus: property.residentialSpecs.possessionStatus,
        }
      : undefined,
    commercialSpecs: property.commercialSpecs
      ? {
          ceilingHeight: property.commercialSpecs.ceilingHeight,
          powerLoad: property.commercialSpecs.powerLoad,
          washrooms: property.commercialSpecs.washrooms,
          lockInPeriodMonths: property.commercialSpecs.lockInPeriodMonths,
        }
      : undefined,
    plotSpecs: property.plotSpecs
      ? {
          roadWidth: property.plotSpecs.roadWidth,
          cornerPlot: property.plotSpecs.cornerPlot,
          gatedLayout: property.plotSpecs.gatedLayout,
          naStatus: property.plotSpecs.naStatus,
        }
      : undefined,
    investmentSpecs: property.investmentSpecs
      ? {
          currentMonthlyRent: property.investmentSpecs.currentMonthlyRent,
          expectedAnnualRent: property.investmentSpecs.expectedAnnualRent,
          grossYieldPercent: property.investmentSpecs.grossYieldPercent,
          lockInPeriodMonths: property.investmentSpecs.lockInPeriodMonths,
        }
      : undefined,
    amenities: property.amenities || [],
    media: {
      featuredImage:
        property.media?.featuredImage || property.media?.images?.[0] || "",
      images: property.media?.images || [],
      videos: property.media?.videos || [],
      floorPlans: property.media?.floorPlans || [],
    },
    featuredProperty: Boolean(property.publishing?.featuredProperty),
    publishedAt: property.publishing?.publishedAt
      ? new Date(property.publishing.publishedAt).toISOString()
      : undefined,
    project: property.projectId
      ? {
          id: property.projectId._id
            ? property.projectId._id.toString()
            : property.projectId.toString(),
          name: property.projectId.name || "Linked Project",
          developerName: property.projectId.developerName || "",
          reraNumber: property.projectId.reraNumber,
        }
      : null,
    agency: property.adminId && typeof property.adminId === "object"
      ? {
          adminId: property.adminId._id ? property.adminId._id.toString() : property.adminId.toString(),
          agencySlug: property.adminId.agencySlug || "",
          agencyName: property.adminId.agencyName || property.adminId.name || "",
        }
      : property.adminId
      ? {
          adminId: property.adminId.toString(),
          agencySlug: "",
          agencyName: "",
        }
      : null,
    createdAt: property.createdAt
      ? new Date(property.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Sanitizes an internal Project document for public consumption.
 */
export function sanitizePublicProject(doc: any): SanitizedPublicProject {
  const project = doc.toObject ? doc.toObject() : doc;

  return {
    id: project._id.toString(),
    projectId: project.projectId,
    name: project.name,
    slug: project.seo?.slug || project.projectId.toLowerCase(),
    developerName: project.developerName,
    projectType: project.projectType,
    location: {
      address: project.location?.address || "",
      city: project.location?.city || "",
      landmark: project.location?.landmark,
      pincode: project.location?.pincode,
      lat: project.location?.lat,
      lng: project.location?.lng,
    },
    reraNumber: project.reraNumber,
    constructionStatus: project.constructionStatus,
    launchDate: project.launchDate
      ? new Date(project.launchDate).toISOString()
      : undefined,
    possessionDate: project.possessionDate
      ? new Date(project.possessionDate).toISOString()
      : undefined,
    amenities: project.amenities || [],
    description: project.description,
    media: {
      coverImage: project.media?.coverImage,
      images: project.media?.images || [],
      videos: project.media?.videos || [],
      brochureUrl: project.media?.brochureUrl,
      masterPlanUrl: project.media?.masterPlanUrl,
      floorPlans: project.media?.floorPlans || [],
    },
    totalUnits: project.totalUnits || 0,
    availableUnits: project.availableUnits || 0,
    featuredOnWebsite: Boolean(project.featuredOnWebsite),
    agency: project.adminId && typeof project.adminId === "object"
      ? {
          adminId: project.adminId._id ? project.adminId._id.toString() : project.adminId.toString(),
          agencySlug: project.adminId.agencySlug || "",
          agencyName: project.adminId.agencyName || project.adminId.name || "",
        }
      : project.adminId
      ? {
          adminId: project.adminId.toString(),
          agencySlug: "",
          agencyName: "",
        }
      : null,
    createdAt: project.createdAt
      ? new Date(project.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * SSR Service: Retrieves sanitized public properties matching web search filters.
 * STRICT FILTER: Only returns properties where `publishing.publishOnWebsite === true` AND `status === 'Available'`.
 */
export async function getPublicProperties(
  params: PublicPropertyFilterParams = {},
) {
  await connectToDatabase();

  const query: FilterQuery<IPropertyDocument> = {
    "publishing.publishOnWebsite": true,
    status: "Available",
  };

  if (params.adminId) {
    query.adminId = params.adminId;
  }
  if (params.category) {
    query.propertyCategory = params.category;
  }
  if (params.propertyType) {
    query.propertyType = params.propertyType;
  }
  if (params.transactionType) {
    query.transactionType = params.transactionType;
  }
  if (params.city) {
    query["location.city"] = { $regex: new RegExp(`^${params.city}$`, "i") };
  }
  if (params.bedrooms !== undefined && params.bedrooms !== "") {
    query["residentialSpecs.bedrooms"] = Number(params.bedrooms);
  }
  if (params.featured === true || params.featured === "true") {
    query["publishing.featuredProperty"] = true;
  }

  // Price range filters
  if (params.minPrice || params.maxPrice) {
    const min = params.minPrice ? Number(params.minPrice) : 0;
    const max = params.maxPrice
      ? Number(params.maxPrice)
      : Number.MAX_SAFE_INTEGER;

    if (params.transactionType === "Rent") {
      query["pricing.monthlyRent"] = { $gte: min, $lte: max };
    } else {
      query["pricing.price"] = { $gte: min, $lte: max };
    }
  }

  // Text search on title, address, landmark, city
  if (params.search) {
    const s = params.search.trim();
    query.$or = [
      { title: { $regex: s, $options: "i" } },
      { "location.address": { $regex: s, $options: "i" } },
      { "location.landmark": { $regex: s, $options: "i" } },
      { "location.city": { $regex: s, $options: "i" } },
      { propertyType: { $regex: s, $options: "i" } },
    ];
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const skip = (page - 1) * limit;

  // Sorting
  let sortOption: any = { "publishing.featuredProperty": -1, createdAt: -1 };
  if (params.sort === "price_asc") {
    sortOption = { "pricing.price": 1, "pricing.monthlyRent": 1 };
  } else if (params.sort === "price_desc") {
    sortOption = { "pricing.price": -1, "pricing.monthlyRent": -1 };
  } else if (params.sort === "newest") {
    sortOption = { createdAt: -1 };
  }

  const [docs, total] = await Promise.all([
    Property.find(query)
      .populate("projectId", "name developerName reraNumber")
      .populate("adminId", "name agencySlug agencyName")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(query),
  ]);

  const sanitized = docs.map((doc) => sanitizePublicProperty(doc));

  return {
    properties: sanitized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * SSR Service: Retrieves a single sanitized public property by URL slug or ID.
 */
export async function getPublicPropertyBySlug(
  slugOrId: string,
  adminId?: string,
) {
  await connectToDatabase();

  const query: FilterQuery<IPropertyDocument> = {
    "publishing.publishOnWebsite": true,
    status: "Available",
    $or: [{ "publishing.seo.slug": slugOrId }, { propertyId: slugOrId }],
  };

  if (/^[0-9a-fA-F]{24}$/.test(slugOrId) && query.$or) {
    query.$or.push({ _id: slugOrId as any });
  }

  if (adminId) {
    query.adminId = adminId;
  }

  // Ensure User model is loaded for adminId population
  await import("@/models/User");

  const doc = await Property.findOne(query)
    .populate("projectId", "name developerName reraNumber")
    .populate("adminId", "name agencySlug agencyName")
    .lean();

  if (!doc) {
    return null;
  }

  return sanitizePublicProperty(doc);
}

/**
 * SSR Service: Retrieves sanitized public projects matching web search filters.
 */
export async function getPublicProjects(
  params: {
    adminId?: string;
    projectType?: string;
    city?: string;
    featured?: boolean | string;
    page?: number | string;
    limit?: number | string;
  } = {},
) {
  await connectToDatabase();
  await import("@/models/User");

  const query: FilterQuery<IProjectDocument> = {
    isPublishedOnWebsite: true,
  };

  if (params.adminId) {
    query.adminId = params.adminId;
  }
  if (params.projectType) {
    query.projectType = params.projectType as any;
  }
  if (params.city) {
    query["location.city"] = { $regex: new RegExp(`^${params.city}$`, "i") };
  }
  if (params.featured === true || params.featured === "true") {
    query.featuredOnWebsite = true;
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Project.find(query)
      .populate("adminId", "name agencySlug agencyName")
      .sort({ featuredOnWebsite: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(query),
  ]);

  const sanitized = docs.map((doc) => sanitizePublicProject(doc));

  return {
    projects: sanitized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * SSR Service: Retrieves a single sanitized public project by slug or ID.
 */
export async function getPublicProjectBySlug(
  slugOrId: string,
  adminId?: string,
) {
  await connectToDatabase();
  await import("@/models/User");

  const query: FilterQuery<IProjectDocument> = {
    isPublishedOnWebsite: true,
    $or: [{ "seo.slug": slugOrId }, { projectId: slugOrId }],
  };

  if (/^[0-9a-fA-F]{24}$/.test(slugOrId) && query.$or) {
    query.$or.push({ _id: slugOrId as any });
  }

  if (adminId) {
    query.adminId = adminId;
  }

  const doc = await Project.findOne(query)
    .populate("adminId", "name agencySlug agencyName")
    .lean();

  if (!doc) {
    return null;
  }

  return sanitizePublicProject(doc);
}

/**
 * Resolves an Admin tenant identity from host header or agency slug.
 * Matches:
 *  1. Custom domain (e.g. "apexrealty.com" or "properties.apexrealty.in")
 *  2. Subdomain (e.g. "apex.localhost:3000" or "apex.yourportal.com")
 *  3. Explicit agency slug / code
 */
export async function resolveAdminByHostOrSlug(
  hostOrSlug: string,
): Promise<{ adminId: string; agencyName: string; agencySlug: string; customDomain?: string } | null> {
  if (!hostOrSlug) return null;
  await connectToDatabase();
  const { User } = await import("@/models/User");

  const cleanHost = hostOrSlug.split(":")[0].toLowerCase().trim();

  // 1. Direct custom domain match
  const byCustomDomain = await User.findOne({
    customDomain: cleanHost,
    status: "active",
  })
    .select("_id name agencyName agencySlug customDomain")
    .lean();

  if (byCustomDomain) {
    return {
      adminId: byCustomDomain._id.toString(),
      agencyName: byCustomDomain.agencyName || byCustomDomain.name,
      agencySlug: byCustomDomain.agencySlug || "",
      customDomain: byCustomDomain.customDomain,
    };
  }

  // 2. Subdomain check (e.g. "apex.localhost" or "apex.portal.com")
  const parts = cleanHost.split(".");
  if (parts.length > 1) {
    const candidateSubdomain = parts[0];
    if (candidateSubdomain && candidateSubdomain !== "www" && candidateSubdomain !== "localhost") {
      const bySubdomain = await User.findOne({
        agencySlug: candidateSubdomain,
        status: "active",
      })
        .select("_id name agencyName agencySlug customDomain")
        .lean();

      if (bySubdomain) {
        return {
          adminId: bySubdomain._id.toString(),
          agencyName: bySubdomain.agencyName || bySubdomain.name,
          agencySlug: bySubdomain.agencySlug || candidateSubdomain,
          customDomain: bySubdomain.customDomain,
        };
      }
    }
  }

  // 3. Fallback direct agency slug match
  const bySlug = await User.findOne({
    agencySlug: cleanHost,
    status: "active",
  })
    .select("_id name agencyName agencySlug customDomain")
    .lean();

  if (bySlug) {
    return {
      adminId: bySlug._id.toString(),
      agencyName: bySlug.agencyName || bySlug.name,
      agencySlug: bySlug.agencySlug || cleanHost,
      customDomain: bySlug.customDomain,
    };
  }

  return null;
}

