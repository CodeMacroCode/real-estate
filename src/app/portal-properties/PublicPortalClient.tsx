"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SanitizedPublicProperty } from "@/services/publicPortalService";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyInquiryModal } from "@/components/property/PropertyInquiryModal";

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
    searchParams.transactionType || "",
  );
  const [category, setCategory] = useState(searchParams.category || "");
  const [city, setCity] = useState(searchParams.city || "");
  const [bedrooms, setBedrooms] = useState(searchParams.bedrooms || "");
  const [sort, setSort] = useState(searchParams.sort || "featured");
  const [inquiryProperty, setInquiryProperty] = useState<SanitizedPublicProperty | null>(null);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (transactionType) query.set("transactionType", transactionType);
    if (category) query.set("category", category);
    if (city) query.set("city", city);
    if (bedrooms) query.set("bedrooms", bedrooms);
    if (sort) query.set("sort", sort);
    if (searchParams.agency) query.set("agency", searchParams.agency);
    if (searchParams.adminId) query.set("adminId", searchParams.adminId);

    router.push(`/portal-properties?${query.toString()}`);
  };

  const formatPrice = (prop: SanitizedPublicProperty) => {
    if (prop.transactionType === "Rent" && prop.pricing.monthlyRent) {
      return `₹${prop.pricing.monthlyRent.toLocaleString("en-IN")}/mo`;
    }
    if (prop.pricing.price) {
      if (prop.pricing.price >= 10000000) {
        return `₹${(prop.pricing.price / 10000000).toFixed(2)} Cr`;
      }
      return `₹${(prop.pricing.price / 100000).toFixed(2)} Lakh`;
    }
    return "Price on Request";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner / Hero Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {agencyBranding && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
              <span>Verified Agency Portfolio</span>
              <span>•</span>
              <span>{agencyBranding.agencyName}</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {agencyBranding ? `${agencyBranding.agencyName} Properties` : "Discover Verified Real Estate Listings"}
          </h1>
          <p className="mt-2 text-base text-slate-600">
            {agencyBranding
              ? `Browse exclusively listed & verified real estate directly presented by ${agencyBranding.agencyName}.`
              : "Curated properties directly sourced and verified from trusted owners."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={
              searchParams.agency
                ? `/portal-properties?agency=${searchParams.agency}`
                : searchParams.adminId
                  ? `/portal-properties?adminId=${searchParams.adminId}`
                  : "/portal-properties"
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs"
          >
            Properties
          </Link>
          <Link
            href={
              searchParams.agency
                ? `/portal-projects?agency=${searchParams.agency}`
                : searchParams.adminId
                  ? `/portal-projects?adminId=${searchParams.adminId}`
                  : "/portal-projects"
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            Projects & Developments
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
      >
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Location, title, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Looking To
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Buy or Rent</option>
            <option value="Sale">Buy (For Sale)</option>
            <option value="Rent">Rent</option>
            <option value="Lease">Lease</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Land / Plots</option>
            <option value="Special Investment">Pre-Leased ROI</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Bedrooms
          </label>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Any BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors duration-150 shadow-sm"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <p className="text-sm text-slate-600 mb-2 sm:mb-0">
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {initialProperties.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">
            {initialPagination.total}
          </span>{" "}
          verified properties
        </p>
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-500 font-medium">Sort by:</label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              const query = new URLSearchParams(window.location.search);
              query.set("sort", e.target.value);
              router.push(`/portal-properties?${query.toString()}`);
            }}
            className="border border-slate-300 rounded-md text-xs py-1 px-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="featured">Featured First</option>
            <option value="newest">Newest Listed</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      {initialProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">
            No properties found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search filters or browse other categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              agencySlug={agencyBranding?.agencySlug || searchParams.agency}
              onEnquireClick={(prop) => setInquiryProperty(prop)}
            />
          ))}
        </div>
      )}

      {/* Inquiry Modal with SweetAlert popup on submission */}
      <PropertyInquiryModal
        isOpen={Boolean(inquiryProperty)}
        onClose={() => setInquiryProperty(null)}
        property={inquiryProperty}
        adminId={agencyBranding?.adminId || searchParams.adminId}
      />
    </div>
  );
}
