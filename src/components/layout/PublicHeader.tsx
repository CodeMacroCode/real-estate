"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Menu,
  X,
  ChevronDown,
  Building,
  CheckCircle2,
} from "lucide-react";
import { appendTenantQuery, resolvePortalTenant } from "@/lib/portalUtils";
import { isPlatformHost } from "@/lib/domains/normalize";

interface PublicHeaderProps {
  agencyName?: string;
  agencySlug?: string;
  adminId?: string;
  settings?: any;
  isCustomDomain?: boolean;
}

export function PublicHeader({
  agencyName,
  agencySlug,
  adminId: adminIdProp,
  settings,
  isCustomDomain,
}: PublicHeaderProps) {
  const [onCustomDomain, setOnCustomDomain] = useState(Boolean(isCustomDomain));
  const [clientQuery, setClientQuery] = useState<{
    agency?: string;
    adminId?: string;
  }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isCustomDomain === undefined) {
        setOnCustomDomain(!isPlatformHost(window.location.hostname));
      } else {
        setOnCustomDomain(isCustomDomain);
      }
      const params = new URLSearchParams(window.location.search);
      const qAgency = params.get("agency") || undefined;
      const qAdminId = params.get("adminId") || undefined;
      if (qAgency || qAdminId) {
        setClientQuery({ agency: qAgency, adminId: qAdminId });
      }
    }
  }, [isCustomDomain]);

  const tenant = resolvePortalTenant({
    isCustomDomain: onCustomDomain,
    agencySlug,
    adminId: adminIdProp,
    searchAgency: clientQuery.agency,
    searchAdminId: clientQuery.adminId,
    settingsAdminId: settings?.adminId,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [buyDropdownOpen, setBuyDropdownOpen] = useState(false);
  const [rentDropdownOpen, setRentDropdownOpen] = useState(false);

  const displayName = settings?.branding?.companyName || agencyName || "Real Estate Agency";
  const displayTagline = settings?.branding?.tagline?.trim() || "";
  const logoUrl = settings?.branding?.logoUrl;
  const homeHref = onCustomDomain
    ? "/"
    : appendTenantQuery("/portal-properties", tenant);

  return (
    <>
      {/* PublicHeader (white, bottom border, sticky) */}
      <header className="sticky top-0 z-40 bg-card-white border-b border-line shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
          {/* Logo or Brand */}
          <Link
            href={homeHref}
            className="flex items-center gap-2.5 min-w-0 md:justify-self-start group focus-visible:outline-2"
          >
            {logoUrl ? (
              <div className="h-10 max-w-[140px] flex items-center">
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="size-9 bg-ink-green text-paper flex items-center justify-center border border-brass">
                <Building className="size-5 text-brass" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-ink-green block leading-tight">
                {displayName}
              </span>
              {displayTagline && (
                <div className="text-[9px] uppercase tracking-widest text-muted-ink font-semibold mt-0.5">
                  {displayTagline}
                </div>
              )}
            </div>
          </Link>

          {/* Desktop Navigation (centered) */}
          <nav className="hidden md:flex md:justify-self-center items-center justify-center gap-1 text-sm font-semibold text-ink h-16">
            {/* Home Link */}
            <Link
              href={homeHref}
              className="px-3.5 h-full flex items-center border-b-2 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              Home
            </Link>

            {/* Buy Dropdown */}
            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => setBuyDropdownOpen(true)}
              onMouseLeave={() => setBuyDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 px-3.5 h-full transition-colors border-b-2 ${
                  buyDropdownOpen ? "border-brass text-ink-green" : "border-transparent text-ink hover:text-ink-green hover:border-brass"
                }`}
                aria-expanded={buyDropdownOpen}
              >
                <span>Buy</span>
                <ChevronDown className="w-4 h-4 text-muted-ink" strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {buyDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute top-full left-0 w-48 bg-card-white border border-line shadow-hard-green py-2 z-50"
                  >
                    <Link
                      href={appendTenantQuery("/portal-properties?transactionType=Sale", tenant)}
                      className="block px-4 py-2 text-xs font-medium text-ink hover:bg-paper hover:text-ink-green"
                    >
                      For Sale
                    </Link>
                    <Link
                      href={appendTenantQuery("/portal-projects", tenant)}
                      className="block px-4 py-2 text-xs font-medium text-ink hover:bg-paper hover:text-ink-green"
                    >
                      New Projects
                    </Link>
                    <Link
                      href={appendTenantQuery("/portal-properties?category=Commercial&transactionType=Sale", tenant)}
                      className="block px-4 py-2 text-xs font-medium text-ink hover:bg-paper hover:text-ink-green"
                    >
                      Commercial Buy
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rent Dropdown */}
            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => setRentDropdownOpen(true)}
              onMouseLeave={() => setRentDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 px-3.5 h-full transition-colors border-b-2 ${
                  rentDropdownOpen ? "border-brass text-ink-green" : "border-transparent text-ink hover:text-ink-green hover:border-brass"
                }`}
                aria-expanded={rentDropdownOpen}
              >
                <span>Rent</span>
                <ChevronDown className="w-4 h-4 text-muted-ink" strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {rentDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute top-full left-0 w-48 bg-card-white border border-line shadow-hard-green py-2 z-50"
                  >
                    <Link
                      href={appendTenantQuery("/portal-properties?transactionType=Rent", tenant)}
                      className="block px-4 py-2 text-xs font-medium text-ink hover:bg-paper hover:text-ink-green"
                    >
                      Rental Homes &amp; Villas
                    </Link>
                    <Link
                      href={appendTenantQuery("/portal-properties?category=Commercial&transactionType=Rent", tenant)}
                      className="block px-4 py-2 text-xs font-medium text-ink hover:bg-paper hover:text-ink-green"
                    >
                      Commercial Lease
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Projects Link */}
            <Link
              href={appendTenantQuery("/portal-projects", tenant)}
              className="px-3.5 h-full flex items-center border-b-2 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              Projects
            </Link>

            {/* About Us Link */}
            <Link
              href={appendTenantQuery("/portal-about", tenant)}
              className="px-3.5 h-full flex items-center border-b-2 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              About Us
            </Link>

            {/* Contact - Points to dedicated page */}
            <Link
              href={appendTenantQuery("/portal-contact", tenant)}
              className="px-3.5 h-full flex items-center border-b-2 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Column Balancer (desktop) & Mobile Hamburger */}
          <div className="flex items-center justify-end gap-3 md:justify-self-end">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 text-ink hover:bg-paper border border-line"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-line bg-card-white overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <Link
                  href={homeHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  Home
                </Link>
                <Link
                  href={appendTenantQuery("/portal-properties?transactionType=Sale", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  Buy Properties
                </Link>
                <Link
                  href={appendTenantQuery("/portal-properties?transactionType=Rent", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  Rent Properties
                </Link>
                <Link
                  href={appendTenantQuery("/portal-projects", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  New Projects
                </Link>
                <Link
                  href={appendTenantQuery("/portal-properties?category=Commercial", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  Commercial Spaces
                </Link>
                <Link
                  href={appendTenantQuery("/portal-about", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  About Us
                </Link>
                <Link
                  href={appendTenantQuery("/portal-contact", tenant)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-ink border-b border-soft-line"
                >
                  Contact
                </Link>
               
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
