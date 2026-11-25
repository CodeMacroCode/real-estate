import mongoose, { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb/db";
import { AgencyDomain, IAgencyDomainDocument } from "@/models/AgencyDomain";
import { User } from "@/models/User";
import "@/models/Role";
import { getWebsiteSettingsByAdminId } from "@/services/websiteSettingService";
import {
  isPlatformHost,
  isValidHostname,
  normalizeHostname,
} from "@/lib/domains/normalize";

const CACHE_TTL_MS = 60_000;
const ALLOWED_AGENCY_ROLE_SLUGS = new Set(["admin", "super_admin"]);

export class DomainServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DomainServiceError";
    this.statusCode = statusCode;
  }
}

export interface ResolvedTenant {
  adminId: string;
  agencyName: string;
  agencySlug: string;
  hostname: string;
  isPrimary: boolean;
  settings: Record<string, any>;
}

export interface AgencyDomainAgencyInfo {
  id: string;
  name: string;
  email: string;
  agencyName: string;
  agencySlug: string;
}

export interface AgencyDomainDTO {
  id: string;
  _id: string;
  agencyId: string;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  agency?: AgencyDomainAgencyInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDomainsFilters {
  agencyId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ListDomainsResult {
  domains: AgencyDomainDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDomainInput {
  agencyId: string;
  hostname: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface UpdateDomainInput {
  hostname?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

interface CacheEntry {
  value: ResolvedTenant | null;
  expiresAt: number;
}

declare global {
  var __agencyDomainCache: Map<string, CacheEntry> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!global.__agencyDomainCache) {
    global.__agencyDomainCache = new Map<string, CacheEntry>();
  }
  return global.__agencyDomainCache;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeDomain(doc: any): AgencyDomainDTO {
  const populatedAgency =
    doc.agencyId && typeof doc.agencyId === "object" && "_id" in doc.agencyId
      ? doc.agencyId
      : null;

  const agencyIdStr = populatedAgency
    ? populatedAgency._id.toString()
    : doc.agencyId.toString();

  return {
    id: doc._id.toString(),
    _id: doc._id.toString(),
    agencyId: agencyIdStr,
    hostname: doc.hostname,
    isPrimary: Boolean(doc.isPrimary),
    isActive: Boolean(doc.isActive),
    agency: populatedAgency
      ? {
          id: agencyIdStr,
          name: populatedAgency.name || "",
          email: populatedAgency.email || "",
          agencyName: populatedAgency.agencyName || "",
          agencySlug: populatedAgency.agencySlug || "",
        }
      : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

function validateAndNormalizeHostname(rawHostname: string): string {
  const normalized = normalizeHostname(rawHostname);
  if (!normalized || !isValidHostname(normalized)) {
    throw new DomainServiceError(
      "Invalid hostname format. Provide a valid domain or subdomain (e.g. portal.agency.com).",
      400,
    );
  }
  if (isPlatformHost(normalized)) {
    throw new DomainServiceError(
      "Platform hostnames cannot be registered as custom agency domains.",
      400,
    );
  }
  return normalized;
}

async function assertValidActiveAgency(agencyId: string): Promise<mongoose.Types.ObjectId> {
  if (!agencyId || !mongoose.Types.ObjectId.isValid(agencyId)) {
    throw new DomainServiceError("Invalid agencyId.", 400);
  }

  const user = await User.findById(agencyId)
    .populate("roleId", "slug")
    .select("_id status roleId")
    .lean();

  if (!user) {
    throw new DomainServiceError("Agency user not found.", 404);
  }

  if (user.status !== "active") {
    throw new DomainServiceError("Agency user is not active.", 400);
  }

  const roleObj = user.roleId as unknown as { slug?: string } | null;
  const roleSlug = roleObj?.slug;
  if (!roleSlug || !ALLOWED_AGENCY_ROLE_SLUGS.has(roleSlug)) {
    throw new DomainServiceError(
      "Target user must have an admin or super_admin role.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(agencyId);
}

/**
 * Invalidates a specific hostname from the tenant resolution cache,
 * or clears the entire cache when no hostname is provided.
 */
export function invalidateDomainCache(hostname?: string): void {
  const cache = getCache();
  if (!hostname) {
    cache.clear();
    return;
  }

  const normalized = normalizeHostname(hostname);
  if (normalized) {
    cache.delete(normalized);
  }
}

/**
 * Resolves an active tenant and their WebsiteSetting by incoming hostname.
 * Uses an in-memory 60-second TTL cache.
 */
export async function resolveTenantByHostname(
  rawHost: string,
): Promise<ResolvedTenant | null> {
  const hostname = normalizeHostname(rawHost);
  if (!hostname) {
    return null;
  }

  const cache = getCache();
  const cached = cache.get(hostname);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.value;
    }
    cache.delete(hostname);
  }

  await connectToDatabase();

  const domain = await AgencyDomain.findOne({
    hostname,
    isActive: true,
  }).lean();

  if (!domain) {
    cache.set(hostname, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const user = await User.findOne({
    _id: domain.agencyId,
    status: "active",
  })
    .select("_id name agencyName agencySlug")
    .lean();

  if (!user) {
    cache.set(hostname, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const adminId = user._id.toString();
  const settings = await getWebsiteSettingsByAdminId(adminId);

  const resolved: ResolvedTenant = {
    adminId,
    agencyName:
      settings?.branding?.companyName || user.agencyName || user.name || "",
    agencySlug: user.agencySlug || "",
    hostname: domain.hostname,
    isPrimary: Boolean(domain.isPrimary),
    settings,
  };

  cache.set(hostname, { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
  return resolved;
}

/**
 * Lists agency domains with optional filtering and pagination.
 */
export async function listDomains(
  filters: ListDomainsFilters = {},
): Promise<ListDomainsResult> {
  await connectToDatabase();

  const query: FilterQuery<IAgencyDomainDocument> = {};

  if (filters.agencyId) {
    if (!mongoose.Types.ObjectId.isValid(filters.agencyId)) {
      throw new DomainServiceError("Invalid agencyId filter.", 400);
    }
    query.agencyId = new mongoose.Types.ObjectId(filters.agencyId);
  }

  if (typeof filters.isActive === "boolean") {
    query.isActive = filters.isActive;
  }

  if (filters.search && filters.search.trim()) {
    const cleanSearch = normalizeHostname(filters.search) || filters.search.trim();
    query.hostname = { $regex: escapeRegex(cleanSearch), $options: "i" };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    AgencyDomain.find(query)
      .populate("agencyId", "name email agencyName agencySlug")
      .sort({ isPrimary: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AgencyDomain.countDocuments(query),
  ]);

  return {
    domains: docs.map(serializeDomain),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Fetches a single agency domain by its ID.
 */
export async function getDomainById(id: string): Promise<AgencyDomainDTO | null> {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new DomainServiceError("Invalid domain ID.", 400);
  }

  await connectToDatabase();

  const doc = await AgencyDomain.findById(id)
    .populate("agencyId", "name email agencyName agencySlug")
    .lean();

  return doc ? serializeDomain(doc) : null;
}

/**
 * Creates a new custom domain mapping for an active agency.
 */
export async function createDomain(
  input: CreateDomainInput,
): Promise<AgencyDomainDTO> {
  await connectToDatabase();

  const agencyObjectId = await assertValidActiveAgency(input.agencyId);
  const hostname = validateAndNormalizeHostname(input.hostname);

  const existing = await AgencyDomain.findOne({ hostname }).select("_id").lean();
  if (existing) {
    throw new DomainServiceError(
      `Hostname "${hostname}" is already registered.`,
      409,
    );
  }

  const isPrimary = Boolean(input.isPrimary);
  const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

  if (isPrimary) {
    await AgencyDomain.updateMany(
      { agencyId: agencyObjectId, isPrimary: true },
      { $set: { isPrimary: false } },
    );
  }

  try {
    const created = await AgencyDomain.create({
      agencyId: agencyObjectId,
      hostname,
      isPrimary,
      isActive,
    });

    invalidateDomainCache(hostname);

    const populated = await AgencyDomain.findById(created._id)
      .populate("agencyId", "name email agencyName agencySlug")
      .lean();

    return serializeDomain(populated || created.toObject());
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DomainServiceError(
        `Hostname "${hostname}" is already registered.`,
        409,
      );
    }
    throw error;
  }
}

/**
 * Updates an existing agency domain mapping.
 */
export async function updateDomain(
  id: string,
  input: UpdateDomainInput,
): Promise<AgencyDomainDTO> {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new DomainServiceError("Invalid domain ID.", 400);
  }

  await connectToDatabase();

  const existing = await AgencyDomain.findById(id);
  if (!existing) {
    throw new DomainServiceError("Domain not found.", 404);
  }

  const previousHostname = existing.hostname;
  const updates: Partial<Pick<IAgencyDomainDocument, "hostname" | "isPrimary" | "isActive">> = {};

  if (input.hostname !== undefined) {
    const nextHostname = validateAndNormalizeHostname(input.hostname);
    if (nextHostname !== previousHostname) {
      const conflict = await AgencyDomain.findOne({
        hostname: nextHostname,
        _id: { $ne: existing._id },
      })
        .select("_id")
        .lean();

      if (conflict) {
        throw new DomainServiceError(
          `Hostname "${nextHostname}" is already registered.`,
          409,
        );
      }
      updates.hostname = nextHostname;
    }
  }

  if (input.isActive !== undefined) {
    updates.isActive = Boolean(input.isActive);
  }

  if (input.isPrimary !== undefined) {
    const nextPrimary = Boolean(input.isPrimary);
    if (nextPrimary && !existing.isPrimary) {
      await AgencyDomain.updateMany(
        {
          agencyId: existing.agencyId,
          isPrimary: true,
          _id: { $ne: existing._id },
        },
        { $set: { isPrimary: false } },
      );
    }
    updates.isPrimary = nextPrimary;
  }

  try {
    const updated = await AgencyDomain.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("agencyId", "name email agencyName agencySlug")
      .lean();

    if (!updated) {
      throw new DomainServiceError("Domain not found.", 404);
    }

    invalidateDomainCache(previousHostname);
    if (updates.hostname && updates.hostname !== previousHostname) {
      invalidateDomainCache(updates.hostname);
    }

    return serializeDomain(updated);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DomainServiceError(
        "A domain with this hostname or primary status already exists.",
        409,
      );
    }
    throw error;
  }
}

/**
 * Deletes an agency domain mapping and invalidates its cache entry.
 */
export async function deleteDomain(id: string): Promise<AgencyDomainDTO> {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new DomainServiceError("Invalid domain ID.", 400);
  }

  await connectToDatabase();

  const deleted = await AgencyDomain.findByIdAndDelete(id)
    .populate("agencyId", "name email agencyName agencySlug")
    .lean();

  if (!deleted) {
    throw new DomainServiceError("Domain not found.", 404);
  }

  invalidateDomainCache(deleted.hostname);

  return serializeDomain(deleted);
}

/**
 * Promotes a domain to be the sole primary domain for its agency.
 */
export async function setPrimaryDomain(id: string): Promise<AgencyDomainDTO> {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new DomainServiceError("Invalid domain ID.", 400);
  }

  await connectToDatabase();

  const target = await AgencyDomain.findById(id).lean();
  if (!target) {
    throw new DomainServiceError("Domain not found.", 404);
  }

  await AgencyDomain.updateMany(
    {
      agencyId: target.agencyId,
      isPrimary: true,
      _id: { $ne: target._id },
    },
    { $set: { isPrimary: false } },
  );

  const updated = await AgencyDomain.findByIdAndUpdate(
    id,
    { $set: { isPrimary: true } },
    { new: true },
  )
    .populate("agencyId", "name email agencyName agencySlug")
    .lean();

  if (!updated) {
    throw new DomainServiceError("Domain not found.", 404);
  }

  invalidateDomainCache(updated.hostname);

  return serializeDomain(updated);
}
