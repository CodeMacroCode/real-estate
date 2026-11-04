"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  CheckCircle2,
  Building,
  Eye,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { SanitizedPublicProperty } from "@/services/publicPortalService";

interface PropertyCardProps {
  property: SanitizedPublicProperty;
  onEnquireClick?: (property: SanitizedPublicProperty) => void;
  agencySlug?: string;
}

export function PropertyCard({ property, onEnquireClick, agencySlug }: PropertyCardProps) {
  const [isFavourited, setIsFavourited] = useState(false);

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

  const calculatePricePerSqFt = (prop: SanitizedPublicProperty) => {
    const area = prop.areaDetails?.carpetArea || prop.areaDetails?.builtUpArea;
    const price = prop.pricing?.price;
    if (area && price && price > 0 && area > 0) {
      const rate = Math.round(price / area);
      return `₹${rate.toLocaleString("en-IN")}/sq.ft`;
    }
    return null;
  };

  const imageCount =
    (property.media?.featuredImage ? 1 : 0) +
    (Array.isArray(property.media?.images) ? property.media.images.length : 0);

  const pricePerSqFt = calculatePricePerSqFt(property);
  const activeAgencySlug = agencySlug || property.agency?.agencySlug;
  const propertyUrl = activeAgencySlug
    ? `/portal-properties/${property.slug || property.id}?agency=${activeAgencySlug}`
    : `/portal-properties/${property.slug || property.id}`;

  return (
    <div className="premium-property-card group relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between">
      {/* =========================================================================
          A. Property Image Section
          ========================================================================= */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Link href={propertyUrl} className="block w-full h-full cursor-pointer">
          {property.media?.featuredImage ? (
            <img
              src={property.media.featuredImage}
              alt={property.title}
              className="premium-property-card__image w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-300 bg-slate-50">
              <Building className="size-10 stroke-[1.2]" />
              <span className="text-[11px] font-medium text-slate-400 mt-1">
                Photo coming soon
              </span>
            </div>
          )}

          {/* Low-opacity Dark Overlay on hover */}
          <div className="premium-property-card__overlay absolute inset-0 pointer-events-none" />
        </Link>

        {/* Top Badges (Left) */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase shadow-xs backdrop-blur-xs ${
              property.transactionType === "Rent"
                ? "bg-amber-500 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            For {property.transactionType}
          </span>

          {property.featuredProperty && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-400 text-amber-950 shadow-xs">
              <Sparkles className="size-3 fill-amber-950" />
              Featured
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/95 text-white shadow-xs backdrop-blur-xs">
            <CheckCircle2 className="size-3" />
            Verified
          </span>
        </div>

        {/* Top-Right: Accessible Favourite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFavourited((prev) => !prev);
          }}
          aria-label={
            isFavourited ? "Remove from favourites" : "Save to favourites"
          }
          className="premium-property-card__favourite absolute top-3 right-3 size-8.5 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-red-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavourited ? "fill-red-500 text-red-500" : "text-slate-600"
            }`}
          />
        </button>

        {/* Bottom Image Badges: Price & Photo Count */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-md">
            <div className="text-sm font-extrabold tracking-tight">
              {formatPrice(property)}
            </div>
            {pricePerSqFt && (
              <div className="text-[10px] text-slate-300 font-medium">
                {pricePerSqFt}
              </div>
            )}
          </div>

          {imageCount > 1 && (
            <div className="bg-slate-900/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider">
              1/{imageCount} Photos
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          B. Property Information Section
          ========================================================================= */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Locality */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-blue-600 uppercase tracking-wider text-[11px]">
              {property.propertyType}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500 font-medium truncate max-w-[50%]">
              <MapPin className="size-3 text-slate-400 shrink-0" />
              {property.location?.city}
            </span>
          </div>

          {/* Property Title */}
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
            <Link href={propertyUrl}>{property.title}</Link>
          </h3>

          {/* Locality Address */}
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {property.location?.address}
            {property.location?.landmark &&
              `, near ${property.location.landmark}`}
          </p>

          {/* Key Specifications (BHK, Area, Furnishing) */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-2.5 text-center text-xs">
            <div className="border-r border-slate-100 pr-1">
              <span className="text-[10px] text-slate-400 block font-medium">
                Bedrooms
              </span>
              <span className="font-bold text-slate-800">
                {property.residentialSpecs?.bedrooms
                  ? `${property.residentialSpecs.bedrooms} BHK`
                  : "N/A"}
              </span>
            </div>

            <div className="border-r border-slate-100 px-1">
              <span className="text-[10px] text-slate-400 block font-medium">
                Carpet Area
              </span>
              <span className="font-bold text-slate-800">
                {property.areaDetails?.carpetArea
                  ? `${property.areaDetails.carpetArea} ${property.areaDetails.areaUnit}`
                  : "On Request"}
              </span>
            </div>

            <div className="pl-1">
              <span className="text-[10px] text-slate-400 block font-medium">
                Furnishing
              </span>
              <span className="font-bold text-slate-800 truncate block">
                {property.residentialSpecs?.furnishing || "Unfurnished"}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            C. Card Footer & CTAs
            ========================================================================= */}
        <div className="mt-4 pt-1 flex items-center gap-2">
          <Link
            href={propertyUrl}
            className="premium-property-card__cta flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition cursor-pointer"
          >
            <Eye className="size-3.5 text-slate-500" />
            View Details
          </Link>

          <button
            type="button"
            onClick={() => {
              if (onEnquireClick) {
                onEnquireClick(property);
              } else {
                window.location.href = `${propertyUrl}#enquire`;
              }
            }}
            className="premium-property-card__cta flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            <PhoneCall className="size-3.5" />
            Enquire Now
          </button>
        </div>
      </div>
    </div>
  );
}
