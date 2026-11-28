import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getPublicPropertyBySlug, resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import {
  buildPortalMetadata,
  buildRealEstateListingJsonLd,
  resolvePortalTenant,
  serializeJsonLd,
} from "@/lib/seo/portalMetadata";
import { PropertyDetailInquiryForm } from "@/components/property/PropertyDetailInquiryForm";
import { InteractiveFloorMapViewer } from "@/components/property/InteractiveFloorMapViewer";
import { PropertyOverviewSpecs } from "@/components/property/PropertyOverviewSpecs";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { formatPrice, formatFloorOrdinal } from "@/lib/portalUtils";
import { shouldHideResidentialSpecsSection } from "@/lib/propertyFormHelpers";
import { MapPin, ShieldCheck, Check, ArrowLeft, Building, Navigation, ExternalLink } from "lucide-react";

interface PublicPropertyDetailPageProps {
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
}: PublicPropertyDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tenant = await resolvePortalTenant(resolvedSearchParams);

  if (tenant.isCustomDomain && !tenant.agencyBranding) {
    return { title: "Property Not Found" };
  }

  const property = await getPublicPropertyBySlug(
    resolvedParams.slug,
    tenant.isCustomDomain ? tenant.agencyBranding?.adminId : undefined,
  );
  if (!property) {
    return { title: "Property Not Found" };
  }

  let effectiveBranding = tenant.agencyBranding;
  if (!effectiveBranding) {
    const fallbackKey = property.agency?.agencySlug || property.agency?.adminId;
    if (fallbackKey) {
      effectiveBranding = await resolveAdminByHostOrSlug(fallbackKey);
    }
  }

  const propertyImages = [
    ...(property.media?.featuredImage ? [property.media.featuredImage] : []),
    ...(Array.isArray(property.media?.images) ? property.media.images : []),
  ].filter(Boolean);

  return buildPortalMetadata({
    pageType: "property-detail",
    agencyBranding: effectiveBranding,
    origin: tenant.origin,
    pathname: `/portal-properties/${property.slug}`,
    isCustomDomain: tenant.isCustomDomain,
    overrides: {
      title: `${property.title} | ${property.location.city}`,
      description: `${property.propertyType} for ${property.transactionType} in ${property.location.city}. Verified listing dossier.`,
      images: propertyImages,
    },
  });
}

export default async function PublicPropertyDetailPage({
  params,
  searchParams,
}: PublicPropertyDetailPageProps) {
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

  const property = await getPublicPropertyBySlug(
    resolvedParams.slug,
    tenantFromHost?.adminId,
  );

  if (!property) {
    notFound();
  }

  const agencySlug = isCustomDomain
    ? tenantFromHost?.agencySlug || ""
    : resolvedSearchParams.agency || property.agency?.agencySlug || "";
  const targetAdminId = isCustomDomain
    ? tenantFromHost?.adminId
    : resolvedSearchParams.adminId || property.agency?.adminId;

  // Fetch agency branding and custom theme settings
  const agencyBranding = isCustomDomain
    ? tenantFromHost
    : agencySlug
    ? await resolveAdminByHostOrSlug(agencySlug)
    : targetAdminId
    ? await resolveAdminByHostOrSlug(targetAdminId)
    : null;

  const backToListingsHref = isCustomDomain
    ? "/"
    : agencySlug
    ? `/portal-properties?agency=${agencySlug}`
    : targetAdminId
    ? `/portal-properties?adminId=${targetAdminId}`
    : "/portal-properties";

  const displayPrice =
    property.transactionType === "Rent" && property.pricing?.monthlyRent
      ? `₹ ${property.pricing.monthlyRent.toLocaleString("en-IN")} / month`
      : formatPrice(property.pricing?.price);

  const mainImage =
    property.media.featuredImage ||
    property.media.images?.[0];

  const galleryImages = [
    ...(property.media.featuredImage ? [property.media.featuredImage] : []),
    ...(Array.isArray(property.media.images) ? property.media.images : []),
  ];
  const uniqueImages = Array.from(new Set(galleryImages));

  // Resolved floor plans with corrected ordinal labels and no debug filters
  const resolvedFloorPlans = (
    property.media.floorPlanMaps && property.media.floorPlanMaps.length > 0
      ? property.media.floorPlanMaps
      : property.media.floorPlans && property.media.floorPlans.length > 0
      ? property.media.floorPlans.map((fpUrl, i) => ({
          floorName: formatFloorOrdinal(i),
          floorNumber: i,
          planImageUrl: fpUrl,
          roomTitle: property.title,
          status: "Available",
          hotspots: [],
        }))
      : [
          {
            floorName: "Unit Layout",
            floorNumber: 1,
            planImageUrl: mainImage || "",
            roomTitle: property.title,
            status: "Available",
            hotspots: [],
          },
        ]
  ).filter((fp: any) => Boolean(fp.planImageUrl));

  // Location & Google Map Configuration
  const latitude = property.location?.lat;
  const longitude = property.location?.lng;

  const addressParts = [
    property.location?.address,
    property.location?.landmark,
    property.location?.city,
    property.location?.state,
    property.location?.pincode,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const targetQuery = hasCoordinates
    ? `${latitude},${longitude}`
    : encodeURIComponent(fullAddress || `${property.title}, ${property.location?.city || ""}`);

  // Resolve custom Google Maps Embed URL or extract src from <iframe> code if provided
  const rawEmbedInput = property.location?.googleMapsEmbedUrl?.trim();
  let customEmbedSrc = "";
  if (rawEmbedInput) {
    if (rawEmbedInput.includes("<iframe")) {
      const match = rawEmbedInput.match(/src=["'](.*?)["']/);
      customEmbedSrc = match ? match[1] : "";
    } else if (rawEmbedInput.startsWith("http://") || rawEmbedInput.startsWith("https://")) {
      customEmbedSrc = rawEmbedInput;
    }
  }

  const mapEmbedUrl = customEmbedSrc || `https://maps.google.com/maps?q=${targetQuery}&z=15&output=embed`;

  const externalMapUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress || property.location?.city || property.title)}`;

  const directionsUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress || property.location?.city || property.title)}`;

  const hideResidentialSpecs = shouldHideResidentialSpecsSection(
    property.propertyType,
  );
  const showAmenitiesSection =
    !hideResidentialSpecs &&
    Boolean(property.amenities && property.amenities.length > 0);
  const floorPlanSectionNumber = showAmenitiesSection ? "04" : "03";

  const proto =
    (headerList.get("x-forwarded-proto") || "").split(",")[0].trim() ||
    (normalizedHost === "localhost" || normalizedHost === "127.0.0.1"
      ? "http"
      : "https");
  const pageUrl = rawHost
    ? `${proto}://${rawHost}/portal-properties/${property.slug}`
    : undefined;
  const jsonLd = buildRealEstateListingJsonLd({
    kind: "property",
    item: property,
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
        agencyName={agencyBranding?.agencyName || property.agency?.agencyName}
        agencySlug={agencySlug || undefined}
        adminId={targetAdminId}
        settings={agencyBranding?.settings}
        isCustomDomain={isCustomDomain}
      />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between text-xs pb-3 border-b border-line text-muted-ink">
            <div className="flex items-center gap-2">
              <Link
                href={backToListingsHref}
                className="font-bold uppercase tracking-wider text-ink-green hover:text-brass flex items-center gap-1"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Listings</span>
              </Link>
              <span>/</span>
              <span className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
                {property.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-card-white border border-line text-muted-ink">
                ID: {property.propertyId}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-ink-green text-paper border border-brass">
                For {property.transactionType}
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
                    {property.propertyCategory} &bull; {property.propertyType}
                  </span>
                  <span className="text-xs font-mono text-muted-ink flex items-center gap-1">
                    <ShieldCheck className="size-3.5 text-brass" strokeWidth={1.5} />
                    Verified Title
                  </span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-green tracking-tight">
                  {property.title}
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-muted-ink flex items-center gap-1.5">
                  <MapPin className="size-4 text-brass shrink-0" strokeWidth={1.5} />
                  <span>
                    {property.location.address ? `${property.location.address}, ` : ""}
                    {property.location.city}
                    {property.location.pincode ? ` - ${property.location.pincode}` : ""}
                  </span>
                </p>

                <div className="mt-6 pt-6 border-t border-line flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      Asking Consideration
                    </span>
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-brass mt-1">
                      {displayPrice}
                    </div>
                  </div>

                  {property.areaDetails?.carpetArea && property.pricing.price && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                        Unit Rate
                      </span>
                      <div className="font-mono text-xs sm:text-sm font-bold text-ink-green mt-1">
                        ₹ {Math.round(property.pricing.price / property.areaDetails.carpetArea).toLocaleString("en-IN")} / {property.areaDetails.areaUnit || "Sq. Ft."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery with main image plus thumbnail strip */}
              {mainImage && (
                <div className="bg-card-white border border-line p-4 space-y-3">
                  <div className="aspect-[16/9] w-full bg-paper border border-line overflow-hidden relative">
                    <img
                      src={mainImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-ink-green text-paper text-[10px] font-bold uppercase tracking-wider border border-brass">
                      Featured View
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

              {/* Specs as a ruled grid (PropertyOverviewSpecs) */}
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block mb-2">
                  01 &mdash; Unit Specifications
                </span>
                <PropertyOverviewSpecs
                  carpetArea={property.areaDetails?.carpetArea}
                  areaUnit={property.areaDetails?.areaUnit}
                  bedrooms={property.residentialSpecs?.bedrooms}
                  bathrooms={property.residentialSpecs?.bathrooms}
                  balconies={property.residentialSpecs?.balconies}
                  furnishing={property.residentialSpecs?.furnishing}
                  facing={property.residentialSpecs?.facing}
                  floorNo={property.residentialSpecs?.floorNumber}
                  totalFloors={property.residentialSpecs?.totalFloors}
                  propertyType={property.propertyType}
                  propertyCategory={property.propertyCategory}
                  officeNumber={
                    agencyBranding?.settings?.contact?.phone ||
                    property.agency?.phone ||
                    agencyBranding?.settings?.contact?.alternatePhone ||
                    undefined
                  }
                />
              </div>

              {/* Overview Details */}
              <div className="bg-card-white border border-line p-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                  02 &mdash; Editorial Summary
                </span>
                <h3 className="font-serif text-lg font-bold text-ink-green">
                  Property Dossier &amp; Status
                </h3>
                <div className="text-xs sm:text-sm text-body-muted leading-relaxed">
                  Verified {property.propertyCategory} {property.propertyType} located at {property.location.address}, {property.location.city}. Ready for immediate documentation inspection and title vetting.
                </div>
              </div>

              {/* Amenities as square outlined chips with check icon */}
              {showAmenitiesSection && (
                <div className="bg-card-white border border-line p-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                    03 &mdash; Sanctioned Amenities
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ink-green">
                    Infrastructure &amp; Society Provisions
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {property.amenities.map((amenity, idx) => (
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

            {/* Right 4 columns: sticky inquiry card + Property Location Map */}
            <div className="lg:col-span-4 space-y-6">
              <PropertyDetailInquiryForm
                propertyId={property.id}
                propertyTitle={property.title}
                propertyCode={property.propertyId}
                adminId={targetAdminId}
              />

              {/* Geographic Location & Embedded Google Map in Sidebar */}
              <div className="bg-card-white border border-line p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink-green uppercase tracking-wider">
                    <MapPin className="size-4 text-brass shrink-0" />
                    <span>Property Location</span>
                  </div>
                  <a
                    href={externalMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold tracking-wider uppercase text-brass hover:text-brass/80 flex items-center gap-1"
                  >
                    <span>Open in Maps</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {/* Location Meta Details */}
                <div className="p-3 bg-paper border border-line space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      Address
                    </span>
                    <span className="font-semibold text-ink block mt-0.5 leading-snug">
                      {property.location?.address || "Available on verified inquiry"}
                    </span>
                  </div>
                  {property.location?.landmark && (
                    <div className="pt-1.5 border-t border-line/60">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                        Landmark / Sector
                      </span>
                      <span className="font-semibold text-ink block mt-0.5">
                        {property.location.landmark}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-line/60">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-ink block">
                      City &amp; Postal District
                    </span>
                    <span className="font-semibold text-ink block mt-0.5">
                      {property.location?.city}
                      {property.location?.state ? `, ${property.location.state}` : ""}
                      {property.location?.pincode ? ` - ${property.location.pincode}` : ""}
                    </span>
                  </div>
                </div>

                {/* Embedded Google Map */}
                <div className="w-full h-64 sm:h-72 bg-paper border border-line relative overflow-hidden">
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Google Map location of ${property.title}`}
                    className="w-full h-full"
                  />
                </div>

                {/* Directions Button */}
                <div className="pt-1">
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 text-center text-xs font-bold tracking-wider uppercase bg-ink-green text-paper border border-brass hover:bg-brass hover:text-ink-green transition flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="size-3.5" />
                    <span>Get Directions</span>
                  </a>
                </div>

                <div className="text-[10px] text-muted-ink text-center pt-1">
                  Interactive Map &bull; Pan and zoom to inspect nearby roads &amp; surroundings
                </div>
              </div>
            </div>
          </div>

          {/* Blueprint Divider */}
          <div className="blueprint-divider my-10" />

          {/* Interactive Floor Map Viewer full-width below */}
          {resolvedFloorPlans.length > 0 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                  {floorPlanSectionNumber} &mdash; Architectural Floor Plans
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-green mt-1">
                  Blueprint Examination &amp; Spatial Inspection
                </h2>
              </div>

              <InteractiveFloorMapViewer
                floorPlans={resolvedFloorPlans}
                defaultPropertyTitle={property.title}
                propertyCategory={property.propertyCategory}
                propertyType={property.propertyType}
                carpetArea={property.areaDetails?.carpetArea}
                areaUnit={property.areaDetails?.areaUnit}
                bedrooms={property.residentialSpecs?.bedrooms}
                bathrooms={property.residentialSpecs?.bathrooms}
                furnishing={property.residentialSpecs?.furnishing}
                facing={property.residentialSpecs?.facing}
                city={property.location.city}
                address={property.location.address}
                amenities={property.amenities}
                propertyImages={property.media.images}
              />
            </div>
          )}
        </div>
      </main>

      <PublicFooter
        agencyName={agencyBranding?.agencyName || property.agency?.agencyName}
        agencySlug={agencySlug || undefined}
        adminId={targetAdminId}
        settings={agencyBranding?.settings}
        isCustomDomain={isCustomDomain}
      />
    </div>
  );
}
