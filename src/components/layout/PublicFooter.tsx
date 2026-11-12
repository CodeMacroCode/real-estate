"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { appendTenantQuery } from "@/lib/portalUtils";

interface PublicFooterProps {
  agencyName?: string;
  topLocations?: string[];
}

export function PublicFooter({ agencyName, topLocations = [] }: PublicFooterProps) {
  const searchParams = useSearchParams();
  const agency = searchParams.get("agency") || undefined;
  const adminId = searchParams.get("adminId") || undefined;
  const tenant = { agency, adminId };

  // Fallback locations only if tenant has no active listings
  const locationsToDisplay =
    topLocations.length > 0
      ? topLocations
      : ["Wardha Road", "Dharampeth", "Besa", "Hingna Road", "Amravati Road"];

  return (
    <footer
      id="contact"
      className="bg-deep-green text-paper text-xs border-t-2 border-ink-green"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8">
        {/* 4 Columns (brand blurb, Explore, Localities, Contact) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Col 1: Brand blurb */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="size-7 bg-ink-green text-brass border border-brass flex items-center justify-center font-bold">
                <Building className="size-4" strokeWidth={1.5} />
              </div>
              <div className="font-serif text-lg font-bold tracking-tight text-paper">
                {agencyName || "Real Estate Agency"}
              </div>
            </div>
            <p className="text-paper/90 text-[11px] leading-relaxed">
              {agencyName
                ? `${agencyName} official verified customer property exchange. `
                : "Official verified customer property exchange. "}
              Curating 100% RERA-registered developments, clean-titled
              freeholds, and verified residential plots with full documentation
              scrutiny.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-brass text-[10px] font-semibold tracking-wider uppercase">
              <ShieldCheck className="size-3.5" strokeWidth={1.5} />
              <span>MahaRERA Approved Partner</span>
            </div>
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
                    "/portal-properties?category=Land",
                    tenant,
                  )}
                  className="hover:text-brass transition-colors"
                >
                  NA Sanctioned Plots &amp; Land
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Localities (Dynamic top 5 from admin's properties & projects) */}
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
                <span>
                  Civil Lines, Wardha Road Junction, Nagpur, Maharashtra 440001
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone
                  className="size-3.5 text-brass shrink-0"
                  strokeWidth={1.5}
                />
                <span>+91 (0712) 256-8900</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail
                  className="size-3.5 text-brass shrink-0"
                  strokeWidth={1.5}
                />
                <span>contact@propertyportal.in</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal, Copyright */}
        <div className="pt-3 border-t border-ink-green/40 text-[10px] text-paper/70 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; {new Date().getFullYear()}{" "}
            {agencyName || "Real Estate Agency"}. All rights reserved.
          </span>
          <span>Nagpur &bull; Maharashtra &bull; MahaRERA Approved</span>
        </div>
      </div>
    </footer>
  );
}
