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
  // Must provide a valid agency slug or adminId (e.g. /portal-projects?agency=prasad)
  if (!targetAdminId) {
    notFound();
  }

  const agencyBranding = tenantFromHost || tenantFromQuery || null;

  const data = await getPublicProjects({
    adminId: targetAdminId,
    projectType: resolvedSearchParams.projectType,
    city: resolvedSearchParams.city,
    featured: resolvedSearchParams.featured,
    limit: 20,
  });

  const topLocations = await getTopLocationsForTenant(targetAdminId);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between">
      <PublicHeader agencyName={agencyBranding?.agencyName} />
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
      />
    </div>
  );
}
