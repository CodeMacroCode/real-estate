import React from "react";

export function ProjectCardSkeleton() {
  return (
    <div className="bg-card-white border border-line flex flex-col justify-between animate-pulse">
      {/* 170px Image Area */}
      <div className="h-[170px] bg-line/40 border-b border-line w-full" />

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="h-3 bg-line/30 w-20" />
          <div className="h-6 bg-line/50 w-32" />
        </div>

        <div className="h-4 bg-line/50 w-3/4" />
        <div className="h-3 bg-line/30 w-1/2" />

        {/* RERA Strip */}
        <div className="h-7 bg-paper border border-line" />

        {/* Buttons */}
        <div className="pt-2 flex gap-2">
          <div className="h-8 bg-line/30 flex-1" />
          <div className="h-8 bg-line/50 flex-1" />
        </div>
      </div>
    </div>
  );
}

