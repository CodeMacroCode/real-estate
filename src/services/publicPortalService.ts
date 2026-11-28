import { connectToDatabase } from "@/lib/mongodb/db";
import { Property, IPropertyDocument } from "@/models/Property";
import { Project, IProjectDocument } from "@/models/Project";
import { ProjectUnit } from "@/models/ProjectUnit";
import { WebsiteSetting, IWebsiteSeoSettings } from "@/models/WebsiteSetting";
import { resolveTenantByHostname } from "@/services/domainService";
import { normalizeHostname } from "@/lib/domains/normalize";
import mongoose, { FilterQuery } from "mongoose";

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
    googleMapsEmbedUrl?: string;
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
    floorPlanMaps?: Array<{
      floorName: string;
      floorNumber?: number;
      planImageUrl: string;
      hotspots?: Array<{
        id?: string;
        xPercent: number;
        yPercent: number;
        title: string;
        subtitle?: string;
        category?: string;
      }>;
    }>;
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
    phone?: string;
    email?: string;
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
    googleMapsEmbedUrl?: string;
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
  carpetArea?: number;
  featuredOnWebsite: boolean;
  agency?: {
    adminId: string;
    agencySlug: string;
    agencyName: string;
    phone?: string;
    email?: string;
  } | null;
  createdAt: string;
}

export function resolveUserPublicSlug(admin: any): string {
  if (!admin || typeof admin !== "object") return "";
  if (
    admin.agencySlug &&
    typeof admin.agencySlug === "string" &&
    admin.agencySlug.trim()
  ) {
    return admin.agencySlug.trim();
  }
  if (
    admin.username &&
    typeof admin.username === "string" &&
    admin.username.trim()
  ) {
    return admin.username.trim();
  }
  const baseName = admin.agencyName || admin.name || "";
  if (typeof baseName === "string" && baseName.trim()) {
    return baseName.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  return "";
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
      googleMapsEmbedUrl: property.location?.googleMapsEmbedUrl,
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
      floorPlanMaps: (property.media?.floorPlanMaps || []).map((fpm: any) => ({
        floorName: fpm.floorName || "Floor Plan",
        floorNumber: fpm.floorNumber,
        planImageUrl: fpm.planImageUrl,
        hotspots: (fpm.hotspots || []).map((h: any) => ({
          id: h.id || String(Math.random()),
          xPercent: Number(h.xPercent) || 0,
          yPercent: Number(h.yPercent) || 0,
          title: h.title || "",
          subtitle: h.subtitle || "",
          category: h.category || "",
        })),
      })),
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
          agencySlug: resolveUserPublicSlug(property.adminId),
          agencyName: property.adminId.agencyName || property.adminId.name || "",
          phone: property.adminId.mobile || "",
          email: property.adminId.email || "",
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
      googleMapsEmbedUrl: project.location?.googleMapsEmbedUrl,
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
    carpetArea: project.carpetArea ? Number(project.carpetArea) : undefined,
    featuredOnWebsite: Boolean(project.featuredOnWebsite),
    agency: project.adminId && typeof project.adminId === "object"
      ? {
          adminId: project.adminId._id ? project.adminId._id.toString() : project.adminId.toString(),
          agencySlug: resolveUserPublicSlug(project.adminId),
          agencyName: project.adminId.agencyName || project.adminId.name || "",
          phone: project.adminId.mobile || "",
          email: project.adminId.email || "",
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
      .populate("adminId", "name username agencySlug agencyName mobile email")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(query),
  ]);

  // Enrich with official company/branding name from WebsiteSetting if available
  const adminIds = Array.from(
    new Set(
      docs
        .map((d: any) => d.adminId?._id?.toString() || d.adminId?.toString())
        .filter(Boolean),
    ),
  );
  if (adminIds.length > 0) {
    const settings = await WebsiteSetting.find({ adminId: { $in: adminIds } })
      .select("adminId branding.companyName contact.phone contact.email")
      .lean();
    const settingsMap = new Map(
      settings.map((s: any) => [s.adminId.toString(), s]),
    );
    for (const d of docs as any[]) {
      const aId = d.adminId?._id?.toString() || d.adminId?.toString();
      const s = settingsMap.get(aId);
      if (s?.branding?.companyName && d.adminId && typeof d.adminId === "object") {
        d.adminId.agencyName = s.branding.companyName;
      }
      if (s?.contact?.phone && d.adminId && typeof d.adminId === "object") {
        d.adminId.mobile = s.contact.phone;
      }
      if (s?.contact?.email && d.adminId && typeof d.adminId === "object") {
        d.adminId.email = s.contact.email;
      }
    }
  }

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

  if (adminId !== undefined && adminId !== "") {
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return null;
    }
    query.adminId = new mongoose.Types.ObjectId(adminId);
  }

  // Ensure User model is loaded for adminId population
  await import("@/models/User");

  const doc = await Property.findOne(query)
    .populate("projectId", "name developerName reraNumber")
    .populate("adminId", "name username agencySlug agencyName mobile email")
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
      .populate("adminId", "name username agencySlug agencyName mobile email")
      .sort({ featuredOnWebsite: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(query),
  ]);

  // Enrich with official company/branding name from WebsiteSetting if available
  const adminIds = Array.from(
    new Set(
      docs
        .map((d: any) => d.adminId?._id?.toString() || d.adminId?.toString())
        .filter(Boolean),
    ),
  );
  if (adminIds.length > 0) {
    const settings = await WebsiteSetting.find({ adminId: { $in: adminIds } })
      .select("adminId branding.companyName contact.phone contact.email")
      .lean();
    const settingsMap = new Map(
      settings.map((s: any) => [s.adminId.toString(), s]),
    );
    for (const d of docs as any[]) {
      const aId = d.adminId?._id?.toString() || d.adminId?.toString();
      const s = settingsMap.get(aId);
      if (s?.branding?.companyName && d.adminId && typeof d.adminId === "object") {
        d.adminId.agencyName = s.branding.companyName;
      }
      if (s?.contact?.phone && d.adminId && typeof d.adminId === "object") {
        d.adminId.mobile = s.contact.phone;
      }
      if (s?.contact?.email && d.adminId && typeof d.adminId === "object") {
        d.adminId.email = s.contact.email;
      }
    }
  }

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

  if (adminId !== undefined && adminId !== "") {
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return null;
    }
    query.adminId = new mongoose.Types.ObjectId(adminId);
  }

  const doc = await Project.findOne(query)
    .populate("adminId", "name username agencySlug agencyName mobile email")
    .lean();

  if (!doc) {
    return null;
  }

  return sanitizePublicProject(doc);
}

export interface ResolvedAdminTenant {
  adminId: string;
  agencyName: string;
  agencySlug: string;
  customDomain?: string;
  hostname?: string;
  seo?: IWebsiteSeoSettings;
  settings?: any;
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
): Promise<ResolvedAdminTenant | null> {
  if (!hostOrSlug) return null;

  // 0. Check AgencyDomain records first for custom domains
  const cleanHost = normalizeHostname(hostOrSlug) || hostOrSlug.split(":")[0].toLowerCase().trim();
  const domainTenant = await resolveTenantByHostname(cleanHost);
  if (domainTenant) {
    return {
      adminId: domainTenant.adminId,
      agencyName: domainTenant.agencyName,
      agencySlug: domainTenant.agencySlug,
      customDomain: domainTenant.hostname,
      hostname: domainTenant.hostname,
      seo: domainTenant.settings?.seo,
      settings: domainTenant.settings,
    };
  }

  await connectToDatabase();
  const { User } = await import("@/models/User");
  const { getWebsiteSettingsByAdminId } = await import("@/services/websiteSettingService");

  // 1. Direct custom domain match on User.customDomain
  const byCustomDomain = await User.findOne({
    customDomain: cleanHost,
    status: "active",
  })
    .select("_id name username agencyName agencySlug customDomain")
    .lean();

  if (byCustomDomain) {
    const adminId = byCustomDomain._id.toString();
    const settings = await getWebsiteSettingsByAdminId(adminId);
    return {
      adminId,
      agencyName: settings?.branding?.companyName || byCustomDomain.agencyName || byCustomDomain.name,
      agencySlug: resolveUserPublicSlug(byCustomDomain),
      customDomain: byCustomDomain.customDomain,
      hostname: byCustomDomain.customDomain || cleanHost,
      seo: settings?.seo,
      settings,
    };
  }

  // 2. Subdomain check (e.g. "apex.localhost" or "apex.portal.com")
  const parts = cleanHost.split(".");
  if (parts.length > 1) {
    const candidateSubdomain = parts[0];
    if (candidateSubdomain && candidateSubdomain !== "www" && candidateSubdomain !== "localhost") {
      const bySubdomain = await User.findOne({
        $or: [{ agencySlug: candidateSubdomain }, { username: candidateSubdomain }],
        status: "active",
      })
        .select("_id name username agencyName agencySlug customDomain")
        .lean();

      if (bySubdomain) {
        const adminId = bySubdomain._id.toString();
        const settings = await getWebsiteSettingsByAdminId(adminId);
        return {
          adminId,
          agencyName: settings?.branding?.companyName || bySubdomain.agencyName || bySubdomain.name,
          agencySlug: resolveUserPublicSlug(bySubdomain) || candidateSubdomain,
          customDomain: bySubdomain.customDomain,
          hostname: bySubdomain.customDomain || cleanHost,
          seo: settings?.seo,
          settings,
        };
      }
    }
  }

  // 3. Fallback direct match: agencySlug, username, name, email prefix, agencyName, or _id
  const isObjectId = mongoose.Types.ObjectId.isValid(cleanHost);
  let bySlug: any = await User.findOne({
    $or: [
      { agencySlug: cleanHost },
      { username: cleanHost },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(cleanHost) }] : []),
      { name: { $regex: `^${cleanHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { email: { $regex: `^${cleanHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}@`, $options: "i" } },
      { agencyName: { $regex: `^${cleanHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    ],
    status: "active",
  })
    .select("_id name username email agencyName agencySlug customDomain")
    .lean();

  if (!bySlug && !isObjectId && /^[a-z0-9]+$/.test(cleanHost)) {
    const activeCandidates = await User.find({ status: "active" })
      .select("_id name username email agencyName agencySlug customDomain")
      .lean();
    bySlug = activeCandidates.find(
      (u: any) => resolveUserPublicSlug(u).toLowerCase() === cleanHost,
    );
  }

  if (bySlug) {
    const adminId = bySlug._id.toString();
    const settings = await getWebsiteSettingsByAdminId(adminId);
    return {
      adminId,
      agencyName: settings?.branding?.companyName || bySlug.agencyName || bySlug.name,
      agencySlug: resolveUserPublicSlug(bySlug),
      customDomain: bySlug.customDomain,
      hostname: bySlug.customDomain || undefined,
      seo: settings?.seo,
      settings,
    };
  }

  return null;
}

/**
 * Fetch top 5 active cities/localities for an admin's published properties and projects.
 */
export async function getTopLocationsForTenant(adminId?: string): Promise<string[]> {
  try {
    await connectToDatabase();
    const isObjectId = adminId && mongoose.Types.ObjectId.isValid(adminId);
    const adminMatch = isObjectId ? { adminId: new mongoose.Types.ObjectId(adminId) } : {};

    // 1. Distinct cities from properties
    const propertyLocations = await Property.aggregate([
      {
        $match: {
          ...adminMatch,
          "publishing.publishOnWebsite": true,
          status: "Available",
        },
      },
      {
        $project: {
          city: "$location.city",
          landmark: "$location.landmark",
        },
      },
      {
        $facet: {
          cities: [
            { $match: { city: { $exists: true, $ne: "" } } },
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          landmarks: [
            { $match: { landmark: { $exists: true, $ne: "" } } },
            { $group: { _id: "$landmark", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    // 2. Distinct cities from projects
    const projectCities = await Project.aggregate([
      {
        $match: {
          ...adminMatch,
          isPublishedOnWebsite: true,
          "location.city": { $exists: true, $ne: "" },
        },
      },
      { $group: { _id: "$location.city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const locationSet = new Set<string>();

    if (propertyLocations?.[0]?.cities) {
      for (const c of propertyLocations[0].cities) {
        if (c._id && typeof c._id === "string" && c._id.trim()) {
          locationSet.add(c._id.trim());
        }
      }
    }

    if (projectCities) {
      for (const pc of projectCities) {
        if (pc._id && typeof pc._id === "string" && pc._id.trim()) {
          locationSet.add(pc._id.trim());
        }
      }
    }

    // If fewer than 5, add prominent landmarks/localities
    if (locationSet.size < 5 && propertyLocations?.[0]?.landmarks) {
      for (const lm of propertyLocations[0].landmarks) {
        if (lm._id && typeof lm._id === "string" && lm._id.trim()) {
          locationSet.add(lm._id.trim());
          if (locationSet.size >= 5) break;
        }
      }
    }

    return Array.from(locationSet).slice(0, 5);
  } catch (err) {
    console.error("getTopLocationsForTenant error:", err);
    return [];
  }
}
