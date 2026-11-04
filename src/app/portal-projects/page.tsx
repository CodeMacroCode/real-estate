import React from "react";
import { headers } from "next/headers";
import { getPublicProjects, resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import { PublicProjectsClient } from "./PublicProjectsClient";

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

  const agencyBranding = tenantFromHost || tenantFromQuery || null;

  const data = await getPublicProjects({
    adminId: targetAdminId,
    projectType: resolvedSearchParams.projectType,
    city: resolvedSearchParams.city,
    featured: resolvedSearchParams.featured,
    limit: 20,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <PublicProjectsClient
        initialProjects={data.projects}
        searchParams={resolvedSearchParams}
        agencyBranding={agencyBranding}
      />
    </main>
  );
}
