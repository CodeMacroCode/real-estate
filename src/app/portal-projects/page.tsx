import React from "react";
import { headers } from "next/headers";
import { getPublicProjects, resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import Link from "next/link";
import { ProjectCard } from "@/components/project/ProjectCard";

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {agencyBranding && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
                <span>Verified Agency Portfolio</span>
                <span>•</span>
                <span>{agencyBranding.agencyName}</span>
              </div>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {agencyBranding ? `${agencyBranding.agencyName} Projects` : "Featured Projects & Developments"}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              {agencyBranding
                ? `Approved master developments, towers & layouts directly represented by ${agencyBranding.agencyName}.`
                : "Approved master-planned communities, luxury high-rises, and prime commercial hubs."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={
                resolvedSearchParams.agency
                  ? `/portal-properties?agency=${resolvedSearchParams.agency}`
                  : resolvedSearchParams.adminId
                    ? `/portal-properties?adminId=${resolvedSearchParams.adminId}`
                    : "/portal-properties"
              }
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Properties
            </Link>
            <Link
              href={
                resolvedSearchParams.agency
                  ? `/portal-projects?agency=${resolvedSearchParams.agency}`
                  : resolvedSearchParams.adminId
                    ? `/portal-projects?adminId=${resolvedSearchParams.adminId}`
                    : "/portal-projects"
              }
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
            >
              Projects & Developments
            </Link>
          </div>
        </div>

        {data.projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <h3 className="text-base font-semibold text-slate-800">
              No active public projects
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Check back soon for new project launches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.projects.map((prj) => (
              <ProjectCard
                key={prj.id}
                project={prj}
                agencySlug={agencyBranding?.agencySlug || resolvedSearchParams.agency}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
