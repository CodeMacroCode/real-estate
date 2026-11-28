import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import {
  buildRealEstateAgentJsonLd,
  getPortalPageMetadata,
  serializeJsonLd,
} from "@/lib/seo/portalMetadata";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PortalContactClient } from "./PortalContactClient";

export async function generateMetadata({
  searchParams,
}: PortalContactPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  return getPortalPageMetadata({
    pageType: "contact",
    pathname: "/portal-contact",
    searchParams: resolvedSearchParams,
  });
}

interface PortalContactPageProps {
  searchParams: Promise<{
    adminId?: string;
    agency?: string;
  }>;
}

export default async function PortalContactPage({
  searchParams,
}: PortalContactPageProps) {
  const resolvedSearchParams = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host") || "";

  // 1. Explicit URL query parameter has HIGHEST priority (?agency=prasad or ?adminId=...)
  const tenantFromQuery = resolvedSearchParams.agency
    ? await resolveAdminByHostOrSlug(resolvedSearchParams.agency)
    : resolvedSearchParams.adminId
      ? await resolveAdminByHostOrSlug(resolvedSearchParams.adminId)
      : null;

  // 2. Fallback to Host header only if no explicit agency query param was supplied
  const tenantFromHost = !tenantFromQuery && host
    ? await resolveAdminByHostOrSlug(host)
    : null;

  const agencyBranding = tenantFromQuery || tenantFromHost || null;

  if (
    !resolvedSearchParams.agency &&
    resolvedSearchParams.adminId &&
    agencyBranding?.agencySlug
  ) {
    redirect(`/portal-contact?agency=${encodeURIComponent(agencyBranding.agencySlug)}`);
  }

  const targetAdminId =
    agencyBranding?.adminId ||
    resolvedSearchParams.adminId ||
    undefined;
  const topLocations = await getTopLocationsForTenant(targetAdminId);

  const rawHost = (
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const proto =
    (headerList.get("x-forwarded-proto") || "").split(",")[0].trim() ||
    (rawHost.includes("localhost") || rawHost.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const pageUrl = rawHost ? `${proto}://${rawHost}/portal-contact` : undefined;
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
            ? {
                "--ink-green": agencyBranding.settings.theme.primaryColor,
              }
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
        agencySlug={agencyBranding?.agencySlug || resolvedSearchParams.agency}
        adminId={targetAdminId}
        settings={agencyBranding?.settings}
      />
      <main className="flex-1">
        <PortalContactClient agencyBranding={agencyBranding} />
      </main>
      <PublicFooter
        agencyName={agencyBranding?.agencyName}
        agencySlug={agencyBranding?.agencySlug || resolvedSearchParams.agency}
        adminId={targetAdminId}
        topLocations={topLocations}
        settings={agencyBranding?.settings}
      />
    </div>
  );
}
