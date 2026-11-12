import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getPublicProperties,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import PublicPortalClient from "./PublicPortalClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = {
  title: "Browse Properties & Real Estate Listings",
  description:
    "Explore RERA-verified residential, commercial, and land investments.",
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

  // Strict tenant isolation: Global un-scoped portal is disabled.
  // Must provide a valid agency slug or adminId (e.g. /portal-properties?agency=prasad)
  if (!targetAdminId) {
    notFound();
  }

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

  const topLocations = await getTopLocationsForTenant(targetAdminId);

  return (
    <div
      className="min-h-screen bg-paper text-ink flex flex-col justify-between"
      style={
        {
          ...(agencyBranding?.settings?.theme?.primaryColor
            ? { "--ink-green": agencyBranding.settings.theme.primaryColor }
            : {}),
          ...(agencyBranding?.settings?.theme?.deepColor
            ? { "--deep-green": agencyBranding.settings.theme.deepColor }
            : {}),
          ...(agencyBranding?.settings?.theme?.accentColor
            ? { "--brass": agencyBranding.settings.theme.accentColor }
            : {}),
          ...(agencyBranding?.settings?.theme?.paperColor
            ? { "--paper": agencyBranding.settings.theme.paperColor }
            : {}),
        } as React.CSSProperties
      }
    >
      <PublicHeader
        agencyName={agencyBranding?.agencyName}
        settings={agencyBranding?.settings}
      />
      <main className="flex-1">
        <PublicPortalClient
          initialProperties={initialData.properties}
          initialPagination={initialData.pagination}
          searchParams={resolvedSearchParams}
          agencyBranding={agencyBranding}
        />
      </main>
      <PublicFooter
        agencyName={agencyBranding?.agencyName}
        topLocations={topLocations}
        settings={agencyBranding?.settings}
      />
    </div>
  );
}
