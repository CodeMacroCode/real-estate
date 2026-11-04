"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Heart,
  User,
  Menu,
  X,
  PlusCircle,
  Compass,
} from "lucide-react";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="size-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
            <Building2 className="size-5" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition">
              RealEstate<span className="text-blue-600">Portal</span>
            </span>
            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
              Verified Properties & Projects
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
          <Link
            href="/portal-properties?transactionType=Sale"
            className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition"
          >
            Buy Properties
          </Link>
          <Link
            href="/portal-properties?transactionType=Rent"
            className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition"
          >
            Rent Properties
          </Link>
          <Link
            href="/portal-projects"
            className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition"
          >
            New Projects
          </Link>
          <Link
            href="/portal-properties?category=Commercial"
            className="px-3 py-1.5 rounded-lg hover:text-blue-600 hover:bg-slate-50 transition"
          >
            Commercial
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <User className="size-3.5 text-slate-500" />
            <span>CRM Staff Login</span>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="size-3.5" />
            <span>Post Property</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <Link
            href="/portal-properties?transactionType=Sale"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Buy Properties
          </Link>
          <Link
            href="/portal-properties?transactionType=Rent"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Rent Properties
          </Link>
          <Link
            href="/portal-projects"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            New Projects & Townships
          </Link>
          <Link
            href="/portal-properties?category=Commercial"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Commercial Space
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              CRM Staff Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
