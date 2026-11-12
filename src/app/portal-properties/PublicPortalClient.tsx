"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  MapPin,
  Building,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { SanitizedPublicProperty } from "@/services/publicPortalService";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyInquiryModal } from "@/components/property/PropertyInquiryModal";
import { InteractiveFloorMapViewer } from "@/components/property/InteractiveFloorMapViewer";
import { FadeUp } from "@/components/motion";

interface PublicPortalClientProps {
  initialProperties: SanitizedPublicProperty[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  searchParams: Record<string, string | undefined>;
  agencyBranding?: {
    adminId: string;
    agencyName: string;
    agencySlug: string;
    customDomain?: string;
    settings?: any;
  } | null;
}

export default function PublicPortalClient({
  initialProperties,
  initialPagination,
  searchParams,
  agencyBranding,
}: PublicPortalClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.search || "");
  const [transactionType, setTransactionType] = useState(
    searchParams.transactionType || "Sale",
  );
  const [category, setCategory] = useState(searchParams.category || "");
  const [city, setCity] = useState(
    searchParams.city || searchParams.locality || "",
  );
  const [bedrooms, setBedrooms] = useState(searchParams.bedrooms || "");
  const [budget, setBudget] = useState(searchParams.maxPrice || "");
  const [sort, setSort] = useState(searchParams.sort || "featured");
  const [inquiryProperty, setInquiryProperty] =
    useState<SanitizedPublicProperty | null>(null);

  const activeAgencySlug = agencyBranding?.agencySlug || searchParams.agency;
  const activeAdminId = agencyBranding?.adminId || searchParams.adminId;
  const tenant = { agency: activeAgencySlug, adminId: activeAdminId };

  const applyQuery = (overrides: Record<string, string | undefined> = {}) => {
    const query = new URLSearchParams();
    const currentSearch =
      overrides.search !== undefined ? overrides.search : search;
    const currentTx =
      overrides.transactionType !== undefined
        ? overrides.transactionType
        : transactionType;
    const currentCat =
      overrides.category !== undefined ? overrides.category : category;
    const currentCity = overrides.city !== undefined ? overrides.city : city;
    const currentBhk =
      overrides.bedrooms !== undefined ? overrides.bedrooms : bedrooms;
    const currentBudget =
      overrides.budget !== undefined ? overrides.budget : budget;
    const currentSort = overrides.sort !== undefined ? overrides.sort : sort;

    if (currentSearch) query.set("search", currentSearch);
    if (currentTx) query.set("transactionType", currentTx);
    if (currentCat) query.set("category", currentCat);
    if (currentCity) query.set("city", currentCity);
    if (currentBhk) query.set("bedrooms", currentBhk);
    if (currentBudget) query.set("maxPrice", currentBudget);
    if (currentSort) query.set("sort", currentSort);
    if (activeAgencySlug) query.set("agency", activeAgencySlug);
    if (activeAdminId) query.set("adminId", activeAdminId);

    router.push(`/portal-properties?${query.toString()}`);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyQuery();
  };

  // Real floor plan from current admin's featured listing
  const featuredItem = initialProperties[0];
  const floorPlanSample = [
    {
      floorName: "Layout Blueprint",
      floorNumber: 1,
      planImageUrl:
        featuredItem?.media?.floorPlans?.[0] ||
        featuredItem?.media?.featuredImage ||
        "/uploads/invoices/kola_1793781763751_jej9fx.jpg",
      roomTitle: featuredItem?.title || "Property Blueprint",
      status: "Available",
      hotspots: [],
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* 3. Hero (solid ink-green background) */}
      <section className="bg-ink-green text-paper pt-12 pb-24 border-b-2 border-brass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 cols: brass label, Fraunces headline, subtext */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs uppercase tracking-[0.14em] font-bold text-brass block">
                {agencyBranding?.settings?.hero?.eyebrowText ||
                  "Official Real Estate Gazette • Nagpur Central"}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[52px] font-bold text-paper leading-[1.15] tracking-tight">
                {agencyBranding?.settings?.hero?.headline ||
                  "Find a home with the paperwork already in order."}
              </h1>
              <p className="text-line/80 text-sm sm:text-base leading-relaxed max-w-xl">
                {agencyBranding?.settings?.hero?.subheadline ||
                  "Direct buyer exchange featuring RERA-sanctioned apartments, clear-title agricultural & NA layouts, and verified freehold residences across the Vidarbha region."}
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-brass">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4" strokeWidth={1.5} />
                  {agencyBranding?.settings?.regulatory?.badgeText ||
                    "MahaRERA Registered Listings"}
                </span>
              </div>
            </div>

            {/* Right 5 cols: 520x300 flat SVG skyline or Custom Banner inside 2px brass border */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div
                className="w-full max-w-[520px] aspect-[520/300] border-2 p-4 relative overflow-hidden shadow-hard-brass"
                style={{
                  backgroundColor: "var(--deep-green, #0b2d22)",
                  borderColor: "var(--brass, #b5822c)",
                }}
              >
                {agencyBranding?.settings?.hero?.bannerType ===
                  "custom_image" &&
                agencyBranding?.settings?.hero?.customBannerUrl ? (
                  <img
                    src={agencyBranding.settings.hero.customBannerUrl}
                    alt={agencyBranding?.agencyName || "Agency Banner"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    viewBox="0 0 520 300"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    {/* Sky background */}
                    <rect width="520" height="300" fill="var(--deep-green, #0b2d22)" />

                    {/* Brass sun circle */}
                    <circle cx="410" cy="80" r="42" fill="var(--brass, #b5822c)" />

                    {/* Distant skyline */}
                    <polygon
                      points="40,300 40,180 80,180 80,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="70,300 70,140 120,140 120,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="110,300 110,165 170,165 170,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="200,300 200,120 250,120 250,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="280,300 280,150 340,150 340,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="360,300 360,110 420,110 420,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />
                    <polygon
                      points="430,300 430,170 490,170 490,300"
                      fill="var(--deep-green, #14503d)"
                      opacity="0.8"
                    />

                    {/* Foreground Buildings */}
                    <rect
                      x="20"
                      y="160"
                      width="60"
                      height="140"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />
                    <rect
                      x="70"
                      y="110"
                      width="75"
                      height="190"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />
                    <rect
                      x="155"
                      y="80"
                      width="85"
                      height="220"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />
                    <rect
                      x="250"
                      y="130"
                      width="70"
                      height="170"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />
                    <rect
                      x="330"
                      y="70"
                      width="90"
                      height="230"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />
                    <rect
                      x="430"
                      y="140"
                      width="70"
                      height="160"
                      fill="var(--ink-green, #0e3b2e)"
                      stroke="var(--deep-green, #0b2d22)"
                      strokeWidth="2"
                    />

                    {/* Lit Windows */}
                    <rect x="35" y="180" width="8" height="12" fill="var(--brass, #b5822c)" />
                    <rect x="55" y="180" width="8" height="12" fill="var(--paper, #f6f2ea)" />
                    <rect x="35" y="210" width="8" height="12" fill="var(--paper, #f6f2ea)" />
                    <rect
                      x="85"
                      y="130"
                      width="10"
                      height="16"
                      fill="var(--brass, #b5822c)"
                    />
                    <rect
                      x="115"
                      y="130"
                      width="10"
                      height="16"
                      fill="var(--paper, #f6f2ea)"
                    />
                    <rect
                      x="85"
                      y="170"
                      width="10"
                      height="16"
                      fill="var(--paper, #f6f2ea)"
                    />
                    <rect
                      x="115"
                      y="170"
                      width="10"
                      height="16"
                      fill="#b5822c"
                    />
                    <rect
                      x="175"
                      y="100"
                      width="12"
                      height="18"
                      fill="#b5822c"
                    />
                    <rect
                      x="205"
                      y="100"
                      width="12"
                      height="18"
                      fill="#f6f2ea"
                    />
                    <rect
                      x="175"
                      y="140"
                      width="12"
                      height="18"
                      fill="#f6f2ea"
                    />
                    <rect
                      x="205"
                      y="140"
                      width="12"
                      height="18"
                      fill="#b5822c"
                    />
                    <rect
                      x="175"
                      y="180"
                      width="12"
                      height="18"
                      fill="#b5822c"
                    />
                    <rect
                      x="270"
                      y="150"
                      width="10"
                      height="14"
                      fill="#b5822c"
                    />
                    <rect
                      x="295"
                      y="150"
                      width="10"
                      height="14"
                      fill="#f6f2ea"
                    />
                    <rect
                      x="350"
                      y="90"
                      width="12"
                      height="18"
                      fill="#f6f2ea"
                    />
                    <rect
                      x="385"
                      y="90"
                      width="12"
                      height="18"
                      fill="#b5822c"
                    />
                    <rect
                      x="350"
                      y="130"
                      width="12"
                      height="18"
                      fill="#b5822c"
                    />
                    <rect
                      x="385"
                      y="130"
                      width="12"
                      height="18"
                      fill="#f6f2ea"
                    />
                    <rect
                      x="450"
                      y="160"
                      width="10"
                      height="14"
                      fill="#b5822c"
                    />
                    <rect
                      x="475"
                      y="160"
                      width="10"
                      height="14"
                      fill="#f6f2ea"
                    />

                    {/* Waterline reflection base */}
                    <rect x="0" y="292" width="520" height="8" fill="#b5822c" />
                  </svg>
                )}

                <div className="absolute top-2 left-2 px-2 py-0.5 bg-ink-green text-brass text-[9px] font-mono uppercase tracking-widest border border-brass">
                  Property Architectural Survey
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Search panel overlapping the hero bottom (margin-top -72px) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20">
        <div className="bg-card-white border-2 border-ink-green shadow-hard-brass p-6 sm:p-7">
          {/* Tab row on top (Buy / Rent / Lease / Projects; active tab = solid green with white text) */}
          <div className="flex items-center gap-1 border-b border-line pb-4 mb-6 overflow-x-auto">
            {[
              { id: "Sale", label: "Buy" },
              { id: "Rent", label: "Rent" },
              { id: "Lease", label: "Commercial Lease" },
              { id: "Projects", label: "Projects" },
            ].map((tab) => {
              const isActive =
                tab.id === "Projects" ? false : transactionType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "Projects") {
                      const q = new URLSearchParams();
                      if (activeAgencySlug) q.set("agency", activeAgencySlug);
                      if (activeAdminId) q.set("adminId", activeAdminId);
                      router.push(`/portal-projects?${q.toString()}`);
                    } else {
                      setTransactionType(tab.id);
                      applyQuery({ transactionType: tab.id });
                    }
                  }}
                  className={`relative px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "bg-ink-green text-paper border border-ink-green"
                      : "text-ink hover:text-ink-green hover:bg-paper"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="searchTabUnderline"
                      className="absolute -bottom-[17px] left-0 right-0 h-[3px] bg-brass"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Inputs (UNDERLINE-only inputs: 2px green bottom border, small uppercase labels) */}
          <form
            onSubmit={handleFilterSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-ink mb-1">
                Search Term
              </label>
              <input
                type="text"
                placeholder="Locality, Landmark or Title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-ink mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none cursor-pointer"
              >
                <option value="">All Typologies</option>
                <option value="Residential">
                  Residential Flats &amp; Villas
                </option>
                <option value="Commercial">
                  Commercial Offices &amp; Shops
                </option>
                <option value="Land">Sanctioned Plots / NA Land</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-ink mb-1">
                Bedrooms
              </label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none cursor-pointer"
              >
                <option value="">Any Configuration</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK Penthouses</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-ink mb-1">
                Max Budget
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-paper px-3 py-2 text-sm text-ink border-b-2 border-ink-green focus:border-brass focus:outline-none cursor-pointer"
              >
                <option value="">Any Budget</option>
                <option value="3000000">Up to ₹ 30 Lakh</option>
                <option value="5000000">Up to ₹ 50 Lakh</option>
                <option value="10000000">Up to ₹ 1.00 Crore</option>
                <option value="25000000">Up to ₹ 2.50 Crore</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-brass hover:bg-brass-hover text-paper text-xs font-bold uppercase tracking-wider border border-brass shadow-hard-green-sm transition-colors flex items-center justify-center gap-2"
              >
                <Search className="size-4" strokeWidth={2} />
                <span>Search Portal</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Blueprint divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-14">
        <div className="blueprint-divider" />
      </div>

      {/* 6. 01 — Featured Project */}
      {featuredItem && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
              01 &mdash; Featured Listing
            </span>
            <h2 className="font-serif text-2xl sm:text-[32px] font-bold text-ink-green mt-1">
              {featuredItem.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Large horizontal card (illustration left, details right) */}
            <div className="lg:col-span-8 bg-card-white border-2 border-ink-green shadow-hard-brass p-6 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 aspect-[4/3] bg-paper border border-line relative overflow-hidden flex items-center justify-center">
                {featuredItem.media?.featuredImage ? (
                  <img
                    src={featuredItem.media.featuredImage}
                    alt={featuredItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-ink-green">
                    <Building
                      className="size-12 mx-auto text-brass"
                      strokeWidth={1.5}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider block mt-2">
                      Master Layout
                    </span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-ink-green text-paper text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-brass">
                  {featuredItem.transactionType
                    ? `For ${featuredItem.transactionType}`
                    : "Featured"}
                </div>
              </div>

              <div className="md:w-1/2 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-brass">
                    {featuredItem.propertyCategory} &bull;{" "}
                    {featuredItem.propertyType}
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-ink-green mt-1">
                    {featuredItem.title}
                  </h3>
                  <p className="text-xs text-muted-ink mt-1 flex items-center gap-1">
                    <MapPin className="size-3.5 text-brass" strokeWidth={1.5} />
                    <span>
                      {featuredItem.location?.address
                        ? `${featuredItem.location.address}, `
                        : ""}
                      {featuredItem.location?.city || "Nagpur"}
                    </span>
                  </p>

                  <div className="mt-4 pt-3 border-t border-line">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-ink block">
                      Price / Rent
                    </span>
                    <div className="font-serif text-2xl font-bold text-brass mt-0.5">
                      {featuredItem.transactionType === "Rent" &&
                      featuredItem.pricing?.monthlyRent
                        ? `₹ ${featuredItem.pricing.monthlyRent.toLocaleString("en-IN")} / mo`
                        : featuredItem.pricing?.price
                          ? `₹ ${(featuredItem.pricing.price >= 10000000 ? featuredItem.pricing.price / 10000000 : featuredItem.pricing.price / 100000).toFixed(2)} ${featuredItem.pricing.price >= 10000000 ? "Cr" : "L"}`
                          : "Price on Request"}
                    </div>
                    <div className="text-xs text-muted-ink mt-1">
                      ID: {featuredItem.propertyId} &bull;{" "}
                      {featuredItem.residentialSpecs?.bedrooms
                        ? `${featuredItem.residentialSpecs.bedrooms} BHK`
                        : featuredItem.propertyType}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setInquiryProperty(featuredItem)}
                    className="py-2 px-4 bg-brass hover:bg-brass-hover text-paper text-xs font-bold uppercase tracking-wider border border-brass shadow-hard-green-sm transition-colors"
                  >
                    Enquire now
                  </button>
                  <Link
                    href={`/portal-properties/${featuredItem.slug || featuredItem.id}${activeAgencySlug ? `?agency=${activeAgencySlug}` : activeAdminId ? `?adminId=${activeAdminId}` : ""}`}
                    className="py-2 px-4 bg-card-white text-ink-green text-xs font-bold uppercase tracking-wider border border-ink-green hover:bg-paper transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>

            {/* Two real companion cards from current admin inventory */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {initialProperties.slice(1, 3).map((sideItem) => (
                <div
                  key={sideItem.id}
                  className="bg-card-white border border-line p-4 hover:border-ink-green transition-colors flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-brass block">
                      {sideItem.propertyCategory} &bull; For{" "}
                      {sideItem.transactionType}
                    </span>
                    <h4 className="font-serif text-base font-bold text-ink-green mt-1 line-clamp-1">
                      {sideItem.title}
                    </h4>
                    <p className="text-xs text-muted-ink mt-0.5 line-clamp-1">
                      {sideItem.location?.address || sideItem.location?.city}
                    </p>
                    <div className="font-serif text-base font-bold text-brass mt-2">
                      {sideItem.transactionType === "Rent" &&
                      sideItem.pricing?.monthlyRent
                        ? `₹ ${sideItem.pricing.monthlyRent.toLocaleString("en-IN")} / mo`
                        : sideItem.pricing?.price
                          ? `₹ ${(sideItem.pricing.price >= 10000000 ? sideItem.pricing.price / 10000000 : sideItem.pricing.price / 100000).toFixed(2)} ${sideItem.pricing.price >= 10000000 ? "Cr" : "L"}`
                          : "Price on Request"}
                    </div>
                  </div>
                  <Link
                    href={`/portal-properties/${sideItem.slug || sideItem.id}${activeAgencySlug ? `?agency=${activeAgencySlug}` : activeAdminId ? `?adminId=${activeAdminId}` : ""}`}
                    className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-green hover:text-brass flex items-center gap-1"
                  >
                    <span>Inspect inventory</span>
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              ))}
              {initialProperties.length <= 1 && (
                <div className="bg-card-white border border-line p-5 text-center text-muted-ink flex flex-col items-center justify-center h-full">
                  <Building
                    className="size-8 text-brass mb-2"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs font-semibold">
                    Verified Agency Portfolio
                  </p>
                  <p className="text-[11px] mt-1 text-muted-ink">
                    All listings presented directly by{" "}
                    {agencyBranding?.agencyName || "accredited agency"}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Blueprint divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-14">
        <div className="blueprint-divider" />
      </div>

      {/* 7. 02 — Latest Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-line">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
              02 &mdash; Latest Verified Listings
            </span>
            <h2 className="font-serif text-2xl sm:text-[32px] font-bold text-ink-green mt-1">
              Curated Property Register
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-ink">
              Sort By:
            </label>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                applyQuery({ sort: e.target.value });
              }}
              className="bg-card-white px-3 py-1.5 text-xs font-semibold text-ink border border-line focus:border-ink-green focus:outline-none"
            >
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Latest Enrolled</option>
            </select>
          </div>
        </div>

        {/* Results grid cross-fades on filter/sort changes */}
        <AnimatePresence mode="wait">
          {initialProperties.length > 0 ? (
            <motion.div
              key={`${transactionType}-${category}-${city}-${sort}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {initialProperties.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  property={prop}
                  agencySlug={searchParams.agency}
                  onEnquireClick={(p) => setInquiryProperty(p)}
                />
              ))}
            </motion.div>
          ) : (
            <div className="p-12 text-center bg-card-white border-2 border-dashed border-line">
              <Building
                className="size-12 mx-auto text-brass mb-3"
                strokeWidth={1.5}
              />
              <h3 className="font-serif text-lg font-bold text-ink-green">
                No matching verified listings in this criteria
              </h3>
              <p className="text-xs text-muted-ink mt-1">
                Try widening your locality or budget filters, or reset to view
                all Nagpur listings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setCity("");
                  setBedrooms("");
                  setBudget("");
                  applyQuery({
                    search: "",
                    category: "",
                    city: "",
                    bedrooms: "",
                    budget: "",
                  });
                }}
                className="mt-4 px-4 py-2 bg-ink-green text-paper text-xs font-bold uppercase tracking-wider border border-ink-green"
              >
                Reset Filters
              </button>
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {initialPagination.totalPages > 1 && (
          <div className="mt-8 pt-4 border-t border-line flex items-center justify-between text-xs text-muted-ink">
            <span>
              Page {initialPagination.page} of {initialPagination.totalPages}{" "}
              &bull; Total {initialPagination.total} listings
            </span>
            <div className="flex gap-2">
              {initialPagination.page > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const q = new URLSearchParams(window.location.search);
                    q.set("page", String(initialPagination.page - 1));
                    router.push(`/portal-properties?${q.toString()}`);
                  }}
                  className="px-3 py-1 bg-card-white border border-line hover:border-ink-green font-bold text-ink"
                >
                  Previous
                </button>
              )}
              {initialPagination.hasMore && (
                <button
                  type="button"
                  onClick={() => {
                    const q = new URLSearchParams(window.location.search);
                    q.set("page", String(initialPagination.page + 1));
                    router.push(`/portal-properties?${q.toString()}`);
                  }}
                  className="px-3 py-1 bg-card-white border border-line hover:border-ink-green font-bold text-ink"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Blueprint divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-14">
        <div className="blueprint-divider" />
      </div>

      {/* 8. 03 — Inspect Before You Visit */}
      {featuredItem && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Floor plan viewer panel */}
            <div className="lg:col-span-7">
              <InteractiveFloorMapViewer
                floorPlans={floorPlanSample}
                defaultPropertyTitle={featuredItem.title}
                propertyType={featuredItem.propertyType}
                carpetArea={featuredItem.areaDetails?.carpetArea || 1200}
                areaUnit={featuredItem.areaDetails?.areaUnit || "Sq. Ft."}
                bedrooms={featuredItem.residentialSpecs?.bedrooms || 2}
                bathrooms={featuredItem.residentialSpecs?.bathrooms || 2}
                furnishing={
                  featuredItem.residentialSpecs?.furnishing || "Unfurnished"
                }
                facing={featuredItem.residentialSpecs?.facing || "East"}
                city={featuredItem.location?.city || "Nagpur"}
                address={featuredItem.location?.address}
                amenities={
                  featuredItem.amenities || [
                    "24/7 Security",
                    "Power Backup",
                    "Covered Parking",
                  ]
                }
              />
            </div>

            {/* Right: label, heading, short paragraph, 3 numbered steps in Fraunces */}
            <div className="lg:col-span-5 space-y-6 pt-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-brass block">
                  03 &mdash; Technical Verification
                </span>
                <h2 className="font-serif text-2xl sm:text-[32px] font-bold text-ink-green mt-1">
                  Interactive floor plans and unit details
                </h2>
                <p className="text-xs sm:text-sm text-body-muted mt-3 leading-relaxed">
                  Scrutinize exact carpet dimensions, room orientation, and
                  structural line plans before reserving a physical site visit.
                  Avoid surprises and verify municipal sanction compliance
                  beforehand.
                </p>
              </div>

              {/* 3 Numbered Steps (square 44px bordered number boxes in Fraunces) */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 bg-card-white border border-line">
                  <div className="size-[44px] bg-paper border border-ink-green text-ink-green font-serif text-xl font-bold flex items-center justify-center shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-ink-green">
                      Search &amp; Filter
                    </h4>
                    <p className="text-xs text-muted-ink mt-0.5">
                      Filter by specific Vidarbha localities, carpet area
                      thresholds, and verified RERA numbers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-card-white border border-line">
                  <div className="size-[44px] bg-paper border border-ink-green text-ink-green font-serif text-xl font-bold flex items-center justify-center shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-ink-green">
                      Inspect Blueprint
                    </h4>
                    <p className="text-xs text-muted-ink mt-0.5">
                      Review unit elevations, balcony aspects, and
                      cross-ventilation diagrams on the interactive viewer.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-card-white border border-line">
                  <div className="size-[44px] bg-paper border border-ink-green text-ink-green font-serif text-xl font-bold flex items-center justify-center shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-ink-green">
                      Enquire &amp; Visit
                    </h4>
                    <p className="text-xs text-muted-ink mt-0.5">
                      Register a zero-brokerage inspection request directly with
                      accredited agency representatives.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Inquiry Modal */}
      <PropertyInquiryModal
        isOpen={Boolean(inquiryProperty)}
        onClose={() => setInquiryProperty(null)}
        property={
          inquiryProperty
            ? {
                id: inquiryProperty.id,
                title: inquiryProperty.title,
                propertyId: inquiryProperty.propertyId || "PROP-NAG",
                location: inquiryProperty.location,
              }
            : null
        }
        adminId={searchParams.adminId}
      />
    </div>
  );
}
