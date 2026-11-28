import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getPublicProperties,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import {
  buildRealEstateAgentJsonLd,
  getPortalPageMetadata,
  serializeJsonLd,
} from "@/lib/seo/portalMetadata";
import PublicPortalClient from "./PublicPortalClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PublicPropertiesPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  return getPortalPageMetadata({
    pageType: "properties",
    pathname: "/portal-properties",
    searchParams: resolvedSearchParams,
  });
}

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

    if (
      !resolvedSearchParams.agency &&
      resolvedSearchParams.adminId &&
      agencyBranding?.agencySlug
    ) {
      const nextParams = new URLSearchParams();
      for (const [k, v] of Object.entries(resolvedSearchParams)) {
        if (v !== undefined && k !== "adminId" && k !== "agency") {
          nextParams.set(k, v);
        }
      }
      nextParams.set("agency", agencyBranding.agencySlug);
      redirect(`/portal-properties?${nextParams.toString()}`);
    }
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

  const proto =
    (headerList.get("x-forwarded-proto") || "").split(",")[0].trim() ||
    (normalizedHost === "localhost" || normalizedHost === "127.0.0.1"
      ? "http"
      : "https");
  const pageUrl = rawHost ? `${proto}://${rawHost}/portal-properties` : undefined;
  const jsonLd = buildRealEstateAgentJsonLd({
    agencyBranding,
    url: pageUrl,
  });

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PublicHeader
        agencyName={agencyBranding?.agencyName}
        agencySlug={agencyBranding?.agencySlug}
        adminId={targetAdminId}
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
        agencySlug={agencyBranding?.agencySlug}
        adminId={targetAdminId}
        topLocations={topLocations}
        settings={agencyBranding?.settings}
        isCustomDomain={isCustomDomain}
      />
    </div>
  );
}
