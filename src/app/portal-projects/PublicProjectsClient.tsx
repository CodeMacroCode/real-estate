"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Building,
  ShieldCheck,
  Search,
  ChevronRight,
} from "lucide-react";
import { SanitizedPublicProject } from "@/services/publicPortalService";
import { ProjectCard } from "@/components/project/ProjectCard";
import { ProjectInquiryModal } from "@/components/project/ProjectInquiryModal";
import { appendTenantQuery } from "@/lib/portalUtils";

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
  const router = useRouter();
  const [inquiryProject, setInquiryProject] =
    useState<SanitizedPublicProject | null>(null);

  const [activeType, setActiveType] = useState<string>(
    searchParams.projectType || ""
  );

  const agencyParam = agencyBranding?.agencySlug || searchParams.agency;
  const adminParam = agencyBranding?.adminId || searchParams.adminId;
  const tenant = { agency: agencyParam, adminId: adminParam };

  const handleTypeFilter = (type: string) => {
    setActiveType(type);
    const q = new URLSearchParams();
    if (type) q.set("projectType", type);
    if (agencyParam) q.set("agency", agencyParam);
    if (adminParam) q.set("adminId", adminParam);
    router.push(`/portal-projects?${q.toString()}`);
  };

  const projectTypes = [
    { label: "All Developments", value: "" },
    { label: "Residential Townships", value: "Residential" },
    { label: "Commercial Hubs", value: "Commercial" },
    { label: "Mixed-Use Parks", value: "Mixed-Use" },
    { label: "Plotted Estates", value: "Plotted" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Banner */}
      <div className="bg-ink-green text-paper p-8 sm:p-10 border-2 border-brass shadow-hard-brass">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <span className="text-xs uppercase font-bold tracking-[0.14em] text-brass block">
              MahaRERA Sanctioned Townships &bull; Nagpur Metropolitan Region
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-paper">
              {agencyBranding
                ? `${agencyBranding.agencyName} Master Developments`
                : "Approved Projects & Integrated Townships"}
            </h1>
            <p className="text-sm text-line/80 max-w-2xl leading-relaxed">
              Survey sanctioned master layout plans, environmental clearances, and phased inventory delivery across Nagpur&apos;s growth corridors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={appendTenantQuery("/portal-properties", tenant)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-card-white text-ink-green border border-line hover:border-ink-green"
            >
              Listings Directory
            </Link>
            <span className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-brass text-paper border border-brass">
              Projects Register
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-card-white border border-line p-3 flex items-center gap-2 overflow-x-auto shadow-xs">
        {projectTypes.map((tab) => {
          const isActive = activeType === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeFilter(tab.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                isActive
                  ? "bg-ink-green text-paper border-ink-green shadow-hard-brass-sm"
                  : "bg-paper text-ink border-transparent hover:border-line"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      <AnimatePresence mode="wait">
        {initialProjects.length > 0 ? (
          <motion.div
            key={activeType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {initialProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                agencySlug={agencyParam}
                onEnquireClick={(p) => setInquiryProject(p)}
              />
            ))}
          </motion.div>
        ) : (
          <div className="p-12 text-center bg-card-white border-2 border-dashed border-line">
            <Building className="size-12 mx-auto text-brass mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-lg font-bold text-ink-green">
              No development projects enrolled in this classification
            </h3>
            <p className="text-xs text-muted-ink mt-1">
              Check all master developments or switch back to verified individual properties.
            </p>
            <button
              type="button"
              onClick={() => handleTypeFilter("")}
              className="mt-4 px-4 py-2 bg-ink-green text-paper text-xs font-bold uppercase tracking-wider border border-ink-green"
            >
              Show All Projects
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Inquiry Modal */}
      <ProjectInquiryModal
        isOpen={Boolean(inquiryProject)}
        onClose={() => setInquiryProject(null)}
        project={
          inquiryProject
            ? {
                id: inquiryProject.id,
                name: inquiryProject.name,
                projectCode: inquiryProject.projectId,
                location: inquiryProject.location,
              }
            : null
        }
        adminId={adminParam}
      />
    </div>
  );
}
