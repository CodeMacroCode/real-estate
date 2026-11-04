import React from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ChevronRight,
  Sparkles,
  PhoneCall,
  ArrowRight,
  Layers,
  Heart,
  Users,
  Compass,
  CheckCircle2,
} from "lucide-react";
import {
  getPublicProperties,
  getPublicProjects,
} from "@/services/publicPortalService";
import { PropertyCard } from "@/components/property/PropertyCard";
import { ProjectCard } from "@/components/project/ProjectCard";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Premium Real Estate Portal | Properties, Luxury Flats & New Projects",
  description:
    "Discover verified residential apartments, commercial properties, luxury villas, and top builder projects in your city.",
};

export default async function HomePage() {
  // Fetch real verified published properties and projects directly from CRM
  const [propertiesData, projectsData] = await Promise.all([
    getPublicProperties({ limit: 6, sort: "featured" }),
    getPublicProjects({ limit: 6 }),
  ]);

  const featuredProperties = propertiesData.properties;
  const featuredProjects = projectsData.projects;

  // Localities reference (inspired by PropertyWala popular hubs)
  const popularLocalities = [
    {
      name: "Wardha Road",
      count: "120+ Listings",
      type: "High Growth Corridor",
      hot: true,
    },
    {
      name: "Manish Nagar",
      count: "85+ Listings",
      type: "Prime Residential",
      hot: true,
    },
    {
      name: "Civil Lines",
      count: "45+ Listings",
      type: "Ultra Luxury Zone",
      hot: false,
    },
    {
      name: "Dharampeth",
      count: "60+ Listings",
      type: "Commercial & Retail",
      hot: false,
    },
    {
      name: "Besla",
      count: "72+ Listings",
      type: "Gated Townships",
      hot: true,
    },
    {
      name: "Hingna Road",
      count: "90+ Listings",
      type: "Affordable & Industrial",
      hot: false,
    },
    {
      name: "Ramdaspeth",
      count: "38+ Listings",
      type: "Elite High-Rises",
      hot: false,
    },
    {
      name: "MIHAN SEZ",
      count: "110+ Listings",
      type: "IT & Aerospace Hub",
      hot: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. STICKY MODERN HEADER */}
      <PublicHeader />

      {/* 2. HERO DISCOVERY SECTION */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-24 pb-20 sm:pt-32 sm:pb-28">
        {/* Subtle mesh background glows */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600 via-indigo-900 to-transparent" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <Sparkles className="size-3.5 text-blue-400" />
            <span>Over 1,000+ Direct Owner & Builder Verified Properties</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Find Your Next Property <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              With Absolute Transparency
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Direct owner listings, verified RERA projects, zero misleading
            broker rates, and real-time inventory tracking.
          </p>

          {/* Quick Search Tabbed Filter Bar */}
          <div className="mt-10 max-w-4xl mx-auto bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 text-slate-800">
            <form
              action="/portal-properties"
              method="GET"
              className="grid grid-cols-1 sm:grid-cols-4 gap-2.5"
            >
              <div className="text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Transaction
                </label>
                <select
                  name="transactionType"
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer mt-0.5"
                >
                  <option value="">Buy or Rent</option>
                  <option value="Sale">Buy (Sale)</option>
                  <option value="Rent">Rent (Lease)</option>
                </select>
              </div>

              <div className="text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Property Type
                </label>
                <select
                  name="category"
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer mt-0.5"
                >
                  <option value="">All Categories</option>
                  <option value="Residential">
                    Residential Flats / Villas
                  </option>
                  <option value="Commercial">Commercial Offices / Shops</option>
                  <option value="Plot">Plots & Land</option>
                </select>
              </div>

              <div className="text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Location / City
                </label>
                <input
                  type="text"
                  name="search"
                  placeholder="e.g. Wardha Rd, Nagpur"
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 mt-0.5"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md transition-all cursor-pointer"
              >
                <Search className="size-4" />
                <span>Search Listings</span>
              </button>
            </form>

            {/* Quick Badges below search */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="text-slate-400">Trending Searches:</span>
              <Link
                href="/portal-properties?bedrooms=2"
                className="hover:text-blue-600"
              >
                2 BHK Flats
              </Link>
              <span>•</span>
              <Link
                href="/portal-properties?bedrooms=3"
                className="hover:text-blue-600"
              >
                3 BHK Luxury
              </Link>
              <span>•</span>
              <Link
                href="/portal-properties?category=Commercial"
                className="hover:text-blue-600"
              >
                Office Spaces
              </Link>
              <span>•</span>
              <Link
                href="/portal-projects"
                className="text-blue-600 font-semibold hover:underline"
              >
                New Project Launches &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST METRICS STRIP */}
      <section className="bg-white border-b border-slate-200/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                100%
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">
                Verified Direct Owners
              </div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                Zero
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">
                Hidden Fees or Broker Traps
              </div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                RERA
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">
                Compliant Builders & Projects
              </div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                24/7
              </div>
              <div className="text-xs font-medium text-slate-500 mt-0.5">
                Live CRM Inquiries & Visits
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED VERIFIED PROPERTIES (With Premium Hover Motion) */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Sparkles className="size-3.5" />
              <span>Handpicked For You</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Properties in Demand
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Direct residential apartments, penthouses, and gated villas with
              instant site visit scheduling.
            </p>
          </div>

          <Link
            href="/portal-properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition group self-start sm:self-end"
          >
            <span>View All Properties ({propertiesData.pagination.total})</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {featuredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Building2 className="size-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No live public properties right now
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Publish inventory from your CRM Properties module to see them live
              here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* 5. EXPLORE POPULAR LOCALITIES / HUBS (Inspired by PropertyWala) */}
      <section className="bg-slate-100/70 border-y border-slate-200 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              City Locality Guides
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Explore Popular Real Estate Hubs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Average square foot pricing, social infrastructure, and verified
              properties across high-demand areas.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularLocalities.map((loc, idx) => (
              <Link
                key={idx}
                href={`/portal-properties?search=${encodeURIComponent(loc.name)}`}
                className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 block"
              >
                <div className="flex items-center justify-between">
                  <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin className="size-4" />
                  </div>
                  {loc.hot && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Hot 🔥
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">
                  {loc.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{loc.type}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-blue-600 pt-2 border-t border-slate-100">
                  <span>{loc.count}</span>
                  <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. APPROVED MASTER PROJECTS & DEVELOPMENTS */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Layers className="size-3.5" />
              <span>Townships & High-Rises</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Residential & Commercial Projects
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Direct builder inventory across towers, blocks, and floors with
              live availability rollups.
            </p>
          </div>

          <Link
            href="/portal-projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition group self-start sm:self-end"
          >
            <span>View All Projects ({projectsData.pagination.total})</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {featuredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Building2 className="size-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No live public projects right now
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Toggle Website Display to &quot;Live on Web&quot; in the Projects
              dashboard to showcase developments here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* 7. WHY CHOOSE US / ASSURANCE BANNER */}
      <section className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Why Buyers & Investors Trust Our Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
              Engineered from the ground up to solve the fake-listing and spam
              problems of traditional portals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="size-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base text-white">
                Direct Title Verification
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Every listing is matched with a genuine owner identity or
                registered RERA builder certificate before going live.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="font-bold text-base text-white">
                Live Inventory Sync
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                When a unit or flat is booked, rented, or sold in our CRM, it is
                instantly unlisted or flagged to protect your time.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="size-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-4">
                <PhoneCall className="size-5" />
              </div>
              <h3 className="font-bold text-base text-white">
                Dedicated Relationship Leads
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Schedule property site visits and consultation directly with
                specialized property advisors with zero spam calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. LIST YOUR PROPERTY CTA BANNER */}
      <section className="bg-white py-14 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block p-2 bg-blue-50 rounded-2xl text-blue-600 mb-3">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Are You a Property Owner or Developer?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-2">
            Reach thousands of active, verified home buyers and tenants looking
            for residential and commercial spaces.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide shadow-sm transition cursor-pointer"
            >
              List Property / Access CRM &rarr;
            </Link>
            <Link
              href="/portal-properties"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Browse All Listings
            </Link>
          </div>
        </div>
      </section>

      {/* 9. PROFESSIONAL FOOTER */}
      <PublicFooter />
    </div>
  );
}
