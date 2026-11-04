"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SanitizedPublicProject } from "@/services/publicPortalService";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ProjectInquiryModal } from "@/components/project/ProjectInquiryModal";

interface PublicProjectsClientProps {
  initialProjects: SanitizedPublicProject[];
  searchParams: {
    agency?: string;
    adminId?: string;
    projectType?: string;
    city?: string;
    featured?: string;
  };
  agencyBranding?: {
    adminId: string;
    agencyName: string;
    agencySlug: string;
  } | null;
}

export function PublicProjectsClient({
  initialProjects,
  searchParams,
  agencyBranding,
}: PublicProjectsClientProps) {
  const [inquiryProject, setInquiryProject] =
    useState<SanitizedPublicProject | null>(null);

  const agencyParam = agencyBranding?.agencySlug || searchParams.agency;
  const adminParam = agencyBranding?.adminId || searchParams.adminId;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header & Tabs */}
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
            {agencyBranding
              ? `${agencyBranding.agencyName} Projects`
              : "Featured Projects & Developments"}
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
              agencyParam
                ? `/portal-properties?agency=${agencyParam}`
                : adminParam
                  ? `/portal-properties?adminId=${adminParam}`
                  : "/portal-properties"
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Properties
          </Link>
          <Link
            href={
              agencyParam
                ? `/portal-projects?agency=${agencyParam}`
                : adminParam
                  ? `/portal-projects?adminId=${adminParam}`
                  : "/portal-projects"
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
          >
            Projects & Developments
          </Link>
        </div>
      </div>

      {/* Projects Grid */}
      {initialProjects.length === 0 ? (
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
          {initialProjects.map((prj) => (
            <ProjectCard
              key={prj.id}
              project={prj}
              agencySlug={agencyParam}
              onEnquireClick={(project) => setInquiryProject(project)}
            />
          ))}
        </div>
      )}

      {/* SweetAlert Project Inquiry Modal */}
      <ProjectInquiryModal
        isOpen={Boolean(inquiryProject)}
        onClose={() => setInquiryProject(null)}
        project={inquiryProject}
        adminId={agencyBranding?.adminId || searchParams.adminId}
      />
    </div>
  );
}
