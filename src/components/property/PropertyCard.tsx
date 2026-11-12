"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Check,
  Eye,
  Mail,
  Heart,
} from "lucide-react";
import { SanitizedPublicProperty } from "@/services/publicPortalService";
import { formatPrice } from "@/lib/portalUtils";
import { motion, useReducedMotion } from "motion/react";

interface PropertyCardProps {
  property: SanitizedPublicProperty;
  onEnquireClick?: (property: SanitizedPublicProperty) => void;
  agencySlug?: string;
}

export function PropertyCard({ property, onEnquireClick, agencySlug }: PropertyCardProps) {
  const [isFavourited, setIsFavourited] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const activeAgencySlug = agencySlug || property.agency?.agencySlug;
  const propertyUrl = activeAgencySlug
    ? `/portal-properties/${property.slug || property.id}?agency=${activeAgencySlug}`
    : `/portal-properties/${property.slug || property.id}`;

  const displayPrice =
    property.transactionType === "Rent" && property.pricing?.monthlyRent
      ? `₹ ${(property.pricing.monthlyRent).toLocaleString("en-IN")}/mo`
      : formatPrice(property.pricing?.price);

  const calculatePricePerSqFt = () => {
    const area = property.areaDetails?.carpetArea || property.areaDetails?.builtUpArea;
    const price = property.pricing?.price;
    if (area && price && price > 0 && area > 0) {
      const rate = Math.round(price / area);
      return `₹ ${rate.toLocaleString("en-IN")}/sq.ft`;
    }
    return null;
  };
  const pricePerSqFt = calculatePricePerSqFt();

  const areaText = property.areaDetails?.carpetArea
    ? `${property.areaDetails.carpetArea} ${property.areaDetails.areaUnit || "Sq. Ft."}`
    : "On Request";

  return (
    <motion.article
      whileHover={shouldReduceMotion ? {} : { y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group relative bg-card-white border border-line hover:border-ink-green hover:shadow-hard-green transition-shadow flex flex-col justify-between"
    >
      {/* 170px image area */}
      <div className="relative h-[170px] w-full overflow-hidden bg-paper border-b border-line">
        <Link href={propertyUrl} className="block w-full h-full">
          {property.media?.featuredImage ? (
            <div className="relative w-full h-full overflow-hidden">
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full h-full"
              >
                {/* next/image optimization with fallback */}
                <Image
                  src={property.media.featuredImage}
                  alt={property.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </motion.div>
            </div>
          ) : (
            <div className="w-full h-full bg-[#14503d]/10 flex flex-col items-center justify-center p-4 text-center">
              {/* Flat building SVG illustration */}
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-ink-green opacity-70">
                <rect x="12" y="20" width="22" height="38" fill="#0e3b2e" />
                <rect x="30" y="10" width="22" height="48" fill="#14503d" />
                <rect x="18" y="26" width="4" height="6" fill="#b5822c" />
                <rect x="18" y="38" width="4" height="6" fill="#f6f2ea" />
                <rect x="36" y="16" width="4" height="6" fill="#f6f2ea" />
                <rect x="44" y="16" width="4" height="6" fill="#b5822c" />
                <rect x="36" y="28" width="4" height="6" fill="#b5822c" />
                <rect x="44" y="28" width="4" height="6" fill="#f6f2ea" />
              </svg>
              <span className="text-[10px] font-bold text-ink-green uppercase tracking-wider mt-1">
                Verified Listing Blueprint
              </span>
            </div>
          )}
        </Link>

        {/* Top-left ribbon tag */}
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2.5 py-0.5 bg-ink-green text-paper text-[10px] font-bold uppercase tracking-wider border border-brass">
            For {property.transactionType || "Sale"}
          </span>
        </div>

        {/* Top-right solid contrast "Verified" stamp */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          <span className="px-2.5 py-1 bg-white/95 text-slate-900 text-[10px] font-bold uppercase tracking-wider border border-slate-300 shadow-xs flex items-center gap-1 backdrop-blur-xs">
            <Check className="size-3 text-emerald-600 stroke-[3]" />
            Verified
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFavourited(!isFavourited);
            }}
            aria-label="Save listing"
            className="p-1 bg-white/95 border border-slate-300 text-slate-700 hover:text-brass shadow-xs backdrop-blur-xs"
          >
            <Heart className={`size-3.5 ${isFavourited ? "fill-brass text-brass" : ""}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Body: price, title, locality */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Price row */}
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="font-serif text-[22px] font-bold text-ink-green leading-none">
              {displayPrice}
            </div>
            {pricePerSqFt && (
              <div className="text-[11px] text-muted-ink font-medium">
                {pricePerSqFt}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[15px] text-ink leading-snug line-clamp-1 group-hover:text-ink-green transition-colors">
            <Link href={propertyUrl}>{property.title}</Link>
          </h3>

          {/* Locality */}
          <p className="text-xs text-muted-ink mt-1 flex items-center gap-1 line-clamp-1">
            <MapPin className="size-3 text-brass shrink-0" strokeWidth={1.5} />
            <span>
              {property.location?.address ? `${property.location.address}, ` : ""}
              {property.location?.city || "Nagpur"}
            </span>
          </p>

          {/* Spec strip: three equal cells separated by 1px lines (BHK | Bath | Area) */}
          <div className="mt-3 grid grid-cols-3 border border-line text-center text-xs divide-x divide-line bg-paper/60">
            <div className="py-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-ink block font-semibold">
                Bedrooms
              </span>
              <span className="font-bold text-ink text-xs mt-0.5 block">
                {property.residentialSpecs?.bedrooms ? `${property.residentialSpecs.bedrooms} BHK` : "N/A"}
              </span>
            </div>
            <div className="py-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-ink block font-semibold">
                Bath
              </span>
              <span className="font-bold text-ink text-xs mt-0.5 block">
                {property.residentialSpecs?.bathrooms ? `${property.residentialSpecs.bathrooms} Baths` : "1+"}
              </span>
            </div>
            <div className="py-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-ink block font-semibold">
                Area
              </span>
              <span className="font-bold text-ink text-xs mt-0.5 block truncate">
                {areaText}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons: "View details" (outlined green) and "Enquire" (solid brass) */}
        <div className="mt-4 pt-2 flex items-center gap-2">
          <Link
            href={propertyUrl}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold uppercase tracking-wider text-ink-green bg-card-white border border-ink-green hover:bg-paper transition-colors"
          >
            <Eye className="size-3.5" strokeWidth={1.5} />
            View details
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold uppercase tracking-wider text-paper bg-brass hover:bg-brass-hover transition-colors shadow-hard-green-sm"
          >
            <Mail className="size-3.5" strokeWidth={1.5} />
            Enquire
          </button>
        </div>
      </div>
    </motion.article>
  );
}
