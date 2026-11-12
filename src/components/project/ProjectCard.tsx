"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Check,
  Eye,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { SanitizedPublicProject } from "@/services/publicPortalService";
import { formatPrice } from "@/lib/portalUtils";
import { motion, useReducedMotion } from "motion/react";

interface ProjectCardProps {
  project: SanitizedPublicProject;
  agencySlug?: string;
  onEnquireClick?: (project: SanitizedPublicProject) => void;
}

export function ProjectCard({ project, agencySlug, onEnquireClick }: ProjectCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeAgencySlug = agencySlug || project.agency?.agencySlug;
  const projectUrl = activeAgencySlug
    ? `/portal-projects/${project.slug || project.id}?agency=${activeAgencySlug}`
    : `/portal-projects/${project.slug || project.id}`;

  const priceDisplay = "Price on Request";

  return (
    <motion.article
      whileHover={shouldReduceMotion ? {} : { y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group relative bg-card-white border border-line hover:border-ink-green hover:shadow-hard-green transition-shadow flex flex-col justify-between"
    >
      {/* 170px Image Area */}
      <div className="relative h-[170px] w-full overflow-hidden bg-paper border-b border-line">
        <Link href={projectUrl} className="block w-full h-full">
          {project.media?.coverImage ? (
            <div className="relative w-full h-full overflow-hidden">
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full h-full"
              >
                <Image
                  src={project.media.coverImage}
                  alt={project.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </motion.div>
            </div>
          ) : (
            <div className="w-full h-full bg-[#14503d]/10 flex flex-col items-center justify-center p-4 text-center">
              <svg width="60" height="60" viewBox="0 0 64 64" fill="none" className="text-ink-green opacity-70">
                <rect x="8" y="24" width="20" height="34" fill="#0e3b2e" />
                <rect x="24" y="14" width="20" height="44" fill="#14503d" />
                <rect x="40" y="8" width="16" height="50" fill="#0b2d22" />
                <circle cx="50" cy="4" r="3" fill="#b5822c" />
              </svg>
              <span className="text-[10px] font-bold text-ink-green uppercase tracking-wider mt-1">
                Master Plan Development
              </span>
            </div>
          )}
        </Link>

        {/* Top-left ribbon */}
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2.5 py-0.5 bg-ink-green text-paper text-[10px] font-bold uppercase tracking-wider border border-brass">
            {project.projectType || "Residential"}
          </span>
        </div>

        {/* Top-right Status stamp */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <span className="px-2 py-0.5 bg-card-white/95 text-ink-green text-[10px] font-bold uppercase tracking-wider border border-ink-green flex items-center gap-1">
            <Check className="size-3 text-brass" strokeWidth={2.5} />
            {project.constructionStatus || "New Launch"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Price row */}
          <div className="mb-1.5">
            <span className="text-[10px] uppercase font-bold text-brass tracking-wider block">
              Investment Tier
            </span>
            <div className="font-serif text-[20px] font-bold text-ink-green leading-none mt-0.5">
              {priceDisplay}
            </div>
          </div>

          {/* Project Name */}
          <h3 className="font-semibold text-[15px] text-ink leading-snug line-clamp-1 group-hover:text-ink-green transition-colors">
            <Link href={projectUrl}>{project.name}</Link>
          </h3>

          {/* Locality */}
          <p className="text-xs text-muted-ink mt-1 flex items-center gap-1 line-clamp-1">
            <MapPin className="size-3 text-brass shrink-0" strokeWidth={1.5} />
            <span>
              {project.location?.address ? `${project.location.address}, ` : ""}
              {project.location?.city || "Nagpur"}
            </span>
          </p>

          {/* RERA Strip */}
          <div className="mt-3 py-1.5 px-2 bg-paper border border-line text-[11px] flex items-center justify-between text-muted-ink">
            <span className="flex items-center gap-1 font-medium truncate">
              <ShieldCheck className="size-3.5 text-brass shrink-0" strokeWidth={1.5} />
              <span className="truncate">RERA: {project.reraNumber || "Approved Phase I"}</span>
            </span>
            <span className="font-bold text-ink-green shrink-0">
              {project.totalUnits ? `${project.totalUnits} Units` : "Master Plan"}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 pt-2 flex items-center gap-2">
          <Link
            href={projectUrl}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold uppercase tracking-wider text-ink-green bg-card-white border border-ink-green hover:bg-paper transition-colors"
          >
            <Eye className="size-3.5" strokeWidth={1.5} />
            Master plan
          </Link>

          <button
            type="button"
            onClick={() => {
              if (onEnquireClick) {
                onEnquireClick(project);
              } else {
                window.location.href = `${projectUrl}#enquire`;
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold uppercase tracking-wider text-paper bg-brass hover:bg-brass-hover transition-colors shadow-hard-green-sm"
          >
            <Mail className="size-3.5" strokeWidth={1.5} />
            Enquire
          </button>
        </div>
      </div>
    </motion.article>
  );
}
