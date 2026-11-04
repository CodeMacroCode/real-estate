import React from "react";
import { headers } from "next/headers";
import { getPublicProperties, resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import PublicPortalClient from "./PublicPortalClient";

export const metadata = {
  title: "Browse Properties & Real Estate Listings",
  description:
    "Explore verified residential, commercial, and investment properties.",
};

interface PublicPropertiesPageProps {
  searchParams: Promise<{
    adminId?: string;
    agency?: string;
    category?: string;
    propertyType?: string;
    transactionType?: string;
    city?: string;
    bedrooms?: string;
    minPrice?: string;
    maxPrice?: string;
    featured?: string;
    search?: string;
    page?: string;
    limit?: string;
    sort?: string;
  }>;
}

/**
 * SSR Server Component: Pre-renders public verified listings on the server.
 * Supports Multi-Tenant Domain Isolation:
 *  - If visited via admin custom domain / subdomain (e.g. apex.localhost:3000 or apexrealty.com),
 *    it resolves the admin and filters strictly to their inventory.
 *  - Also supports explicit ?adminId= or ?agency= parameter.
 */
export default async function PublicPropertiesPage({
  searchParams,
}: PublicPropertiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host") || "";

  // 1. Resolve tenant identity from Host header (e.g. apex.localhost:3000 or customdomain.com)
  const tenantFromHost = await resolveAdminByHostOrSlug(host);

  // 2. Or fallback to URL query params (?agency=apex or ?adminId=...)
  const tenantFromQuery = resolvedSearchParams.agency
    ? await resolveAdminByHostOrSlug(resolvedSearchParams.agency)
    : null;

  const targetAdminId =
    tenantFromHost?.adminId ||
    tenantFromQuery?.adminId ||
    resolvedSearchParams.adminId ||
    undefined;

  const agencyBranding = tenantFromHost || tenantFromQuery || null;

  const initialData = await getPublicProperties({
    adminId: targetAdminId,
    category: resolvedSearchParams.category,
    propertyType: resolvedSearchParams.propertyType,
    transactionType: resolvedSearchParams.transactionType,
    city: resolvedSearchParams.city,
    bedrooms: resolvedSearchParams.bedrooms,
    minPrice: resolvedSearchParams.minPrice,
    maxPrice: resolvedSearchParams.maxPrice,
    featured: resolvedSearchParams.featured,
    search: resolvedSearchParams.search,
    page: resolvedSearchParams.page || 1,
    limit: resolvedSearchParams.limit || 12,
    sort: resolvedSearchParams.sort,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicPortalClient
        initialProperties={initialData.properties}
        initialPagination={initialData.pagination}
        searchParams={resolvedSearchParams}
        agencyBranding={agencyBranding}
      />
    </main>
  );
}
