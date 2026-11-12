"use client";

import React, { useState } from "react";
import { Layers, ShieldCheck, Info } from "lucide-react";

interface PhaseItem {
  phaseName: string;
  phaseNumber?: number;
  status?: string;
  completionDate?: string;
  reraNumber?: string;
  imageUrl?: string;
  description?: string;
}

interface ProjectMasterPlanViewerProps {
  projectName: string;
  masterPlanUrl?: string;
  phases?: PhaseItem[];
  reraNumber?: string;
}

export function ProjectMasterPlanViewer({
  projectName,
  masterPlanUrl,
  phases = [],
  reraNumber,
}: ProjectMasterPlanViewerProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const tabs = [
    {
      label: "Master Layout",
      url: masterPlanUrl,
      title: `${projectName} - Master Site Layout`,
    },
    ...phases.map((p, i) => ({
      label: p.phaseName || `Phase ${i + 1}`,
      url: p.imageUrl || masterPlanUrl,
      title: `${projectName} - ${p.phaseName || `Phase ${i + 1}`}`,
      phase: p,
    })),
  ].filter((t) => Boolean(t.url));

  if (tabs.length === 0) return null;

  const activeItem = tabs[activeTab] || tabs[0];

  return (
    <div className="bg-card-white border-2 border-ink-green shadow-hard-brass my-8">
      {/* Header */}
      <div className="bg-deep-green text-paper px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-ink-green">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-ink-green text-brass border border-brass flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brass block">
              03 &mdash; Development Blueprint
            </span>
            <h3 className="font-serif font-bold text-base sm:text-lg text-paper">
              Master Plan &amp; Phasing Blueprints
            </h3>
          </div>
        </div>

        {/* Phase selector tabs */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-ink-green border border-line/20">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all border ${
                  activeTab === idx
                    ? "bg-brass text-paper border-brass"
                    : "text-line/80 border-transparent hover:text-paper hover:bg-deep-green"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main image viewer canvas */}
      <div className="p-6 bg-card-white">
        <div className="relative w-full aspect-[16/9] max-h-[500px] bg-paper border-2 border-line overflow-hidden flex items-center justify-center">
          <img
            src={activeItem.url}
            alt={activeItem.title}
            className="w-full h-full object-contain p-4"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-ink-green text-brass text-[9px] font-mono uppercase tracking-widest border border-brass">
            Sanction Plan Blueprint
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-ink">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-brass" strokeWidth={1.5} />
            <span>
              MahaRERA Registration:{" "}
              {reraNumber || "Approved Project Blueprint"}
            </span>
          </span>
          <span className="font-bold text-ink-green uppercase text-[11px] tracking-wider">
            {activeItem.label}
          </span>
        </div>
      </div>
    </div>
  );
}
