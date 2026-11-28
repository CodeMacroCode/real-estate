import type { Metadata } from "next";
import { headers } from "next/headers";
import { isPlatformHost, normalizeHostname } from "@/lib/domains/normalize";
import { resolveAdminByHostOrSlug } from "@/services/publicPortalService";
import type {
  SanitizedPublicProject,
  SanitizedPublicProperty,
} from "@/services/publicPortalService";

export type ResolvedAgencyBranding = Awaited<
  ReturnType<typeof resolveAdminByHostOrSlug>
>;

export interface PortalSeoSettings {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogImageUrl?: string;
  faviconUrl?: string;
  googleSiteVerification?: string;
  robotsIndex?: boolean;
  pages?: {
    propertiesTitle?: string;
    propertiesDescription?: string;
    projectsTitle?: string;
    projectsDescription?: string;
    contactTitle?: string;
    contactDescription?: string;
  };
}

export type PortalPageType =
  | "properties"
  | "projects"
  | "contact"
  | "property-detail"
  | "project-detail";

export interface PortalTenantContext {
  rawHost: string;
  normalizedHost: string;
  protocol: string;
  origin: string;
  isCustomDomain: boolean;
  agencyBranding: ResolvedAgencyBranding;
}

const DEFAULT_PAGE_COPY: Record<
  "properties" | "projects" | "contact",
  { title: string; description: string }
> = {
  properties: {
    title: "Browse Properties & Real Estate Listings",
    description:
      "Explore RERA-verified residential, commercial, and land investments.",
  },
  projects: {
    title: "Approved Real Estate Projects & Townships",
    description:
      "Browse verified residential and commercial developments from leading builders.",
  },
  contact: {
    title: "Contact & Office Headquarters | Verified Property Exchange",
    description:
      "Direct customer support desk, office headquarters coordinates, and verified site visit appointments.",
  },
};

function getSeoSettings(
  agencyBranding: ResolvedAgencyBranding
): PortalSeoSettings | undefined {
  if (!agencyBranding) return undefined;
  const brandingAny = agencyBranding as Record<string, any>;
  return (brandingAny.seo || agencyBranding.settings?.seo) as
    | PortalSeoSettings
    | undefined;
}

function getBrandingInfo(agencyBranding: ResolvedAgencyBranding) {
  const settings = agencyBranding?.settings;
  const companyName =
    settings?.branding?.companyName?.trim() ||
    agencyBranding?.agencyName?.trim() ||
    "";
  const subheadline =
    settings?.hero?.subheadline?.trim() ||
    settings?.branding?.tagline?.trim() ||
    "";
  const logoUrl = settings?.branding?.logoUrl?.trim() || "";
  return { companyName, subheadline, logoUrl };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Resolves the current portal tenant from request headers (`x-forwarded-host` / `host`)
 * and optional URL `searchParams` (`agency` / `adminId`).
 * On custom domains, tenant resolution is strictly locked to the host header.
 */
export async function resolvePortalTenant(searchParams?: {
  agency?: string;
  adminId?: string;
}): Promise<PortalTenantContext> {
  const headerList = await headers();
  const rawHost = (
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();

  const normalizedHost = normalizeHostname(rawHost);
  const isCustomDomain = Boolean(
    normalizedHost && !isPlatformHost(normalizedHost)
  );

  const forwardedProto = (headerList.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const isLocalHost =
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.endsWith(".localhost");
  const protocol = forwardedProto || (isLocalHost ? "http" : "https");
  const origin = rawHost ? `${protocol}://${rawHost}` : "";

  let agencyBranding: ResolvedAgencyBranding = null;

  if (isCustomDomain) {
    agencyBranding = await resolveAdminByHostOrSlug(normalizedHost);
  } else {
    const queryKey = searchParams?.agency || searchParams?.adminId;
    if (queryKey) {
      agencyBranding = await resolveAdminByHostOrSlug(queryKey);
    } else if (rawHost) {
      agencyBranding = await resolveAdminByHostOrSlug(rawHost);
    }
  }

  return {
    rawHost,
    normalizedHost,
    protocol,
    origin,
    isCustomDomain,
    agencyBranding,
  };
}

export interface BuildPortalMetadataInput {
  pageType: PortalPageType;
  agencyBranding: ResolvedAgencyBranding;
  origin?: string;
  pathname: string;
  isCustomDomain?: boolean;
  overrides?: {
    title?: string;
    description?: string;
    images?: string[];
    keywords?: string[];
  };
}

/**
 * Builds Next.js `Metadata` for a public portal page using the agency's SEO settings
 * with fallbacks to branding companyName and hero subheadline.
 */
export function buildPortalMetadata({
  pageType,
  agencyBranding,
  origin = "",
  pathname,
  isCustomDomain = false,
  overrides,
}: BuildPortalMetadataInput): Metadata {
  const seo = getSeoSettings(agencyBranding);
  const { companyName, subheadline, logoUrl } = getBrandingInfo(agencyBranding);

  let title = overrides?.title?.trim() || "";
  let description = overrides?.description?.trim() || "";

  if (!title) {
    if (pageType === "properties") {
      title =
        seo?.pages?.propertiesTitle?.trim() ||
        seo?.metaTitle?.trim() ||
        (companyName
          ? `Properties | ${companyName}`
          : DEFAULT_PAGE_COPY.properties.title);
    } else if (pageType === "projects") {
      title =
        seo?.pages?.projectsTitle?.trim() ||
        seo?.metaTitle?.trim() ||
        (companyName
          ? `Projects & Townships | ${companyName}`
          : DEFAULT_PAGE_COPY.projects.title);
    } else if (pageType === "contact") {
      title =
        seo?.pages?.contactTitle?.trim() ||
        (companyName
          ? `Contact | ${companyName}`
          : seo?.metaTitle?.trim() || DEFAULT_PAGE_COPY.contact.title);
    } else {
      title =
        seo?.metaTitle?.trim() ||
        companyName ||
        "Verified Real Estate Listing";
    }
  } else if (
    (pageType === "property-detail" || pageType === "project-detail") &&
    companyName &&
    !title.toLowerCase().includes(companyName.toLowerCase())
  ) {
    title = `${title} | ${companyName}`;
  }

  if (!description) {
    if (pageType === "properties") {
      description =
        seo?.pages?.propertiesDescription?.trim() ||
        seo?.metaDescription?.trim() ||
        subheadline ||
        DEFAULT_PAGE_COPY.properties.description;
    } else if (pageType === "projects") {
      description =
        seo?.pages?.projectsDescription?.trim() ||
        seo?.metaDescription?.trim() ||
        subheadline ||
        DEFAULT_PAGE_COPY.projects.description;
    } else if (pageType === "contact") {
      description =
        seo?.pages?.contactDescription?.trim() ||
        seo?.metaDescription?.trim() ||
        subheadline ||
        DEFAULT_PAGE_COPY.contact.description;
    } else {
      description = seo?.metaDescription?.trim() || subheadline || "";
    }
  }

  const parsedSeoKeywords = (seo?.keywords || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const combinedKeywords = Array.from(
    new Set([...(overrides?.keywords || []), ...parsedSeoKeywords])
  );

  const rawImages = [
    ...(overrides?.images || []),
    ...(seo?.ogImageUrl?.trim() ? [seo.ogImageUrl.trim()] : []),
    ...(logoUrl ? [logoUrl] : []),
  ].filter(Boolean);
  const ogImages = Array.from(new Set(rawImages));

  const customDomainHost = (
    (agencyBranding as Record<string, any>)?.customDomain || ""
  ).trim();
  const baseOrigin =
    origin ||
    (isCustomDomain && customDomainHost ? `https://${customDomainHost}` : "");
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const canonicalUrl = baseOrigin ? `${baseOrigin}${cleanPath}` : cleanPath;

  const shouldIndex = seo?.robotsIndex !== false;
  const faviconUrl = seo?.faviconUrl?.trim();
  const googleVerification = seo?.googleSiteVerification?.trim();

  const metadata: Metadata = {
    title,
    description,
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      ...(companyName ? { siteName: companyName } : {}),
      ...(ogImages.length > 0
        ? { images: ogImages.map((url) => ({ url })) }
        : {}),
    },
    twitter: {
      card: ogImages.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImages.length > 0 ? { images: ogImages } : {}),
    },
  };

  if (combinedKeywords.length > 0) {
    metadata.keywords = combinedKeywords;
  }

  if (faviconUrl) {
    metadata.icons = {
      icon: faviconUrl,
      shortcut: faviconUrl,
    };
  }

  if (googleVerification) {
    metadata.verification = {
      google: googleVerification,
    };
  }

  return metadata;
}

/**
 * Convenience helper for listing/contact portal pages: resolves tenant from headers + searchParams
 * and builds Next.js Metadata.
 */
export async function getPortalPageMetadata(options: {
  pageType: "properties" | "projects" | "contact";
  pathname: string;
  searchParams?: { agency?: string; adminId?: string };
}): Promise<Metadata> {
  const tenant = await resolvePortalTenant(options.searchParams);
  const suffix =
    !tenant.isCustomDomain && options.searchParams?.agency
      ? `?agency=${encodeURIComponent(options.searchParams.agency)}`
      : !tenant.isCustomDomain && options.searchParams?.adminId
      ? `?adminId=${encodeURIComponent(options.searchParams.adminId)}`
      : "";

  return buildPortalMetadata({
    pageType: options.pageType,
    agencyBranding: tenant.agencyBranding,
    origin: tenant.origin,
    pathname: `${options.pathname}${suffix}`,
    isCustomDomain: tenant.isCustomDomain,
  });
}

/**
 * Builds schema.org `RealEstateAgent` JSON-LD for listing and contact pages.
 */
export function buildRealEstateAgentJsonLd(options: {
  agencyBranding: ResolvedAgencyBranding;
  url?: string;
  description?: string;
}): Record<string, unknown> {
  const { agencyBranding, url, description } = options;
  const seo = getSeoSettings(agencyBranding);
  const { companyName, subheadline, logoUrl } = getBrandingInfo(agencyBranding);
  const contact = agencyBranding?.settings?.contact;
  const socialLinks = agencyBranding?.settings?.socialLinks;

  const sameAs = [
    socialLinks?.facebook,
    socialLinks?.instagram,
    socialLinks?.linkedin,
    socialLinks?.youtube,
    socialLinks?.twitter,
  ]
    .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  const addressObj = stripUndefined({
    "@type": "PostalAddress",
    streetAddress: contact?.address?.trim(),
    addressLocality: contact?.city?.trim(),
    postalCode: contact?.pincode?.trim(),
  });

  const hasAddress =
    Boolean(addressObj.streetAddress) ||
    Boolean(addressObj.addressLocality) ||
    Boolean(addressObj.postalCode);

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: companyName || "Real Estate Agency",
    description:
      description?.trim() ||
      seo?.metaDescription?.trim() ||
      subheadline ||
      undefined,
    url: url || undefined,
    image: seo?.ogImageUrl?.trim() || logoUrl || undefined,
    logo: logoUrl || undefined,
    telephone: contact?.phone?.trim() || undefined,
    email: contact?.email?.trim() || undefined,
    address: hasAddress ? addressObj : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

/**
 * Builds schema.org `RealEstateListing` JSON-LD for property and project detail pages.
 */
export function buildRealEstateListingJsonLd(
  options:
    | {
        kind: "property";
        item: SanitizedPublicProperty;
        agencyBranding: ResolvedAgencyBranding;
        url?: string;
      }
    | {
        kind: "project";
        item: SanitizedPublicProject;
        agencyBranding: ResolvedAgencyBranding;
        url?: string;
      }
): Record<string, unknown> {
  const { agencyBranding, url } = options;
  const { companyName } = getBrandingInfo(agencyBranding);
  const contact = agencyBranding?.settings?.contact;

  if (options.kind === "property") {
    const property = options.item;
    const images = Array.from(
      new Set(
        [
          property.media?.featuredImage,
          ...(Array.isArray(property.media?.images)
            ? property.media.images
            : []),
        ].filter(Boolean)
      )
    );

    const priceValue =
      property.transactionType === "Rent"
        ? property.pricing?.monthlyRent
        : property.pricing?.price;

    const addressObj = stripUndefined({
      "@type": "PostalAddress",
      streetAddress: property.location?.address?.trim(),
      addressLocality: property.location?.city?.trim(),
      addressRegion: property.location?.state?.trim(),
      postalCode: property.location?.pincode?.trim(),
    });

    const brokerObj = stripUndefined({
      "@type": "RealEstateAgent",
      name: companyName || property.agency?.agencyName || undefined,
      telephone: contact?.phone?.trim() || property.agency?.phone || undefined,
      email: contact?.email?.trim() || property.agency?.email || undefined,
    });

    return stripUndefined({
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: property.title,
      description: `${property.propertyType} for ${property.transactionType} in ${property.location.city}. Verified listing dossier.`,
      url: url || undefined,
      datePosted: property.publishedAt || property.createdAt,
      image: images.length > 0 ? images : undefined,
      address:
        addressObj.streetAddress || addressObj.addressLocality
          ? addressObj
          : undefined,
      offers:
        typeof priceValue === "number" && priceValue > 0
          ? {
              "@type": "Offer",
              price: priceValue,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            }
          : undefined,
      broker: brokerObj.name ? brokerObj : undefined,
    });
  }

  const project = options.item;
  const images = Array.from(
    new Set(
      [
        project.media?.coverImage,
        ...(Array.isArray(project.media?.images) ? project.media.images : []),
      ].filter(Boolean)
    )
  );

  const addressObj = stripUndefined({
    "@type": "PostalAddress",
    streetAddress: project.location?.address?.trim(),
    addressLocality: project.location?.city?.trim(),
    postalCode: project.location?.pincode?.trim(),
  });

  const brokerObj = stripUndefined({
    "@type": "RealEstateAgent",
    name: companyName || project.agency?.agencyName || undefined,
    telephone: contact?.phone?.trim() || project.agency?.phone || undefined,
    email: contact?.email?.trim() || project.agency?.email || undefined,
  });

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${project.name} by ${project.developerName}`,
    description:
      project.description?.trim() ||
      `Discover ${project.projectType} units at ${project.name} in ${project.location.city}.`,
    url: url || undefined,
    datePosted: project.createdAt,
    image: images.length > 0 ? images : undefined,
    address:
      addressObj.streetAddress || addressObj.addressLocality
        ? addressObj
        : undefined,
    broker: brokerObj.name ? brokerObj : undefined,
  });
}

/**
 * Safely serializes a JSON-LD object for inline `<script type="application/ld+json">`.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
