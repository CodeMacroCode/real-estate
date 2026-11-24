import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getPublicProjects,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { PublicProjectsClient } from "./PublicProjectsClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata = {
  title: "Approved Real Estate Projects & Townships",
  description:
    "Browse verified residential and commercial developments from leading builders.",
};

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
        <PublicProjectsClient
          initialProjects={data.projects}
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
