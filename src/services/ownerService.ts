import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { Owner, IOwnerDocument } from "@/models/Owner";
import { Property } from "@/models/Property";
import { User } from "@/models/User";

export interface SsrOwnerItem {
  _id: string;
  adminId: string;
  ownerId: string;
  name: string;
  mobile: string;
  whatsApp?: string;
  email?: string;
  address?: string;
  company?: string;
  panGstNumber?: string;
  ownershipType: "Individual" | "Joint" | "Corporate" | "NRI";
  preferredContactMethod: "Call" | "WhatsApp" | "Email";
  notes?: string;
  totalPropertiesOwned: number;
  documentsCount: number;
  assignedStaff?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetSsrOwnersParams {
  userId: string;
  roleSlug: string;
  adminFilter?: string;
  search?: string;
  ownershipType?: string;
  page?: number;
  limit?: number;
}

/**
 * Server-Side Render (SSR) Data Loader for Property Owners.
 * Direct DB execution with multi-tenant scoping and real-time property counts.
 */
export async function getSsrOwners({
  userId,
  roleSlug,
  adminFilter,
  search,
  ownershipType,
  page = 1,
  limit = 20,
}: GetSsrOwnersParams) {
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
    // Sub-roles scope by their parent admin
    const currentUser = await User.findById(userId).lean();
    if (currentUser?.parentAdminId) {
      const parentId =
        typeof currentUser.parentAdminId === "object" &&
        "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      query.adminId = new mongoose.Types.ObjectId(String(parentId));
    } else {
      query.createdById = new mongoose.Types.ObjectId(userId);
    }
  }

  if (ownershipType) {
    query.ownershipType = ownershipType;
  }

  if (search) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { mobile: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { ownerId: { $regex: s, $options: "i" } },
      { panGstNumber: { $regex: s, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, docs] = await Promise.all([
    Owner.countDocuments(query),
    Owner.find(query)
      .populate("assignedStaffId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const owners: SsrOwnerItem[] = docs.map((doc: any) => ({
    _id: doc._id.toString(),
    adminId: doc.adminId.toString(),
    ownerId: doc.ownerId,
    name: doc.name,
    mobile: doc.mobile,
    whatsApp: doc.whatsApp || "",
    email: doc.email || "",
    address: doc.address || "",
    company: doc.company || "",
    panGstNumber: doc.panGstNumber || "",
    ownershipType: doc.ownershipType || "Individual",
    preferredContactMethod: doc.preferredContactMethod || "Call",
    notes: doc.notes || "",
    totalPropertiesOwned: doc.totalPropertiesOwned || 0,
    documentsCount: Array.isArray(doc.documents) ? doc.documents.length : 0,
    assignedStaff: doc.assignedStaffId
      ? {
          _id: doc.assignedStaffId._id.toString(),
          name: doc.assignedStaffId.name,
          email: doc.assignedStaffId.email,
        }
      : null,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
  }));

  return {
    owners,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Owner 360-degree aggregated portfolio view
 */
export async function getOwner360View(ownerId: string, orgAdminId?: string) {
  await connectToDatabase();

  const query: any = { _id: new mongoose.Types.ObjectId(ownerId) };
  if (orgAdminId) {
    query.adminId = new mongoose.Types.ObjectId(orgAdminId);
  }

  const owner = await Owner.findOne(query)
    .populate("assignedStaffId", "name email")
    .populate("createdById", "name email")
    .lean();

  if (!owner) return null;

  // Aggregate all properties owned by this owner
  const properties = await Property.find({ ownerId: owner._id })
    .select(
      "propertyId title propertyCategory propertyType transactionType status pricing location areaDetails media publishing",
    )
    .lean();

  const activeProperties = properties.filter(
    (p) => p.status === "Available" || p.status === "Hold",
  );
  const soldProperties = properties.filter((p) => p.status === "Sold");
  const rentedLeasedProperties = properties.filter(
    (p) => p.status === "Rented" || p.status === "Leased",
  );

  const totalPortfolioValue = properties.reduce(
    (acc, p) => acc + (p.pricing?.price || 0),
    0,
  );
  const totalMonthlyRentalIncome = properties.reduce(
    (acc, p) => acc + (p.pricing?.monthlyRent || 0),
    0,
  );

  return {
    owner: {
      ...owner,
      _id: owner._id.toString(),
      adminId: owner.adminId.toString(),
    },
    metrics: {
      totalProperties: properties.length,
      availableCount: activeProperties.length,
      soldCount: soldProperties.length,
      rentedLeasedCount: rentedLeasedProperties.length,
      totalPortfolioValue,
      totalMonthlyRentalIncome,
    },
    properties,
  };
}
