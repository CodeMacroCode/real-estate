import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Project, IProjectDocument } from "@/models/Project";
import { ProjectUnit } from "@/models/ProjectUnit";
import { User } from "@/models/User";

export interface SsrProjectItem {
  _id: string;
  adminId: string;
  projectId: string;
  name: string;
  developerName: string;
  projectType: string;
  location: {
    address: string;
    city: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  };
  reraNumber?: string;
  constructionStatus: string;
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  isPublishedOnWebsite: boolean;
  featuredOnWebsite: boolean;
  furnishing?: string;
  amenities?: string[];
  coverImage?: string;
  images?: string[];
  slug?: string;
  towersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetSsrProjectsParams {
  userId: string;
  roleSlug: string;
  adminFilter?: string;
  search?: string;
  projectType?: string;
  constructionStatus?: string;
  city?: string;
  page?: number;
  limit?: number;
}

/**
 * Recalculate real-time unit status counters for a project.
 */
export async function recalculateProjectCounters(projectId: mongoose.Types.ObjectId | string) {
  await connectToDatabase();
  const pId = typeof projectId === "string" ? new mongoose.Types.ObjectId(projectId) : projectId;

  const [total, available, booked, sold] = await Promise.all([
    ProjectUnit.countDocuments({ projectId: pId }),
    ProjectUnit.countDocuments({ projectId: pId, status: "Available" }),
    ProjectUnit.countDocuments({ projectId: pId, status: { $in: ["Booked", "Hold"] } }),
    ProjectUnit.countDocuments({ projectId: pId, status: "Sold" }),
  ]);

  await Project.findByIdAndUpdate(pId, {
    $set: {
      totalUnits: total,
      availableUnits: available,
      bookedUnits: booked,
      soldUnits: sold,
    },
  });

  return { total, available, booked, sold };
}

/**
 * Server-Side Render (SSR) Data Loader for Projects.
 * Pre-renders project directory with live unit availability.
 */
export async function getSsrProjects({
  userId,
  roleSlug,
  adminFilter,
  search,
  projectType,
  constructionStatus,
  city,
  page = 1,
  limit = 20,
}: GetSsrProjectsParams) {
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

  if (projectType && projectType !== "ALL") {
    query.projectType = projectType;
  }

  if (constructionStatus && constructionStatus !== "ALL") {
    query.constructionStatus = constructionStatus;
  }

  if (city && city !== "ALL") {
    query["location.city"] = new RegExp(`^${city}$`, "i");
  }

  if (search) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { developerName: { $regex: s, $options: "i" } },
      { projectId: { $regex: s, $options: "i" } },
      { reraNumber: { $regex: s, $options: "i" } },
      { "location.city": { $regex: s, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, docs] = await Promise.all([
    Project.countDocuments(query),
    Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const projects: SsrProjectItem[] = docs.map((doc: any) => ({
    _id: doc._id.toString(),
    adminId: doc.adminId.toString(),
    projectId: doc.projectId,
    name: doc.name,
    developerName: doc.developerName,
    projectType: doc.projectType,
    location: doc.location || { address: "", city: "" },
    reraNumber: doc.reraNumber || "",
    constructionStatus: doc.constructionStatus,
    totalUnits: doc.totalUnits || 0,
    availableUnits: doc.availableUnits || 0,
    bookedUnits: doc.bookedUnits || 0,
    soldUnits: doc.soldUnits || 0,
    isPublishedOnWebsite: Boolean(doc.isPublishedOnWebsite),
    featuredOnWebsite: Boolean(doc.featuredOnWebsite),
    furnishing: doc.furnishing || "Unfurnished",
    amenities: Array.isArray(doc.amenities) ? doc.amenities : [],
    coverImage: doc.media?.coverImage || "",
    images: Array.isArray(doc.media?.images) ? doc.media.images : [],
    slug: doc.seo?.slug || doc.projectId?.toLowerCase(),
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
  }));

  return {
    projects,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Fetch full structural tree of a project:
 * Project -> Towers / Blocks -> Floors -> Units
 */
export async function getProjectStructureTree(projectId: string, orgAdminId?: string) {
  await connectToDatabase();

  const query: any = { _id: new mongoose.Types.ObjectId(projectId) };
  if (orgAdminId) {
    query.adminId = new mongoose.Types.ObjectId(orgAdminId);
  }

  const project = await Project.findOne(query).lean();
  if (!project) return null;

  const units = await ProjectUnit.find({ projectId: project._id })
    .sort({ towerName: 1, floorNumber: 1, unitNumber: 1 })
    .lean();

  // Group by Tower -> Floor
  const towerMap = new Map<string, Map<number, any[]>>();

  for (const u of units) {
    if (!towerMap.has(u.towerName)) {
      towerMap.set(u.towerName, new Map());
    }
    const floorMap = towerMap.get(u.towerName)!;
    if (!floorMap.has(u.floorNumber)) {
      floorMap.set(u.floorNumber, []);
    }
    floorMap.get(u.floorNumber)!.push({
      _id: u._id.toString(),
      unitNumber: u.unitNumber,
      unitType: u.unitType,
      carpetArea: u.carpetArea,
      builtUpArea: u.builtUpArea,
      price: u.price,
      facing: u.facing,
      parkingSlots: u.parkingSlots,
      status: u.status,
      bookedByClientId: u.bookedByClientId ? u.bookedByClientId.toString() : null,
      bookingDate: u.bookingDate ? u.bookingDate.toISOString() : null,
    });
  }

  const structure: any[] = [];
  for (const [towerName, floorMap] of towerMap.entries()) {
    const floors: any[] = [];
    // Sort floors numerically
    const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => a - b);
    for (const fNum of sortedFloors) {
      floors.push({
        floorNumber: fNum,
        units: floorMap.get(fNum)!,
      });
    }
    structure.push({
      towerName,
      floors,
    });
  }

  return {
    project: {
      _id: project._id.toString(),
      projectId: project.projectId,
      name: project.name,
      developerName: project.developerName,
      constructionStatus: project.constructionStatus,
      totalUnits: project.totalUnits,
      availableUnits: project.availableUnits,
      bookedUnits: project.bookedUnits,
      soldUnits: project.soldUnits,
    },
    structure,
    allUnits: units.map((u: any) => ({ ...u, _id: u._id.toString() })),
  };
}

