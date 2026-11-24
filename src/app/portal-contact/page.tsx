import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PortalContactClient } from "./PortalContactClient";

export const metadata = {
  title: "Contact & Office Headquarters | Verified Property Exchange",
  description:
    "Direct customer support desk, office headquarters coordinates, and verified site visit appointments.",
};

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

  const targetAdminId =
    agencyBranding?.adminId ||
    resolvedSearchParams.adminId ||
    undefined;
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
        settings={agencyBranding?.settings}
      />
      <main className="flex-1">
        <PortalContactClient agencyBranding={agencyBranding} />
      </main>
      <PublicFooter
        agencyName={agencyBranding?.agencyName}
        topLocations={topLocations}
        settings={agencyBranding?.settings}
      />
    </div>
  );
}
