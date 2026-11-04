import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { Property } from "@/models/Property";
import { Project } from "@/models/Project";

export interface SsrWebsiteManagementPortalItem {
  adminId: string;
  adminName: string;
  agencyName: string;
  agencySlug: string;
  email: string;
  mobile: string;
  customDomain: string | null;
  publishedPropertiesCount: number;
  publishedProjectsCount: number;
  createdAt: string;
  urls: {
    propertiesUrl: string;
    projectsUrl: string;
    directAdminUrl: string;
    subdomainUrl: string | null;
    customPortalUrl: string | null;
  };
}

export interface GetSsrWebsitePortalsParams {
  userId: string;
  roleSlug: string;
  search?: string;
  page?: number;
  limit?: number;
  host?: string;
}

export async function getSsrWebsitePortals({
  userId,
  roleSlug,
  search,
  page = 1,
  limit = 10,
  host = "localhost:3000",
}: GetSsrWebsitePortalsParams) {
  await connectToDatabase();

  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let targetAdminQuery: any = { status: "active" };

  if (isSuperAdmin) {
    const adminRole = await Role.findOne({ slug: "admin" }).lean();
    if (adminRole) {
      targetAdminQuery.roleId = adminRole._id;
    }
  } else if (isAdmin) {
    targetAdminQuery._id = new mongoose.Types.ObjectId(userId);
  } else {
    // Sub-role staff user -> find parent admin
    const currentUser = await User.findById(userId).lean();
    if (currentUser?.parentAdminId) {
      const pId =
        typeof currentUser.parentAdminId === "object" &&
        "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      targetAdminQuery._id = new mongoose.Types.ObjectId(String(pId));
    } else {
      targetAdminQuery._id = new mongoose.Types.ObjectId(userId);
    }
  }

  // Search filter
  if (search && search.trim()) {
    const s = search.trim();
    targetAdminQuery.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { mobile: { $regex: s, $options: "i" } },
      { agencyName: { $regex: s, $options: "i" } },
      { agencySlug: { $regex: s, $options: "i" } },
      { customDomain: { $regex: s, $options: "i" } },
    ];
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(50, limit));
  const skip = (safePage - 1) * safeLimit;

  const [total, adminDocs] = await Promise.all([
    User.countDocuments(targetAdminQuery),
    User.find(targetAdminQuery)
      .select(
        "_id name email mobile agencyName agencySlug customDomain createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  const targetAdminIds = adminDocs.map((a: any) => a._id);

  // Aggregation counts for properties & projects
  const [propertyCounts, projectCounts] = await Promise.all([
    Property.aggregate([
      {
        $match: {
          adminId: { $in: targetAdminIds },
          "publishing.publishOnWebsite": true,
        },
      },
      { $group: { _id: "$adminId", count: { $sum: 1 } } },
    ]),
    Project.aggregate([
      {
        $match: {
          adminId: { $in: targetAdminIds },
          isPublishedOnWebsite: true,
        },
      },
      { $group: { _id: "$adminId", count: { $sum: 1 } } },
    ]),
  ]);

  const propertyCountMap = new Map(
    propertyCounts.map((p) => [p._id.toString(), p.count]),
  );
  const projectCountMap = new Map(
    projectCounts.map((p) => [p._id.toString(), p.count]),
  );

  const adminPortals: SsrWebsiteManagementPortalItem[] = adminDocs.map(
    (admin: any) => {
      const adminId = admin._id.toString();
      const slug =
        admin.agencySlug || admin.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      const propertiesUrl = `${baseUrl}/portal-properties?agency=${slug}`;
      const projectsUrl = `${baseUrl}/portal-projects?agency=${slug}`;
      const directAdminUrl = `${baseUrl}/portal-properties?adminId=${adminId}`;

      let customPortalUrl: string | null = null;
      let subdomainUrl: string | null = null;

      if (admin.customDomain) {
        customPortalUrl = `https://${admin.customDomain}/portal-properties`;
      }

      if (admin.agencySlug) {
        const domainParts = host.split(":");
        const port = domainParts[1] ? `:${domainParts[1]}` : "";
        subdomainUrl = `${protocol}://${admin.agencySlug}.${domainParts[0]}${port}/portal-properties`;
      }

      return {
        adminId,
        adminName: admin.name,
        agencyName: admin.agencyName || admin.name,
        agencySlug: admin.agencySlug || slug,
        email: admin.email,
        mobile: admin.mobile,
        customDomain: admin.customDomain || null,
        publishedPropertiesCount: propertyCountMap.get(adminId) || 0,
        publishedProjectsCount: projectCountMap.get(adminId) || 0,
        createdAt: admin.createdAt
          ? new Date(admin.createdAt).toISOString()
          : new Date().toISOString(),
        urls: {
          propertiesUrl,
          projectsUrl,
          directAdminUrl,
          subdomainUrl,
          customPortalUrl,
        },
      };
    },
  );

  return {
    adminPortals,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
    meta: {
      currentUserRole: roleSlug,
      isSuperAdmin,
      isAdmin,
    },
  };
}
