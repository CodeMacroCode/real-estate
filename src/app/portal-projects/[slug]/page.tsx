import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProjectBySlug } from "@/services/publicPortalService";
import { ProjectDetailInquiryForm } from "@/components/project/ProjectDetailInquiryForm";
import { ProjectMasterPlanViewer } from "@/components/project/ProjectMasterPlanViewer";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { formatPrice } from "@/lib/portalUtils";
import { MapPin, ShieldCheck, Check, ArrowLeft, Building } from "lucide-react";

interface PublicProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    agency?: string;
    adminId?: string;
  }>;
}

export async function generateMetadata({ params }: PublicProjectDetailPageProps) {
  const resolvedParams = await params;
  const project = await getPublicProjectBySlug(resolvedParams.slug);
  if (!project) {
    return { title: "Project Not Found" };
  }
  return {
    title: `${project.name} by ${project.developerName} | ${project.location.city}`,
    description: `Discover ${project.projectType} units at ${project.name} in ${project.location.city}. MahaRERA approved development.`,
  };
}

export default async function PublicProjectDetailPage({
  params,
  searchParams,
}: PublicProjectDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const project = await getPublicProjectBySlug(resolvedParams.slug);

  if (!project) {
    notFound();
  }

  const agencySlug = resolvedSearchParams.agency || project.agency?.agencySlug || "";
  const backToProjectsHref = agencySlug
    ? `/portal-projects?agency=${agencySlug}`
    : resolvedSearchParams.adminId || project.agency?.adminId
    ? `/portal-projects?adminId=${resolvedSearchParams.adminId || project.agency?.adminId}`
    : "/portal-projects";

  const priceDisplay = "Price on Request";

  const mainCover = project.media?.coverImage || project.media?.images?.[0];
  const galleryImages = [
    ...(project.media?.coverImage ? [project.media.coverImage] : []),
    ...(Array.isArray(project.media?.images) ? project.media.images : []),
  ];
  const uniqueImages = Array.from(new Set(galleryImages));

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between">
      <PublicHeader agencyName={project.agency?.agencyName} />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between text-xs pb-3 border-b border-line text-muted-ink">
            <div className="flex items-center gap-2">
              <Link
                href={backToProjectsHref}
                className="font-bold uppercase tracking-wider text-ink-green hover:text-brass flex items-center gap-1"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Projects</span>
              </Link>
              <span>/</span>
              <span className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
                {project.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-card-white border border-line text-muted-ink">
                {project.projectId || "PRJ-NAG"}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brass text-paper">
                {project.constructionStatus || "New Launch"}
              </span>
            </div>
          </div>

          {/* Main 2-column layout: Left details (8 cols) + Right sticky inquiry (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 columns */}
            <div className="lg:col-span-8 space-y-8">
              {/* Header card with Fraunces title and large brass price */}
              <div className="bg-card-white border-2 border-ink-green shadow-hard-brass p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass">
                    {project.projectType} Township &bull; By {project.developerName}
                  </span>
                  {project.reraNumber && (
                    <span className="text-xs font-mono text-muted-ink flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-brass" strokeWidth={1.5} />
                      MahaRERA: {project.reraNumber}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-green tracking-tight">
                  {project.name}
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-muted-ink flex items-center gap-1.5">
                  <MapPin className="size-4 text-brass shrink-0" strokeWidth={1.5} />
                  <span>
                    {project.location.address ? `${project.location.address}, ` : ""}
                    {project.location.city}
                  </span>
                </p>

                <div className="mt-6 pt-6 border-t border-line flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      Starting Investment
                    </span>
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-brass mt-1">
                      {priceDisplay}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      Construction Phasing
                    </span>
                    <div className="font-mono text-xs sm:text-sm font-bold text-ink-green mt-1">
                      {project.totalUnits ? `${project.totalUnits} Total Units` : "Master Sanction Layout"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery with main cover image plus thumbnail strip */}
              {mainCover && (
                <div className="bg-card-white border border-line p-4 space-y-3">
                  <div className="aspect-[16/9] w-full bg-paper border border-line overflow-hidden relative">
                    <img
                      src={mainCover}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-ink-green text-paper text-[10px] font-bold uppercase tracking-wider border border-brass">
                      Site Overview
                    </div>
                  </div>

                  {uniqueImages.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {uniqueImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          className="shrink-0 size-16 border border-line overflow-hidden bg-paper"
                        >
                          <img
                            src={imgUrl}
                            alt={`Gallery photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {project.description && (
                <div className="bg-card-white border border-line p-6 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                    01 &mdash; Project Brief
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ink-green">
                    Master Plan Development &amp; Architecture
                  </h3>
                  <div className="text-xs sm:text-sm text-body-muted leading-relaxed whitespace-pre-line">
                    {project.description}
                  </div>
                </div>
              )}

              {/* Amenities as square outlined chips with check icon */}
              {project.amenities && project.amenities.length > 0 && (
                <div className="bg-card-white border border-line p-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                    02 &mdash; Township Infrastructure
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ink-green">
                    Clubhouse, Sports &amp; Civic Amenities
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {project.amenities.map((amenity, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-paper border border-line flex items-center gap-2 text-xs font-semibold text-ink"
                      >
                        <Check className="size-3.5 text-brass shrink-0" strokeWidth={2} />
                        <span className="truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 columns: sticky inquiry card */}
            <div className="lg:col-span-4">
              <ProjectDetailInquiryForm
                projectId={project.id}
                projectName={project.name}
                projectCode={project.projectId}
                adminId={resolvedSearchParams.adminId || project.agency?.adminId}
              />
            </div>
          </div>

          {/* Blueprint Divider */}
          <div className="blueprint-divider my-10" />

          {/* Master Plan Viewer full-width below */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                03 &mdash; Engineering Blueprints
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-green mt-1">
                Sanctioned Site Layout &amp; Phasing Plans
              </h2>
            </div>

            <ProjectMasterPlanViewer
              projectName={project.name}
              masterPlanUrl={project.media?.masterPlanUrl || mainCover}
              reraNumber={project.reraNumber}
            />
          </div>
        </div>
      </main>

      <PublicFooter agencyName={project.agency?.agencyName} />
    </div>
  );
}
