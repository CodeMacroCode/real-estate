import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getPublicProperties,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import PublicPortalClient from "./PublicPortalClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const dynamic = "force-dynamic";

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
  const rawHost = (
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const normalizedHost = normalizeHostname(rawHost);
  const isCustomDomain = Boolean(normalizedHost && !isPlatformHost(normalizedHost));

  let targetAdminId: string | undefined;
  let agencyBranding: Awaited<ReturnType<typeof resolveAdminByHostOrSlug>> = null;

  if (isCustomDomain) {
    // Strict tenant isolation on custom domains: resolve exclusively from host
    // and ignore visitor-supplied ?agency= or ?adminId= query params.
    agencyBranding = await resolveAdminByHostOrSlug(normalizedHost);
    if (!agencyBranding) {
      notFound();
    }
    targetAdminId = agencyBranding.adminId;
  } else {
    // Platform host: resolve from URL query params (?agency=apex or ?adminId=...)
    const tenantFromQuery = resolvedSearchParams.agency
      ? await resolveAdminByHostOrSlug(resolvedSearchParams.agency)
      : resolvedSearchParams.adminId
      ? await resolveAdminByHostOrSlug(resolvedSearchParams.adminId)
      : null;

    targetAdminId =
      tenantFromQuery?.adminId || resolvedSearchParams.adminId || undefined;

    if (!targetAdminId) {
      notFound();
    }

    agencyBranding = tenantFromQuery || null;
  }

  const clientSearchParams = isCustomDomain
    ? { ...resolvedSearchParams, agency: undefined, adminId: undefined }
    : resolvedSearchParams;

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
        isCustomDomain={isCustomDomain}
      />
      <main className="flex-1">
        <PublicPortalClient
          initialProperties={initialData.properties}
          initialPagination={initialData.pagination}
          searchParams={clientSearchParams}
          agencyBranding={
            isCustomDomain && agencyBranding
              ? {
                  ...agencyBranding,
                  customDomain: agencyBranding.customDomain || normalizedHost,
                }
              : agencyBranding
          }
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
