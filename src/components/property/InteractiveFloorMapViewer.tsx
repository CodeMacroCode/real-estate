"use client";

import React, { useState } from "react";
import {
  Layers,
  Tv,
  CheckCircle2,
  MapPin,
  Compass,
  Square,
  BedDouble,
  Building,
  Info,
  Sparkles,
} from "lucide-react";

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
  defaultPropertyTitle = "Property Unit",
  propertyCategory = "Residential",
  propertyType = "Penthouse",
  status = "Available",
  carpetArea,
  areaUnit = "Sq. Ft.",
  bedrooms,
  bathrooms,
  furnishing,
  facing,
  city,
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
  const hotspots = currentFloor.hotspots || [];

  // Thumbnail strip at bottom: Floor plan + photos
  const allThumbnails = [
    { type: "map", url: currentFloor.planImageUrl, label: currentFloor.floorName },
    ...propertyImages.map((img, i) => ({ type: "photo", url: img, label: `Photo ${i + 1}` })),
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden my-6">
      {/* Top Header with Multi-Floor Tabs */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white">
              Interactive Floor Map &amp; Inspection
            </h3>
            <p className="text-xs text-slate-400">
              Interactive layout blueprint &amp; live room specifications
            </p>
          </div>
        </div>

        {/* Multi-floor tabs if > 1 floor */}
        {floorPlans.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  {floor.floorName || `Floor ${idx + 1}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main split grid matching reference Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Column: Room Details, Specs, Description & Features */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-slate-50/70 border-r border-slate-200 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Room / Unit Title Header */}
            <div>
              <div className="text-[11px] font-bold text-cyan-700 tracking-wider uppercase mb-1">
                {currentFloor.floorName ? `${currentFloor.floorName} Layout` : "Unit Plan"}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {defaultPropertyTitle}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {status || "AVAILABLE"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-100 text-cyan-800 border border-cyan-200">
                    {propertyType || "Unit"}
                  </span>
                </div>
              </div>
              {(city || address) && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {address ? `${address}, ` : ""}
                  {city}
                </p>
              )}
            </div>

            {/* Spec Cards 2x3 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Type */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Type</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {bedrooms ? `${bedrooms} BHK ${propertyType}` : propertyType}
                  </div>
                </div>
              </div>

              {/* Side / Orientation */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Side</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {facing ? `${facing} Facing` : "Left Side"}
                  </div>
                </div>
              </div>

              {/* Floor */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Floor</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {currentFloor.floorName || "6th Floor"}
                  </div>
                </div>
              </div>

              {/* Connecting / Unit Room */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Adjacent</div>
                  <div className="text-xs font-bold text-slate-800 truncate">Connecting Wing</div>
                </div>
              </div>

              {/* View */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">View</div>
                  <div className="text-xs font-bold text-slate-800 truncate">Ocean / City View</div>
                </div>
              </div>

              {/* Size */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <Square className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Size</div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {carpetArea ? `${carpetArea} ${areaUnit}` : "220 SqFt"}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                One of our most popular units, this spacious floor layout is ideal for luxurious and modern living. Decorated with natural architectural accents, well-appointed circulation spaces, french doors, a comfortable lounge area, and ergonomic dining arrangements.
              </p>
            </div>

            {/* Features & Amenities */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Features &amp; Amenities
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {(amenities.length > 0
                  ? amenities.slice(0, 12)
                  : [
                      "Balcony",
                      "Air Conditioning",
                      "Power Backup",
                      "Living Room",
                      "Dining Area",
                      "Spacious Wardrobes",
                      "Private Parking",
                      "24/7 Security",
                      "High-Speed Wi-Fi",
                      "Modern Bathroom",
                      "Water Storage",
                      "Security System",
                    ]
                ).map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Hotspot Inspector Card */}
          {selectedHotspot && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white border border-cyan-500/40 shadow-lg transition-all">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-cyan-600 text-white">
                    <Tv className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold">{selectedHotspot.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHotspot(null)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>
              {selectedHotspot.subtitle && (
                <p className="text-xs text-cyan-300 font-mono">{selectedHotspot.subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Blueprint Floor Map with Interactive Pins */}
        <div className="lg:col-span-7 bg-slate-100/80 p-4 sm:p-8 flex flex-col justify-between items-center relative overflow-hidden">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative">
            {/* Floor watermark label */}
            <div className="absolute top-5 right-6 z-10 text-right pointer-events-none">
              <span className="text-sm font-extrabold tracking-widest text-slate-300 uppercase">
                {currentFloor.floorName || "6TH FLOOR"}
              </span>
            </div>

            {/* Interactive Blueprint Canvas */}
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
              <img
                src={
                  activeThumbnailIndex !== null && allThumbnails[activeThumbnailIndex]
                    ? allThumbnails[activeThumbnailIndex].url
                    : currentFloor.planImageUrl
                }
                alt={currentFloor.floorName}
                className="w-full h-full object-contain select-none"
              />

              {/* Pins (only active on floor plan view) */}
              {activeThumbnailIndex === null &&
                hotspots.map((spot, idx) => {
                  const isSelected = selectedHotspot?.id === spot.id || selectedHotspot === spot;
                  return (
                    <div
                      key={spot.id || idx}
                      style={{
                        left: `${spot.xPercent}%`,
                        top: `${spot.yPercent}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                      onClick={() => setSelectedHotspot(spot)}
                    >
                      {/* Pulsing ring */}
                      <span className="absolute -inset-1.5 rounded-full bg-cyan-400 opacity-75 animate-ping" />

                      {/* Pin Button */}
                      <div
                        className={`relative flex items-center justify-center size-7 rounded-lg shadow-md transition-all ${
                          isSelected
                            ? "bg-cyan-500 text-white scale-110 ring-2 ring-white"
                            : "bg-slate-900 text-white hover:bg-cyan-600 hover:scale-105"
                        }`}
                      >
                        <Tv className="size-3.5" />
                      </div>

                      {/* Popover Tooltip */}
                      <div
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 transition-all pointer-events-auto ${
                          isSelected
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none"
                        }`}
                      >
                        <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-2xl border border-slate-700 min-w-[170px] whitespace-nowrap flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shrink-0">
                            <Tv className="size-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white tracking-wide">
                              {spot.title || "IOT TV"}
                            </div>
                            <div className="text-[10px] text-slate-300 font-mono">
                              {spot.subtitle || `60" Sony - SN #29489`}
                            </div>
                          </div>
                        </div>
                        {/* Triangle pointer */}
                        <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 border-r border-b border-slate-700 mx-auto -mt-1.5" />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Helper notice */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-600" />
                Click pin marker to view connected device &amp; hardware specs
              </span>
              <span>{hotspots.length} Markers</span>
            </div>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="w-full max-w-2xl mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-1">
              {allThumbnails.map((thumb, i) => {
                const isSelected =
                  (activeThumbnailIndex === null && i === 0) || activeThumbnailIndex === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveThumbnailIndex(i === 0 ? null : i)}
                    className={`size-14 sm:size-16 rounded-xl overflow-hidden border-2 bg-white shrink-0 transition-all ${
                      isSelected
                        ? "border-cyan-600 shadow-md ring-2 ring-cyan-200 scale-105"
                        : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
                    }`}
                  >
                    <img
                      src={thumb.url}
                      alt={thumb.label}
                      className="size-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

