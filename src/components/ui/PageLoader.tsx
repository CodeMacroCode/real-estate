import React from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
}

export function PageLoader({
  message = "Loading Application…",
  subMessage = "Please wait while the page loads",
}: PageLoaderProps) {
  return (
    <aside
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/25 backdrop-blur-sm pointer-events-none transition-opacity duration-200"
    >
      {/* High-Contrast Top Loading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 w-full bg-blue-100/80 overflow-hidden z-[100000]">
        <div className="h-full w-full bg-blue-600 motion-safe:animate-indeterminate motion-reduce:opacity-80" />
      </div>

      {/* Centered Glassmorphism Spinner Card */}
      <div className="flex flex-col items-center justify-center gap-3.5 rounded-3xl bg-white/95 backdrop-blur-md px-10 py-7 shadow-2xl border border-white/80 ring-1 ring-black/5 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50/90 border border-blue-100 shadow-inner">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-bold tracking-tight text-slate-900">
            {message}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{subMessage}</span>
        </div>
      </div>
    </aside>
  );
}
