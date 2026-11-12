"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";
import { appendTenantQuery } from "@/lib/portalUtils";

interface PublicFooterProps {
  agencyName?: string;
  topLocations?: string[];
  settings?: any;
}

export function PublicFooter({ agencyName, topLocations = [], settings }: PublicFooterProps) {
  const searchParams = useSearchParams();
  const agency = searchParams.get("agency") || undefined;
  const adminId = searchParams.get("adminId") || undefined;
  const tenant = { agency, adminId };

  // Fallback locations only if tenant has no active listings
  const locationsToDisplay =
    topLocations.length > 0
      ? topLocations
      : ["Wardha Road", "Dharampeth", "Besa", "Hingna Road", "Amravati Road"];

  const displayName = settings?.branding?.companyName || agencyName || "Real Estate Agency";
  const aboutText =
    settings?.footer?.aboutText ||
    `${displayName} official verified customer property exchange. Curating 100% RERA-registered developments, clean-titled freeholds, and verified residential plots with full documentation scrutiny.`;
  const badgeText = settings?.regulatory?.badgeText || "MahaRERA Approved Partner";
  const copyrightText =
    settings?.footer?.copyrightText ||
    `© ${new Date().getFullYear()} ${displayName}. All rights reserved.`;

  const contactAddress =
    settings?.contact?.address ||
    "Civil Lines, Wardha Road Junction, Nagpur, Maharashtra 440001";
  const contactPhone = settings?.contact?.phone || "+91 (0712) 256-8900";
  const contactEmail = settings?.contact?.email || "contact@propertyportal.in";
  const socialLinks = settings?.socialLinks || {};
  const footerLogo = settings?.footer?.logoUrl || settings?.branding?.logoUrl;

  return (
    <footer
      id="contact"
      className="text-paper text-xs border-t-2"
      style={{
        backgroundColor: "var(--deep-green, #0b2d22)",
        borderColor: "var(--ink-green, #0e3b2e)",
        color: "var(--paper, #f6f2ea)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
        {/* 4 Columns (brand blurb, Explore, Localities, Contact) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Col 1: Brand blurb */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              {footerLogo ? (
                <div className="h-9 max-w-[150px] flex items-center">
                  <img
                    src={footerLogo}
                    alt={displayName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="size-7 bg-ink-green text-brass border border-brass flex items-center justify-center font-bold">
                  <Building className="size-4" strokeWidth={1.5} />
                </div>
              )}
              <div className="font-serif text-lg font-bold tracking-tight text-paper">
                {displayName}
              </div>
            </div>
            <p className="text-paper/90 text-[11px] leading-relaxed">
              {aboutText}
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-brass text-[10px] font-semibold tracking-wider uppercase">
              <ShieldCheck className="size-3.5" strokeWidth={1.5} />
              <span>{badgeText}</span>
            </div>

            {/* Social Media Links with Real Icons */}
            {(socialLinks.facebook ||
              socialLinks.instagram ||
              socialLinks.linkedin ||
              socialLinks.youtube ||
              socialLinks.twitter) && (
              <div className="pt-2 flex items-center gap-2 text-paper/80">
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="size-7 flex items-center justify-center border border-paper/30 hover:border-brass hover:text-brass transition-all bg-ink-green/50"
                  >
                    <FaFacebookF className="size-3.5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="size-7 flex items-center justify-center border border-paper/30 hover:border-brass hover:text-brass transition-all bg-ink-green/50"
                  >
                    <FaInstagram className="size-3.5" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="size-7 flex items-center justify-center border border-paper/30 hover:border-brass hover:text-brass transition-all bg-ink-green/50"
                  >
                    <FaLinkedinIn className="size-3.5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="size-7 flex items-center justify-center border border-paper/30 hover:border-brass hover:text-brass transition-all bg-ink-green/50"
                  >
                    <FaYoutube className="size-3.5" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X / Twitter"
                    className="size-7 flex items-center justify-center border border-paper/30 hover:border-brass hover:text-brass transition-all bg-ink-green/50"
                  >
                    <FaXTwitter className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Col 2: Explore */}
          <div>
            <div className="text-brass font-bold text-[11px] uppercase tracking-widest mb-2.5">
              Explore Catalog
            </div>
            <ul className="space-y-1.5 text-[11px] text-paper/90 font-medium">
              <li>
                <Link
                  href={appendTenantQuery(
                    "/portal-properties?transactionType=Sale",
                    tenant,
                  )}
                  className="hover:text-brass transition-colors"
                >
                  Properties for Sale
                </Link>
              </li>
              <li>
                <Link
                  href={appendTenantQuery(
                    "/portal-properties?transactionType=Rent",
                    tenant,
                  )}
                  className="hover:text-brass transition-colors"
                >
                  Rental Apartments &amp; Homes
                </Link>
              </li>
              <li>
                <Link
                  href={appendTenantQuery("/portal-projects", tenant)}
                  className="hover:text-brass transition-colors"
                >
                  Townships &amp; New Launches
                </Link>
              </li>
              <li>
                <Link
                  href={appendTenantQuery(
                    "/portal-properties?category=Commercial",
                    tenant,
                  )}
                  className="hover:text-brass transition-colors"
                >
                  Commercial Offices &amp; Retail
                </Link>
              </li>
              <li>
                <Link
                  href={appendTenantQuery(
                    "/portal-contact",
                    tenant,
                  )}
                  className="hover:text-brass transition-colors"
                >
                  Contact &amp; Office Visit
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Localities */}
          <div>
            <div className="text-brass font-bold text-[11px] uppercase tracking-widest mb-2.5">
              Prime Localities
            </div>
            <ul className="space-y-1.5 text-[11px] text-paper/90 font-medium">
              {locationsToDisplay.map((loc) => (
                <li key={loc}>
                  <Link
                    href={appendTenantQuery(
                      `/portal-properties?city=${encodeURIComponent(loc)}`,
                      tenant,
                    )}
                    className="hover:text-brass transition-colors"
                  >
                    {loc}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact & Office */}
          <div>
            <div className="text-brass font-bold text-[11px] uppercase tracking-widest mb-2.5">
              Registry &amp; Office
            </div>
            <div className="space-y-2 text-[11px] text-paper/90">
              <div className="flex items-start gap-2">
                <MapPin
                  className="size-3.5 text-brass shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <span>{contactAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone
                  className="size-3.5 text-brass shrink-0"
                  strokeWidth={1.5}
                />
                <span>{contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail
                  className="size-3.5 text-brass shrink-0"
                  strokeWidth={1.5}
                />
                <span>{contactEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal, Copyright */}
        <div className="pt-3 border-t border-ink-green/40 text-[10px] text-paper/70 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{copyrightText}</span>
          <span className="inline-flex items-center gap-1.5 text-brass font-medium">
            <ShieldCheck className="size-3.5 shrink-0 text-brass" strokeWidth={1.5} />
            <span>{badgeText}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
