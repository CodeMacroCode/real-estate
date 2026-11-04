import React from "react";
import Link from "next/link";
import { Building2, Mail, Phone, MapPin, Heart, Shield } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Building2 className="size-4" />
              </div>
              <span className="text-base font-black tracking-tight">
                RealEstate<span className="text-blue-500">Portal</span>
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              India&apos;s next-generation direct real estate marketplace.
              Connecting genuine buyers directly to verified owners and
              RERA-approved builders with zero broker markup.
            </p>
            <div className="flex items-center gap-3 text-slate-400 pt-2">
              <span className="inline-flex items-center gap-1 text-[11px]">
                <Shield className="size-3.5 text-blue-400" />
                100% RERA & Title Verified
              </span>
            </div>
          </div>

          {/* Col 2: Residential Quick Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Residential Listings
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/portal-properties?bedrooms=1"
                  className="hover:text-white transition"
                >
                  1 BHK Apartments for Sale
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-properties?bedrooms=2"
                  className="hover:text-white transition"
                >
                  2 BHK Flats in High-Demand Localities
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-properties?bedrooms=3"
                  className="hover:text-white transition"
                >
                  3 BHK Luxury Penthouses & Floors
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-properties?category=Residential&transactionType=Rent"
                  className="hover:text-white transition"
                >
                  Verified Rental Homes & Villas
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-properties?category=Plot"
                  className="hover:text-white transition"
                >
                  Residential Plots & NA Land
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Projects & Commercial */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Projects & Commercial
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/portal-projects"
                  className="hover:text-white transition"
                >
                  Under Construction Projects
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-projects"
                  className="hover:text-white transition"
                >
                  Ready to Move Apartments
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-properties?category=Commercial"
                  className="hover:text-white transition"
                >
                  Commercial Offices & Retail Shops
                </Link>
              </li>
              <li>
                <Link
                  href="/portal-projects"
                  className="hover:text-white transition"
                >
                  Townships & High-Rise Towers
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Builder / Partner Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Reach Out & Portal CRM */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Customer Support & CRM
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="size-3.5 text-blue-500 shrink-0" />
                <span>Nagpur, Maharashtra, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-blue-500 shrink-0" />
                <span>support@realestateportal.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 text-blue-500 shrink-0" />
                <span>+91 98765 43210 (Toll Free)</span>
              </li>
            </ul>

            <div className="mt-5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <span className="block text-[11px] text-white font-bold">
                Authorized Staff Access
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Manage CRM leads, inventory, and website CMS.
              </p>
              <Link
                href="/login"
                className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition"
              >
                Go to Admin Dashboard &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} RealEstatePortal Inc. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/portal-properties" className="hover:text-slate-400">
              Properties
            </Link>
            <Link href="/portal-projects" className="hover:text-slate-400">
              Projects
            </Link>
            <Link href="/login" className="hover:text-slate-400">
              Staff CRM
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
