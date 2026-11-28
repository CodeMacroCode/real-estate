import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  getPublicProjectBySlug,
  resolveAdminByHostOrSlug,
  getTopLocationsForTenant,
} from "@/services/publicPortalService";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import {
  buildPortalMetadata,
  buildRealEstateListingJsonLd,
  resolvePortalTenant,
  serializeJsonLd,
} from "@/lib/seo/portalMetadata";
import { ProjectDetailInquiryForm } from "@/components/project/ProjectDetailInquiryForm";
import { ProjectMasterPlanViewer } from "@/components/project/ProjectMasterPlanViewer";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { formatPrice } from "@/lib/portalUtils";
import {
  MapPin,
  ShieldCheck,
  Check,
  ArrowLeft,
  Building,
  Phone,
} from "lucide-react";

interface PublicProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    agency?: string;
    adminId?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicProjectDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tenant = await resolvePortalTenant(resolvedSearchParams);

  if (tenant.isCustomDomain && !tenant.agencyBranding) {
    return { title: "Project Not Found" };
  }

  const project = await getPublicProjectBySlug(
    resolvedParams.slug,
    tenant.isCustomDomain ? tenant.agencyBranding?.adminId : undefined,
  );
  if (!project) {
    return { title: "Project Not Found" };
  }

  let effectiveBranding = tenant.agencyBranding;
  if (!effectiveBranding) {
    const fallbackKey = project.agency?.agencySlug || project.agency?.adminId;
    if (fallbackKey) {
      effectiveBranding = await resolveAdminByHostOrSlug(fallbackKey);
    }
  }

  const projectImages = [
    ...(project.media?.coverImage ? [project.media.coverImage] : []),
    ...(Array.isArray(project.media?.images) ? project.media.images : []),
  ].filter(Boolean);

  return buildPortalMetadata({
    pageType: "project-detail",
    agencyBranding: effectiveBranding,
    origin: tenant.origin,
    pathname: `/portal-projects/${project.slug}`,
    isCustomDomain: tenant.isCustomDomain,
    overrides: {
      title: `${project.name} by ${project.developerName} | ${project.location.city}`,
      description:
        project.description?.trim() ||
        `Discover ${project.projectType} units at ${project.name} in ${project.location.city}. MahaRERA approved development.`,
      images: projectImages,
    },
  });
}

export default async function PublicProjectDetailPage({
  params,
  searchParams,
}: PublicProjectDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const headerList = await headers();
  const rawHost = (
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const normalizedHost = normalizeHostname(rawHost);
  const isCustomDomain = Boolean(normalizedHost && !isPlatformHost(normalizedHost));

  let tenantFromHost: Awaited<ReturnType<typeof resolveAdminByHostOrSlug>> = null;
  if (isCustomDomain) {
    tenantFromHost = await resolveAdminByHostOrSlug(normalizedHost);
    if (!tenantFromHost) {
      notFound();
    }
  }

  const project = await getPublicProjectBySlug(
    resolvedParams.slug,
    tenantFromHost?.adminId,
  );

  if (!project) {
    notFound();
  }

  const agencySlug = isCustomDomain
    ? tenantFromHost?.agencySlug || ""
    : resolvedSearchParams.agency || project.agency?.agencySlug || "";
  const targetAdminId = isCustomDomain
    ? tenantFromHost?.adminId
    : resolvedSearchParams.adminId || project.agency?.adminId;

  const agencyBranding = isCustomDomain
    ? tenantFromHost
    : agencySlug
    ? await resolveAdminByHostOrSlug(agencySlug)
    : targetAdminId
      ? await resolveAdminByHostOrSlug(targetAdminId)
      : null;

  const topLocations = await getTopLocationsForTenant(
    agencyBranding?.adminId || targetAdminId,
  );

  const officePhone =
    agencyBranding?.settings?.contact?.phone ||
    project.agency?.phone ||
    agencyBranding?.settings?.contact?.alternatePhone ||
    null;

  const backToProjectsHref = isCustomDomain
    ? "/portal-projects"
    : agencySlug
      ? `/portal-projects?agency=${agencySlug}`
      : targetAdminId
        ? `/portal-projects?adminId=${targetAdminId}`
        : "/portal-projects";

  const priceDisplay = "Price on Request";

  const mainCover = project.media?.coverImage || project.media?.images?.[0];
  const galleryImages = [
    ...(project.media?.coverImage ? [project.media.coverImage] : []),
    ...(Array.isArray(project.media?.images) ? project.media.images : []),
  ];
  const uniqueImages = Array.from(new Set(galleryImages));

  const proto =
    (headerList.get("x-forwarded-proto") || "").split(",")[0].trim() ||
    (normalizedHost === "localhost" || normalizedHost === "127.0.0.1"
      ? "http"
      : "https");
  const pageUrl = rawHost
    ? `${proto}://${rawHost}/portal-projects/${project.slug}`
    : undefined;
  const jsonLd = buildRealEstateListingJsonLd({
    kind: "project",
    item: project,
    agencyBranding,
    url: pageUrl,
  });

  return (
    <div
      className="min-h-screen bg-paper text-ink flex flex-col justify-between"
      style={
        {
          ...(agencyBranding?.settings?.theme?.primaryColor
            ? { "--ink-green": agencyBranding.settings.theme.primaryColor }
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PublicHeader
        agencyName={agencyBranding?.agencyName || project.agency?.agencyName}
        agencySlug={agencyBranding?.agencySlug || agencySlug || undefined}
        adminId={agencyBranding?.adminId || targetAdminId}
        settings={agencyBranding?.settings}
        isCustomDomain={isCustomDomain}
      />

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
                    {project.projectType} Township &bull; By{" "}
                    {project.developerName}
                  </span>
                  {project.reraNumber && (
                    <span className="text-xs font-mono text-muted-ink flex items-center gap-1">
                      <ShieldCheck
                        className="size-3.5 text-brass"
                        strokeWidth={1.5}
                      />
                      MahaRERA: {project.reraNumber}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-green tracking-tight">
                  {project.name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-muted-ink">
                  <p className="flex items-center gap-1.5">
                    <MapPin
                      className="size-4 text-brass shrink-0"
                      strokeWidth={1.5}
                    />
                    <span>
                      {project.location.address
                        ? `${project.location.address}, `
                        : ""}
                      {project.location.city}
                    </span>
                  </p>

                  {officePhone && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-line text-xs hidden sm:inline">&bull;</span>
                      <Phone
                        className="size-3.5 text-brass shrink-0"
                        strokeWidth={1.5}
                      />
                      <a
                        href={`tel:${officePhone}`}
                        className="hover:text-ink-green transition-colors"
                        title="Call Agency Office"
                      >
                        Office: {officePhone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-line flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      Starting Investment
                    </span>
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-brass mt-1">
                      {priceDisplay}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-6">
                    {project.carpetArea ? (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                          Carpet Area
                        </span>
                        <div className="font-mono text-xs sm:text-sm font-bold text-ink-green mt-1">
                          {project.carpetArea.toLocaleString()} Sq. Ft.
                        </div>
                      </div>
                    ) : null}

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                        Construction Phasing
                      </span>
                      <div className="font-mono text-xs sm:text-sm font-bold text-ink-green mt-1">
                        {project.totalUnits
                          ? `${project.totalUnits} Total Units`
                          : "Master Sanction Layout"}
                      </div>
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
                        <Check
                          className="size-3.5 text-brass shrink-0"
                          strokeWidth={2}
                        />
                        <span className="truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Project Location & Google Map */}
              {(project.location?.googleMapsEmbedUrl ||
                project.location?.address ||
                project.location?.city) && (
                <div className="bg-card-white border border-line p-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                    Strategic Project Location &amp; Map
                  </span>
                  <div className="flex items-center gap-2 text-xs text-ink font-semibold">
                    <MapPin className="size-4 text-brass shrink-0" />
                    <span>
                      {project.location?.address
                        ? `${project.location.address}, `
                        : ""}
                      {project.location?.city}
                    </span>
                  </div>
                  <div className="w-full h-64 sm:h-72 bg-paper border border-line relative overflow-hidden">
                    <iframe
                      src={(() => {
                        const raw =
                          project.location?.googleMapsEmbedUrl?.trim();
                        if (raw) {
                          if (raw.includes("<iframe")) {
                            const match = raw.match(/src=["'](.*?)["']/);
                            if (match && match[1]) return match[1];
                          } else if (
                            raw.startsWith("http://") ||
                            raw.startsWith("https://")
                          ) {
                            return raw;
                          }
                        }
                        const query = encodeURIComponent(
                          `${project.location?.address || ""}, ${project.location?.city || project.name}`,
                        );
                        return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
                      })()}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Google Map location of ${project.name}`}
                      className="w-full h-full"
                    />
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
                adminId={
                  resolvedSearchParams.adminId || project.agency?.adminId
                }
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

      <PublicFooter
        agencyName={agencyBranding?.agencyName || project.agency?.agencyName}
        agencySlug={agencyBranding?.agencySlug || agencySlug || undefined}
        adminId={agencyBranding?.adminId || targetAdminId}
        topLocations={topLocations}
        settings={agencyBranding?.settings}
        isCustomDomain={isCustomDomain}
      />
    </div>
  );
}
