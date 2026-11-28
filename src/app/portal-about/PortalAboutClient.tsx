"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Award,
  Target,
  Compass,
  Building2,
  ArrowRight,
  Phone,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { appendTenantQuery } from "@/lib/portalUtils";

interface PortalAboutClientProps {
  agencyBranding?: {
    adminId: string;
    agencyName: string;
    agencySlug: string;
    customDomain?: string;
    settings?: any;
  } | null;
}

const DEFAULT_HIGHLIGHTS = [
  {
    title: "100% RERA & Title Vetted",
    description:
      "Every residential, commercial, and land listing is screened for legal clearances, RERA registration, and clean ownership chain.",
  },
  {
    title: "End-to-End Registry Support",
    description:
      "Dedicated guidance from site inspection and price negotiation to loan processing, stamp duty, and final registration.",
  },
  {
    title: "Direct Owner & Builder Access",
    description:
      "Transparent pricing directly from verified owners and Grade-A developers with zero inflated middleman markups.",
  },
];

export function PortalAboutClient({ agencyBranding }: PortalAboutClientProps) {
  const searchParams = useSearchParams();
  const agency = searchParams.get("agency") || agencyBranding?.agencySlug || undefined;
  const adminId = searchParams.get("adminId") || agencyBranding?.adminId || undefined;
  const tenant = agencyBranding?.customDomain ? {} : { agency, adminId };

  const settings = agencyBranding?.settings;
  const about = settings?.aboutUs || {};

  const displayName =
    settings?.branding?.companyName ||
    agencyBranding?.agencyName ||
    "Real Estate Agency";
  const badgeText =
    settings?.regulatory?.badgeText || "MahaRERA Approved Partner";
  const registrationNumber = settings?.regulatory?.registrationNumber;

  const eyebrow =
    about.eyebrowText?.trim() || "ABOUT OUR AGENCY • VERIFIED ADVISORY";
  const headline =
    about.headline?.trim() ||
    `Trusted Real Estate Guidance with ${displayName}.`;
  const story =
    about.story?.trim() ||
    `${displayName} is committed to transparent, paperwork-first property transactions across residential, commercial, and land investments.\n\nFrom curated luxury residences and RERA-approved townships to clear-title NA layouts and pre-leased commercial assets, our advisory desk supports buyers and investors at every milestone.`;

  const missionTitle = about.missionTitle?.trim() || "Our Mission";
  const missionDesc =
    about.missionDescription?.trim() ||
    "Deliver transparent, documentation-verified property transactions where buyers and investors act with complete confidence.";
  const visionTitle = about.visionTitle?.trim() || "Our Vision";
  const visionDesc =
    about.visionDescription?.trim() ||
    "Be the region's most trusted real estate advisory desk known for integrity, verified developers, and long-term client relationships.";

  const stats = [
    {
      label: "Years of Excellence",
      value: about.yearsExperience?.trim() || "10+",
    },
    {
      label: "Properties Delivered",
      value: about.propertiesSoldCount?.trim() || "500+",
    },
    {
      label: "Happy Families & Investors",
      value: about.happyClientsCount?.trim() || "1,200+",
    },
    {
      label: "Advisory Specialists",
      value: about.teamSizeCount?.trim() || "25+",
    },
  ];

  const customHighlights = Array.isArray(about.highlights)
    ? about.highlights.filter(
        (h: any) => h && (h.title?.trim() || h.description?.trim()),
      )
    : [];
  const highlights =
    customHighlights.length > 0 ? customHighlights : DEFAULT_HIGHLIGHTS;

  const bannerImageUrl = about.bannerImageUrl?.trim() || "";
  const contactPhone = settings?.contact?.phone || "";
  const contactAddress = settings?.contact?.address || "";
  const contactCity = settings?.contact?.city || "";

  return (
    <div className="pb-16">
      {/* Editorial Header Band */}
      <section className="bg-ink-green text-paper border-b-2 border-brass py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div
              className={
                bannerImageUrl ? "lg:col-span-7 space-y-4" : "lg:col-span-10 space-y-4"
              }
            >
              <span className="text-xs uppercase tracking-[0.14em] font-bold text-brass block">
                {eyebrow}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[46px] font-bold text-paper leading-[1.15] tracking-tight">
                {headline}
              </h1>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass bg-deep-green/80 border border-brass/50 px-3 py-1.5">
                  <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>
                    {badgeText}
                    {registrationNumber ? ` • ${registrationNumber}` : ""}
                  </span>
                </span>
              </div>
            </div>

            {bannerImageUrl && (
              <div className="lg:col-span-5">
                <div className="aspect-[16/10] w-full overflow-hidden border-2 border-brass shadow-hard-brass bg-deep-green">
                  <img
                    src={bannerImageUrl}
                    alt={`${displayName} Office & Advisory`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-card-white border-2 border-ink-green shadow-hard-brass divide-y lg:divide-y-0 lg:divide-x divide-line">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-5 text-center">
              <div className="font-serif text-2xl sm:text-3xl font-bold text-ink-green">
                {stat.value}
              </div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted-ink mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agency Story & Quick Credentials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-card-white border border-line p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brass">
              <Building2 className="size-4" strokeWidth={1.5} />
              <span>Our Story &amp; Desk Dossier</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-green">
              About {displayName}
            </h2>
            <p className="text-sm sm:text-base text-body-muted leading-relaxed whitespace-pre-line">
              {story}
            </p>
          </div>

          {/* Right Quick Info Box */}
          <aside className="lg:col-span-4 bg-card-white border border-line p-6 shadow-xs space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-brass flex items-center gap-1.5 border-b border-soft-line pb-3">
              <Award className="size-4" strokeWidth={1.5} />
              <span>Verified Credentials</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-ink block">
                  Registered Organization
                </span>
                <span className="font-bold text-ink-green text-sm mt-0.5 block">
                  {displayName}
                </span>
              </div>

              {(contactAddress || contactCity) && (
                <div className="pt-2 border-t border-soft-line flex items-start gap-2">
                  <MapPin className="size-4 text-brass shrink-0 mt-0.5" />
                  <span className="text-body-muted leading-relaxed">
                    {contactAddress}
                    {contactCity && !contactAddress.includes(contactCity)
                      ? `, ${contactCity}`
                      : ""}
                  </span>
                </div>
              )}

              {contactPhone && (
                <div className="pt-2 border-t border-soft-line flex items-center gap-2">
                  <Phone className="size-4 text-brass shrink-0" />
                  <span className="font-semibold text-ink">{contactPhone}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-soft-line flex flex-col gap-2">
              <Link
                href={appendTenantQuery("/portal-properties", tenant)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-ink-green text-paper text-xs font-bold uppercase tracking-wider hover:bg-deep-green transition-colors"
              >
                <span>Browse Listings</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href={appendTenantQuery("/portal-contact", tenant)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-card-white text-ink-green border border-ink-green text-xs font-bold uppercase tracking-wider hover:bg-paper transition-colors"
              >
                <span>Contact Office</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card-white border border-line p-6 sm:p-7 shadow-xs space-y-3">
            <div className="size-10 bg-paper border border-line flex items-center justify-center text-brass">
              <Target className="size-5" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-green">
              {missionTitle}
            </h3>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
              {missionDesc}
            </p>
          </div>

          <div className="bg-card-white border border-line p-6 sm:p-7 shadow-xs space-y-3">
            <div className="size-10 bg-paper border border-line flex items-center justify-center text-brass">
              <Compass className="size-5" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-green">
              {visionTitle}
            </h3>
            <p className="text-xs sm:text-sm text-body-muted leading-relaxed">
              {visionDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us / Core Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
            Our Promise &amp; Standards
          </span>
          <h2 className="font-serif text-2xl font-bold text-ink-green mt-1">
            Why Homebuyers &amp; Investors Trust {displayName}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((item: any, idx: number) => (
            <div
              key={idx}
              className="bg-card-white border border-line p-6 shadow-xs space-y-2.5"
            >
              <div className="flex items-center gap-2 text-ink-green font-bold text-sm">
                <CheckCircle2 className="size-4 text-brass shrink-0" />
                <span>{item.title}</span>
              </div>
              <p className="text-xs text-body-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
