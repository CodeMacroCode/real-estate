import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/services/publicPortalService", () => ({
  resolveAdminByHostOrSlug: vi.fn(),
}));

import {
  buildPortalMetadata,
  buildRealEstateAgentJsonLd,
  buildRealEstateListingJsonLd,
  serializeJsonLd,
  type ResolvedAgencyBranding,
} from "@/lib/seo/portalMetadata";
import type {
  SanitizedPublicProject,
  SanitizedPublicProperty,
} from "@/services/publicPortalService";

function makeBranding(
  overrides: Partial<NonNullable<ResolvedAgencyBranding>> = {}
): NonNullable<ResolvedAgencyBranding> {
  return {
    adminId: "admin-1",
    agencyName: "Skyline Realty",
    agencySlug: "skyline-realty",
    hostname: "skylinerealty.com",
    customDomain: "skylinerealty.com",
    seo: {
      metaTitle: "Skyline Realty | Luxury Homes",
      metaDescription: "Curated luxury properties and verified developments.",
      keywords: "luxury homes, real estate, mumbai",
      ogImageUrl: "https://cdn.example.com/og-default.jpg",
      faviconUrl: "https://cdn.example.com/favicon.ico",
      googleSiteVerification: "google-verify-123",
      robotsIndex: true,
      pages: {
        propertiesTitle: "Exclusive Properties | Skyline",
        propertiesDescription: "Browse Skyline verified properties.",
        projectsTitle: "New Townships | Skyline",
        projectsDescription: "Explore Skyline new launch projects.",
        contactTitle: "Contact Skyline Desk",
        contactDescription: "Reach Skyline Realty headquarters.",
      },
    },
    settings: {
      branding: {
        companyName: "Skyline Realty Group",
        tagline: "Trusted Advisors",
        logoUrl: "https://cdn.example.com/logo.png",
      },
      hero: {
        subheadline: "Hero subheadline fallback",
      },
      contact: {
        phone: "+91 9876543210",
        email: "hello@skylinerealty.com",
        address: "101 Marine Drive",
        city: "Mumbai",
        pincode: "400001",
      },
      socialLinks: {
        facebook: "https://facebook.com/skyline",
        instagram: "https://instagram.com/skyline",
        linkedin: "",
      },
      seo: {
        metaTitle: "Skyline Realty | Luxury Homes",
        metaDescription: "Curated luxury properties and verified developments.",
        keywords: "luxury homes, real estate, mumbai",
        ogImageUrl: "https://cdn.example.com/og-default.jpg",
        faviconUrl: "https://cdn.example.com/favicon.ico",
        googleSiteVerification: "google-verify-123",
        robotsIndex: true,
        pages: {
          propertiesTitle: "Exclusive Properties | Skyline",
          propertiesDescription: "Browse Skyline verified properties.",
          projectsTitle: "New Townships | Skyline",
          projectsDescription: "Explore Skyline new launch projects.",
          contactTitle: "Contact Skyline Desk",
          contactDescription: "Reach Skyline Realty headquarters.",
        },
      },
    } as NonNullable<ResolvedAgencyBranding>["settings"],
    ...overrides,
  };
}

describe("portalMetadata SEO helpers", () => {
  describe("buildPortalMetadata", () => {
    it("applies per-page overrides, keywords, OG image, favicon, verification, robots, and canonical", () => {
      const agencyBranding = makeBranding();

      const propsMeta = buildPortalMetadata({
        pageType: "properties",
        agencyBranding,
        origin: "https://skylinerealty.com",
        pathname: "/portal-properties",
        isCustomDomain: true,
      });

      expect(propsMeta.title).toBe("Exclusive Properties | Skyline");
      expect(propsMeta.description).toBe("Browse Skyline verified properties.");
      expect(propsMeta.keywords).toEqual([
        "luxury homes",
        "real estate",
        "mumbai",
      ]);
      expect(propsMeta.robots).toEqual({ index: true, follow: true });
      expect(propsMeta.alternates?.canonical).toBe(
        "https://skylinerealty.com/portal-properties"
      );
      expect(propsMeta.icons).toEqual({
        icon: "https://cdn.example.com/favicon.ico",
        shortcut: "https://cdn.example.com/favicon.ico",
      });
      expect(propsMeta.verification).toEqual({ google: "google-verify-123" });
      expect(propsMeta.openGraph).toMatchObject({
        title: "Exclusive Properties | Skyline",
        description: "Browse Skyline verified properties.",
        url: "https://skylinerealty.com/portal-properties",
        siteName: "Skyline Realty Group",
        images: [
          { url: "https://cdn.example.com/og-default.jpg" },
          { url: "https://cdn.example.com/logo.png" },
        ],
      });

      const projectsMeta = buildPortalMetadata({
        pageType: "projects",
        agencyBranding,
        origin: "https://skylinerealty.com",
        pathname: "/portal-projects",
        isCustomDomain: true,
      });
      expect(projectsMeta.title).toBe("New Townships | Skyline");
      expect(projectsMeta.description).toBe(
        "Explore Skyline new launch projects."
      );

      const contactMeta = buildPortalMetadata({
        pageType: "contact",
        agencyBranding,
        origin: "https://skylinerealty.com",
        pathname: "/portal-contact",
        isCustomDomain: true,
      });
      expect(contactMeta.title).toBe("Contact Skyline Desk");
      expect(contactMeta.description).toBe("Reach Skyline Realty headquarters.");
    });

    it("falls back to branding companyName, hero subheadline, and logoUrl when seo is undefined", () => {
      const brandingNoSeo = makeBranding({
        seo: undefined,
        settings: {
          branding: {
            companyName: "Apex Estates",
            logoUrl: "https://cdn.example.com/apex-logo.png",
          },
          hero: {
            subheadline: "Premier residences across Pune.",
          },
        } as NonNullable<ResolvedAgencyBranding>["settings"],
      });

      const meta = buildPortalMetadata({
        pageType: "properties",
        agencyBranding: brandingNoSeo,
        origin: "https://apexestates.in",
        pathname: "/portal-properties",
        isCustomDomain: true,
      });

      expect(meta.title).toBe("Properties | Apex Estates");
      expect(meta.description).toBe("Premier residences across Pune.");
      expect(meta.icons).toBeUndefined();
      expect(meta.verification).toBeUndefined();
      expect(meta.robots).toEqual({ index: true, follow: true });
      expect(meta.openGraph?.images).toEqual([
        { url: "https://cdn.example.com/apex-logo.png" },
      ]);
    });

    it("falls back to default platform copy when agencyBranding is null", () => {
      const meta = buildPortalMetadata({
        pageType: "contact",
        agencyBranding: null,
        pathname: "/portal-contact",
      });

      expect(meta.title).toBe(
        "Contact & Office Headquarters | Verified Property Exchange"
      );
      expect(meta.description).toBe(
        "Direct customer support desk, office headquarters coordinates, and verified site visit appointments."
      );
      expect(meta.alternates?.canonical).toBe("/portal-contact");
      expect(meta.twitter).toMatchObject({ card: "summary" });
    });

    it("sets robots noindex/nofollow when seo.robotsIndex is false", () => {
      const noIndexBranding = makeBranding({
        seo: {
          robotsIndex: false,
        },
        settings: {
          branding: { companyName: "Private Realty" },
          seo: { robotsIndex: false },
        } as NonNullable<ResolvedAgencyBranding>["settings"],
      });

      const meta = buildPortalMetadata({
        pageType: "properties",
        agencyBranding: noIndexBranding,
        origin: "https://privaterealty.com",
        pathname: "/portal-properties",
        isCustomDomain: true,
      });

      expect(meta.robots).toEqual({ index: false, follow: false });
    });

    it("appends companyName on detail pages when not already present and prioritizes override images", () => {
      const agencyBranding = makeBranding();

      const detailMeta = buildPortalMetadata({
        pageType: "property-detail",
        agencyBranding,
        origin: "https://skylinerealty.com",
        pathname: "/portal-properties/sea-view-3bhk",
        isCustomDomain: true,
        overrides: {
          title: "Sea View 3BHK Apartment",
          description: "Spacious sea-facing apartment in Worli.",
          images: ["https://cdn.example.com/prop-1.jpg"],
          keywords: ["Worli", "3BHK"],
        },
      });

      expect(detailMeta.title).toBe(
        "Sea View 3BHK Apartment | Skyline Realty Group"
      );
      expect(detailMeta.description).toBe(
        "Spacious sea-facing apartment in Worli."
      );
      expect(detailMeta.keywords).toEqual([
        "Worli",
        "3BHK",
        "luxury homes",
        "real estate",
        "mumbai",
      ]);
      expect(detailMeta.openGraph?.images).toEqual([
        { url: "https://cdn.example.com/prop-1.jpg" },
        { url: "https://cdn.example.com/og-default.jpg" },
        { url: "https://cdn.example.com/logo.png" },
      ]);
    });
  });

  describe("buildRealEstateAgentJsonLd", () => {
    it("builds valid schema.org RealEstateAgent JSON-LD with address and social links", () => {
      const jsonLd = buildRealEstateAgentJsonLd({
        agencyBranding: makeBranding(),
        url: "https://skylinerealty.com/portal-contact",
      });

      expect(jsonLd).toEqual({
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        name: "Skyline Realty Group",
        description: "Curated luxury properties and verified developments.",
        url: "https://skylinerealty.com/portal-contact",
        image: "https://cdn.example.com/og-default.jpg",
        logo: "https://cdn.example.com/logo.png",
        telephone: "+91 9876543210",
        email: "hello@skylinerealty.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "101 Marine Drive",
          addressLocality: "Mumbai",
          postalCode: "400001",
        },
        sameAs: [
          "https://facebook.com/skyline",
          "https://instagram.com/skyline",
        ],
      });
    });
  });

  describe("buildRealEstateListingJsonLd", () => {
    it("builds RealEstateListing JSON-LD for a property with Offer and broker", () => {
      const property = {
        _id: "prop-1",
        title: "Sea View 3BHK",
        slug: "sea-view-3bhk",
        propertyType: "Apartment",
        transactionType: "Sale",
        location: {
          address: "Worli Sea Face",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400018",
        },
        pricing: {
          price: 45000000,
        },
        media: {
          featuredImage: "https://cdn.example.com/feat.jpg",
          images: [
            "https://cdn.example.com/feat.jpg",
            "https://cdn.example.com/2.jpg",
          ],
        },
        publishedAt: "2026-01-15T00:00:00.000Z",
        createdAt: "2026-01-10T00:00:00.000Z",
      } as unknown as SanitizedPublicProperty;

      const jsonLd = buildRealEstateListingJsonLd({
        kind: "property",
        item: property,
        agencyBranding: makeBranding(),
        url: "https://skylinerealty.com/portal-properties/sea-view-3bhk",
      });

      expect(jsonLd).toMatchObject({
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: "Sea View 3BHK",
        url: "https://skylinerealty.com/portal-properties/sea-view-3bhk",
        image: [
          "https://cdn.example.com/feat.jpg",
          "https://cdn.example.com/2.jpg",
        ],
        offers: {
          "@type": "Offer",
          price: 45000000,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
        broker: {
          "@type": "RealEstateAgent",
          name: "Skyline Realty Group",
        },
      });
    });

    it("builds RealEstateListing JSON-LD for a project", () => {
      const project = {
        _id: "proj-1",
        name: "Skyline Heights",
        slug: "skyline-heights",
        developerName: "Skyline Developers",
        projectType: "Residential",
        description: "Twin towers overlooking the bay.",
        location: {
          address: "Bandra West",
          city: "Mumbai",
          pincode: "400050",
        },
        media: {
          coverImage: "https://cdn.example.com/cover.jpg",
          images: ["https://cdn.example.com/p1.jpg"],
        },
        createdAt: "2026-02-01T00:00:00.000Z",
      } as unknown as SanitizedPublicProject;

      const jsonLd = buildRealEstateListingJsonLd({
        kind: "project",
        item: project,
        agencyBranding: makeBranding(),
        url: "https://skylinerealty.com/portal-projects/skyline-heights",
      });

      expect(jsonLd).toMatchObject({
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: "Skyline Heights by Skyline Developers",
        description: "Twin towers overlooking the bay.",
        image: [
          "https://cdn.example.com/cover.jpg",
          "https://cdn.example.com/p1.jpg",
        ],
      });
    });
  });

  describe("serializeJsonLd", () => {
    it("escapes < characters to prevent script tag injection", () => {
      const serialized = serializeJsonLd({
        name: "</script><script>alert(1)</script>",
      });
      expect(serialized).not.toContain("<");
      expect(serialized).toContain("\\u003c/script>");
    });
  });
});
