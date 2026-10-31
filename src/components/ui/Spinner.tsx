import React from "react";
import { Loader2 } from "lucide-react";

export function Spinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className="inline-flex items-center justify-center"
    >
      <Loader2
        className={`animate-spin text-blue-600 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      />
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading
      </span>
    </div>
  );
}

export function LinearProgress({ className = "" }: { className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Loading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-1 w-full overflow-hidden bg-blue-100 ${className}`}
    >
      <div className="absolute inset-0 h-full w-full bg-blue-600 motion-safe:animate-indeterminate motion-reduce:opacity-80" />
    </div>
  );
}

export function CenteredGlassOverlay({
  message = "Loading…",
  subMessage = "Please wait while data is retrieved",
  fullScreen = false,
  className = "",
}: {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  const containerPosition = fullScreen ? "fixed inset-0 z-50" : "absolute inset-0 z-30";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${containerPosition} flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 transition-all duration-300 ${className}`}
    >
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 backdrop-blur-md px-8 py-6 shadow-2xl border border-white/80 ring-1 ring-black/5 text-slate-800 animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
        <Spinner size="lg" className="text-blue-600 w-10 h-10" />
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {message}
          </span>
          {subMessage && (
            <span className="text-xs text-slate-500 mt-1 max-w-[240px]">
              {subMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoadingOverlay({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center p-12">
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/90 backdrop-blur-md px-8 py-6 shadow-xl border border-white/80 text-slate-800">
        <Spinner size="lg" className="text-blue-600 w-9 h-9" />
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-bold text-slate-900">{message}</span>
          <span className="text-xs text-slate-500 mt-0.5">
            Please wait while data is retrieved
          </span>
        </div>
      </div>
    </div>
  );
}
