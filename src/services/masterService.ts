import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { MasterOption, MasterCategory } from "@/models/MasterOption";
import { User } from "@/models/User";

export interface SsrMasterOption {
  _id: string;
  adminId: string | null;
  category: MasterCategory;
  label: string;
  value: string;
  metadata?: {
    isUnpublishTrigger?: boolean;
    city?: string;
    icon?: string;
    color?: string;
  };
  displayOrder: number;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterPaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface GetSsrMastersParams {
  userId: string;
  roleSlug: string;
  category?: MasterCategory;
  includeInactive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SsrMastersResult {
  options: SsrMasterOption[];
  pagination: MasterPaginationInfo;
}

/**
 * Server-Side Render (SSR) Data Loader for Master Settings.
 * Direct database execution without round-trip HTTP overhead,
 * maintaining strict Multi-Tenant isolation, global defaults merging,
 * search filtering, and pagination.
 */
export async function getSsrMasterOptionsPaginated({
  userId,
  roleSlug,
  category,
  includeInactive = false,
  search,
  page = 1,
  limit = 10,
}: GetSsrMastersParams): Promise<SsrMastersResult> {
  await connectToDatabase();

  const isSuperAdmin = roleSlug === "super_admin";
  const isAdmin = roleSlug === "admin";

  let orgAdminId: mongoose.Types.ObjectId | null = null;

  if (isAdmin) {
    orgAdminId = new mongoose.Types.ObjectId(userId);
  } else if (!isSuperAdmin) {
    const currentUser = await User.findById(userId).lean();
    if (currentUser?.parentAdminId) {
      const parentId =
        typeof currentUser.parentAdminId === "object" && "_id" in currentUser.parentAdminId
          ? (currentUser.parentAdminId as any)._id
          : currentUser.parentAdminId;
      orgAdminId = new mongoose.Types.ObjectId(String(parentId));
    }
  }

  const filter: any = {
    $or: [{ adminId: null }],
  };

  if (category) {
    filter.category = category;
  }

  if (orgAdminId) {
    filter.$or.push({ adminId: orgAdminId });
  }

  if (!includeInactive) {
    filter.isActive = true;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ label: searchRegex }, { value: searchRegex }],
    });
  }

  const rawDocs = await MasterOption.find(filter)
    .sort({ category: 1, displayOrder: 1, label: 1 })
    .lean();

  // Deduplicate: Tenant override takes precedence over global default with the same slug
  const map = new Map<string, any>();
  for (const doc of rawDocs) {
    const key = `${doc.category}_${doc.value}`;
    const existing = map.get(key);
    if (!existing || (!existing.adminId && doc.adminId)) {
      map.set(key, doc);
    }
  }

  const allFiltered = Array.from(map.values());
  const total = allFiltered.length;
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * safeLimit;

  const paginatedDocs = allFiltered.slice(skip, skip + safeLimit);

  const options: SsrMasterOption[] = paginatedDocs.map((doc: any) => ({
    _id: doc._id.toString(),
    adminId: doc.adminId ? doc.adminId.toString() : null,
    category: doc.category,
    label: doc.label,
    value: doc.value,
    metadata: doc.metadata || {},
    displayOrder: doc.displayOrder || 0,
    isSystemDefault: Boolean(doc.isSystemDefault),
    isActive: Boolean(doc.isActive),
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
  }));

  return {
    options,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

/**
 * Backward-compatible helper for cases requiring the flat array of all options
 */
export async function getSsrMasterOptions(
  params: GetSsrMastersParams
): Promise<SsrMasterOption[]> {
  const result = await getSsrMasterOptionsPaginated({
    ...params,
    page: 1,
    limit: 1000,
  });
  return result.options;
}
