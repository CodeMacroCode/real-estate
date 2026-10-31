'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Spinner } from './Spinner';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Turn off navigation bar as soon as pathname or searchParams updates
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Only trigger for internal links that navigate away from current URL
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('/#') &&
        targetAttr !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <aside
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm pointer-events-none transition-opacity duration-200"
    >
      {/* 4px High-Contrast Top Loading Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 w-full bg-blue-100/60 overflow-hidden">
        <div className="h-full w-full bg-blue-600 motion-safe:animate-indeterminate motion-reduce:opacity-80" />
      </div>

      {/* Centered Glassmorphism Spinner Card */}
      <div className="flex flex-col items-center justify-center gap-3.5 rounded-3xl bg-white/85 backdrop-blur-md px-10 py-7 shadow-2xl border border-white/70 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50/90 border border-blue-100 shadow-inner">
          <Spinner size="lg" className="text-blue-600" />
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-sm font-bold tracking-tight text-slate-900">Loading Application…</span>
          <span className="text-xs text-slate-500 mt-0.5">Please wait while the page loads</span>
        </div>
      </div>
    </aside>
  );
}
