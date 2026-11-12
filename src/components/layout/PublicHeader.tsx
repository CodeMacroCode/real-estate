"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Menu,
  X,
  ChevronDown,
  Building,
  CheckCircle2,
} from "lucide-react";
import { appendTenantQuery } from "@/lib/portalUtils";

interface PublicHeaderProps {
  agencyName?: string;
}

export function PublicHeader({ agencyName }: PublicHeaderProps) {
  const searchParams = useSearchParams();
  const agency = searchParams.get("agency") || undefined;
  const adminId = searchParams.get("adminId") || undefined;
  const tenant = { agency, adminId };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [buyDropdownOpen, setBuyDropdownOpen] = useState(false);
  const [rentDropdownOpen, setRentDropdownOpen] = useState(false);

  return (
    <>
      {/* PublicHeader (white, bottom border, sticky) */}
      <header className="sticky top-0 z-40 bg-card-white border-b border-line shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo in Fraunces ("Apex" green + "Realty" brass, or agency name) */}
          <Link
            href={appendTenantQuery("/portal-properties", tenant)}
            className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-2"
          >
            <div className="size-9 bg-ink-green text-paper flex items-center justify-center border border-brass">
              <Building className="size-5 text-brass" strokeWidth={1.5} />
            </div>
            <div>
              {agencyName ? (
                <span className="font-serif text-xl font-bold tracking-tight text-ink-green">
                  {agencyName}
                </span>
              ) : (
                <span className="font-serif text-xl font-bold tracking-tight text-ink-green">
                  Real Estate Agency
                </span>
              )}
              <div className="text-[9px] uppercase tracking-widest text-muted-ink font-semibold -mt-1">
                Property Portal &bull; RERA Approved
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-ink h-16">
            {/* Buy Dropdown */}
            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => setBuyDropdownOpen(true)}
              onMouseLeave={() => setBuyDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 px-3.5 h-full transition-colors border-b-3 ${
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
                className={`flex items-center gap-1 px-3.5 h-full transition-colors border-b-3 ${
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
              className="px-3.5 h-full flex items-center border-b-3 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              Projects
            </Link>

            {/* Contact */}
            <a
              href="#contact"
              className="px-3.5 h-full flex items-center border-b-3 border-transparent hover:border-brass hover:text-ink-green transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-ink-green text-paper text-xs font-bold uppercase tracking-wider border border-ink-green hover:bg-deep-green shadow-hard-brass-sm transition-all focus-visible:outline-2"
            >
              CRM Portal
            </Link>

            {/* Mobile Hamburger */}
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
                <div className="pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center w-full py-2.5 bg-ink-green text-paper text-xs font-bold uppercase tracking-wider"
                  >
                    CRM Portal Login
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
