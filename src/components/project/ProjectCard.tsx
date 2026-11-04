"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Layers,
} from "lucide-react";
import { SanitizedPublicProject } from "@/services/publicPortalService";

interface ProjectCardProps {
  project: SanitizedPublicProject;
  agencySlug?: string;
}

export function ProjectCard({ project, agencySlug }: ProjectCardProps) {
  const activeAgencySlug = agencySlug || project.agency?.agencySlug;
  const projectUrl = activeAgencySlug
    ? `/portal-projects/${project.slug || project.id}?agency=${activeAgencySlug}`
    : `/portal-projects/${project.slug || project.id}`;
  const totalPhotos =
    (project.media?.coverImage ? 1 : 0) +
    (Array.isArray(project.media?.images) ? project.media.images.length : 0);

  return (
    <div className="premium-property-card group relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between">
      {/* =========================================================================
          Cover Image Section with Zoom & Hover Overlay
          ========================================================================= */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Link href={projectUrl} className="block w-full h-full cursor-pointer">
          {project.media?.coverImage ? (
            <img
              src={project.media.coverImage}
              alt={project.name}
              className="premium-property-card__image w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-300 bg-slate-50">
              <Building2 className="size-10 stroke-[1.2]" />
              <span className="text-[11px] font-medium text-slate-400 mt-1">
                Project image coming soon
              </span>
            </div>
          )}

          {/* Low-opacity Dark Overlay on hover */}
          <div className="premium-property-card__overlay absolute inset-0 pointer-events-none" />
        </Link>

        {/* Top Badges (Left) */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-indigo-600 text-white shadow-xs backdrop-blur-xs">
            {project.projectType}
          </span>

          {project.featuredOnWebsite && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-400 text-amber-950 shadow-xs">
              ★ Featured
            </span>
          )}
        </div>

        {/* Top-Right: Status Badge */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/80 backdrop-blur-md text-white shadow-xs">
            {project.constructionStatus}
          </span>
        </div>

        {/* Bottom Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-md">
            <span className="text-[10px] text-slate-300 block font-medium uppercase tracking-wider">
              By {project.developerName}
            </span>
            <div className="text-sm font-extrabold tracking-tight">
              {project.name}
            </div>
          </div>

          {totalPhotos > 1 && (
            <div className="bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider">
              {totalPhotos} Photos
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          Information Section
          ========================================================================= */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location & RERA */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate">
              <MapPin className="size-3 text-slate-400 shrink-0" />
              {project.location.address ? `${project.location.address}, ` : ""}
              {project.location.city}
            </span>
          </div>

          {project.reraNumber && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-1">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              <span>RERA: {project.reraNumber}</span>
            </div>
          )}

          {/* Unit Counts Rollup */}
          <div className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5 text-xs text-center">
            <div className="border-r border-slate-100 pr-2">
              <span className="text-[10px] text-slate-400 block font-medium">
                Inventory
              </span>
              <span className="font-bold text-slate-800">
                {project.totalUnits} Total Units
              </span>
            </div>
            <div className="pl-2">
              <span className="text-[10px] text-slate-400 block font-medium">
                Availability
              </span>
              <span className="font-bold text-emerald-600">
                {project.availableUnits} Available
              </span>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-4 pt-1 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">
            {project.projectId}
          </span>
          <Link
            href={projectUrl}
            className="premium-property-card__cta inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <span>Explore Project</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
