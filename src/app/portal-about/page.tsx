import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PortalAboutClient } from "./PortalAboutClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About Us | Verified Property Exchange",
  description:
    "Learn about our real estate advisory, RERA compliance standards, mission, and track record.",
};

interface PortalAboutPageProps {
  searchParams: Promise<{
    adminId?: string;
    agency?: string;
  }>;
}

export default async function PortalAboutPage({
  searchParams,
}: PortalAboutPageProps) {
  const resolvedSearchParams = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host") || "";

  // 1. Explicit URL query parameter has HIGHEST priority (?agency=... or ?adminId=...)
  const tenantFromQuery = resolvedSearchParams.agency
    ? await resolveAdminByHostOrSlug(resolvedSearchParams.agency)
    : resolvedSearchParams.adminId
      ? await resolveAdminByHostOrSlug(resolvedSearchParams.adminId)
      : null;

  // 2. Fallback to Host header if no explicit query param was supplied
  const tenantFromHost =
    !tenantFromQuery && host ? await resolveAdminByHostOrSlug(host) : null;

  const agencyBranding = tenantFromQuery || tenantFromHost || null;

  if (
    !resolvedSearchParams.agency &&
    resolvedSearchParams.adminId &&
    agencyBranding?.agencySlug
  ) {
    redirect(`/portal-about?agency=${encodeURIComponent(agencyBranding.agencySlug)}`);
  }

  const targetAdminId =
    agencyBranding?.adminId || resolvedSearchParams.adminId || undefined;
  const topLocations = await getTopLocationsForTenant(targetAdminId);

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
      <PublicHeader
        agencyName={agencyBranding?.agencyName}
        agencySlug={agencyBranding?.agencySlug || resolvedSearchParams.agency}
        adminId={targetAdminId}
        settings={agencyBranding?.settings}
      />
      <main className="flex-1">
        <PortalAboutClient agencyBranding={agencyBranding} />
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
