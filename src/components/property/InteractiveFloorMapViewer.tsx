"use client";

import React, { useState } from "react";
import {
  Layers,
  MapPin,
  CheckCircle2,
  Building,
  Info,
} from "lucide-react";
import { formatFloorOrdinal } from "@/lib/portalUtils";

export interface FloorPlanHotspot {
  id?: string;
  xPercent: number;
  yPercent: number;
  title: string;
  subtitle?: string;
  category?: string;
  status?: string;
}

export interface FloorPlanMapItem {
  floorName: string;
  floorNumber?: number;
  planImageUrl: string;
  roomTitle?: string;
  roomType?: string;
  side?: string;
  view?: string;
  sizeSqFt?: number | string;
  status?: string;
  description?: string;
  features?: string[];
  hotspots?: FloorPlanHotspot[];
}

interface InteractiveFloorMapViewerProps {
  floorPlans: FloorPlanMapItem[];
  defaultPropertyTitle?: string;
  propertyCategory?: string;
  propertyType?: string;
  status?: string;
  carpetArea?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  facing?: string;
  city?: string;
  address?: string;
  amenities?: string[];
  propertyImages?: string[];
}

export function InteractiveFloorMapViewer({
  floorPlans,
  defaultPropertyTitle = "Unit Plan",
  propertyCategory,
  propertyType = "Unit",
  status = "AVAILABLE",
  carpetArea,
  areaUnit = "Sq. Ft.",
  bedrooms,
  bathrooms,
  furnishing,
  facing,
  city = "Nagpur",
  address,
  amenities = [],
  propertyImages = [],
}: InteractiveFloorMapViewerProps) {
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState<FloorPlanHotspot | null>(null);
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState<number | null>(null);

  if (!floorPlans || floorPlans.length === 0) {
    return null;
  }

  const currentFloor = floorPlans[activeFloorIndex] || floorPlans[0];
  const hotspots = (currentFloor.hotspots || []).filter(
    (s) => !s.title?.includes("IOT TV") && !s.subtitle?.includes("29489")
  );

  const allThumbnails = [
    { type: "map", url: currentFloor.planImageUrl, label: currentFloor.floorName },
    ...propertyImages.map((img, i) => ({ type: "photo", url: img, label: `Photo ${i + 1}` })),
  ];

  return (
    <div
      className="bg-card-white border-2 shadow-hard-brass my-6"
      style={{ borderColor: "var(--ink-green, #0e3b2e)" }}
    >
      {/* Top Header with Multi-Floor Tabs */}
      <div
        className="text-paper px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b"
        style={{
          backgroundColor: "var(--deep-green, #0b2d22)",
          borderColor: "var(--ink-green, #0e3b2e)",
          color: "var(--paper, #f6f2ea)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-8 flex items-center justify-center font-bold border"
            style={{
              backgroundColor: "var(--ink-green, #0e3b2e)",
              borderColor: "var(--brass, #b5822c)",
              color: "var(--brass, #b5822c)",
            }}
          >
            <Layers className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span
              className="text-[10px] font-bold uppercase tracking-widest block"
              style={{ color: "var(--brass, #b5822c)" }}
            >
              03 &mdash; Architectural Blueprint
            </span>
            <h3 className="font-serif font-bold text-base sm:text-lg text-paper">
              Interactive Floor Blueprint &amp; Inspection
            </h3>
          </div>
        </div>

        {/* Floor Switcher Tabs */}
        {floorPlans.length > 1 && (
          <div
            className="flex items-center gap-1.5 overflow-x-auto p-1 border"
            style={{
              backgroundColor: "var(--ink-green, #0e3b2e)",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            {floorPlans.map((floor, idx) => {
              const isActive = idx === activeFloorIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveFloorIndex(idx);
                    setSelectedHotspot(null);
                    setActiveThumbnailIndex(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all border ${
                    isActive
                      ? "bg-brass text-paper border-brass"
                      : "text-line/80 border-transparent hover:text-paper hover:bg-deep-green"
                  }`}
                >
                  {floor.floorName || formatFloorOrdinal(floor.floorNumber || idx)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left Column: Property Overview & Amenities */}
        <div className="lg:col-span-5 p-6 sm:p-7 bg-paper/60 border-r border-line flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-bold text-brass tracking-widest uppercase mb-1">
                {currentFloor.floorName ? `${currentFloor.floorName} Specification` : "Unit Layout"}
              </div>
              <h2 className="font-serif text-2xl font-bold text-ink-green tracking-tight">
                {defaultPropertyTitle}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-card-white text-ink-green border border-ink-green">
                  {status}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brass text-paper">
                  {propertyType}
                </span>
              </div>
              {(city || address) && (
                <p className="text-xs text-muted-ink flex items-center gap-1 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-brass shrink-0" strokeWidth={1.5} />
                  <span>{address ? `${address}, ` : ""}{city}</span>
                </p>
              )}
            </div>

            {/* Property Overview */}
            <div>
              <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider mb-2.5 pb-1 border-b border-line">
                Property Overview
              </h4>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {carpetArea && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Carpet Area</dt>
                    <dd className="font-bold text-ink mt-0.5">{carpetArea} {areaUnit}</dd>
                  </div>
                )}
                {propertyType && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Property Type</dt>
                    <dd className="font-bold text-ink mt-0.5">{propertyType}</dd>
                  </div>
                )}
                {bedrooms !== undefined && bedrooms !== null && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Bedrooms</dt>
                    <dd className="font-bold text-ink mt-0.5">{bedrooms} BHK</dd>
                  </div>
                )}
                {bathrooms !== undefined && bathrooms !== null && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Bathrooms</dt>
                    <dd className="font-bold text-ink mt-0.5">{bathrooms} Baths</dd>
                  </div>
                )}
                {furnishing && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Furnishing</dt>
                    <dd className="font-bold text-ink mt-0.5">{furnishing}</dd>
                  </div>
                )}
                {facing && (
                  <div className="bg-card-white p-2.5 border border-line">
                    <dt className="text-muted-ink text-[10px] uppercase font-semibold">Facing</dt>
                    <dd className="font-bold text-ink mt-0.5">{facing} Facing</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Features & Amenities */}
            <div>
              <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider mb-2.5 pb-1 border-b border-line">
                Features &amp; Amenities
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {(amenities.length > 0
                  ? amenities.slice(0, 10)
                  : [
                      "Balcony",
                      "Air Conditioning",
                      "Power Backup",
                      "Living Room",
                      "Dining Area",
                      "Spacious Wardrobes",
                      "Private Parking",
                      "24/7 Security",
                    ]
                ).map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs font-medium text-ink bg-card-white px-2.5 py-1.5 border border-line"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-brass shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Floor Blueprint Image Canvas */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-card-white">
          <div className="relative w-full aspect-[4/3] max-h-[480px] bg-paper border-2 border-line overflow-hidden flex items-center justify-center">
            {/* Blueprint border canvas */}
            <div className="absolute inset-0 pointer-events-none border border-line" />

            <img
              src={
                activeThumbnailIndex !== null && allThumbnails[activeThumbnailIndex]
                  ? allThumbnails[activeThumbnailIndex].url
                  : currentFloor.planImageUrl
              }
              alt={currentFloor.floorName}
              className="w-full h-full object-contain select-none p-4 relative z-10"
            />

            {/* Blueprint watermark */}
            <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-ink-green text-brass text-[9px] font-mono uppercase tracking-widest border border-brass">
              Blueprint Scale 1:100
            </div>
          </div>

          {/* Helper notice */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-ink">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brass shrink-0" strokeWidth={1.5} />
              <span>Architectural line plan verified under municipal building bylaws.</span>
            </span>
            <span className="font-mono text-[10px] text-ink-green font-bold">
              {currentFloor.floorName || "Ground Floor"}
            </span>
          </div>

          {/* Thumbnail Gallery Strip at Bottom */}
          {allThumbnails.length > 1 && (
            <div className="mt-4 pt-3 border-t border-line flex items-center gap-2 overflow-x-auto pb-1">
              {allThumbnails.map((thumb, idx) => {
                const isSelected =
                  activeThumbnailIndex === idx ||
                  (activeThumbnailIndex === null && idx === 0);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveThumbnailIndex(idx)}
                    className={`relative shrink-0 size-14 border-2 transition-all overflow-hidden ${
                      isSelected
                        ? "border-brass shadow-hard-green-sm"
                        : "border-line hover:border-ink-green opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={thumb.url}
                      alt={thumb.label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
