import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getPublicProjects,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import {
  buildRealEstateAgentJsonLd,
  getPortalPageMetadata,
  serializeJsonLd,
} from "@/lib/seo/portalMetadata";
import { PublicProjectsClient } from "./PublicProjectsClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export async function generateMetadata({
  searchParams,
}: PublicProjectsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  return getPortalPageMetadata({
    pageType: "projects",
    pathname: "/portal-projects",
    searchParams: resolvedSearchParams,
  });
}

interface PublicProjectsPageProps {
  searchParams: Promise<{
    adminId?: string;
    agency?: string;
    projectType?: string;
    city?: string;
    featured?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function PublicProjectsPage({
  searchParams,
}: PublicProjectsPageProps) {
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
    const nextParams = new URLSearchParams();
    for (const [k, v] of Object.entries(resolvedSearchParams)) {
      if (v !== undefined && k !== "adminId" && k !== "agency") {
        nextParams.set(k, v);
      }
    }
    nextParams.set("agency", agencyBranding.agencySlug);
    redirect(`/portal-projects?${nextParams.toString()}`);
  }

  const targetAdminId =
    agencyBranding?.adminId ||
    resolvedSearchParams.adminId ||
    undefined;

  const data = await getPublicProjects({
    adminId: targetAdminId,
    projectType: resolvedSearchParams.projectType,
    city: resolvedSearchParams.city,
    featured: resolvedSearchParams.featured,
    limit: 20,
  });

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
  const pageUrl = rawHost ? `${proto}://${rawHost}/portal-projects` : undefined;
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
        agencySlug={agencyBranding?.agencySlug || resolvedSearchParams.agency}
        adminId={targetAdminId}
        settings={agencyBranding?.settings}
      />
      <main className="flex-1">
        <PublicProjectsClient
          initialProjects={data.projects}
          searchParams={resolvedSearchParams}
          agencyBranding={agencyBranding}
        />
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
