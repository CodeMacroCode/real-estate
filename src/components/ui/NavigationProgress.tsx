'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PageLoader } from './PageLoader';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Turn off loading overlay as soon as route or search query finishes updating
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Safety fallback: auto-dismiss loader after 8 seconds if navigation stalls
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  useEffect(() => {
    // 1. Intercept internal anchor link clicks (relative paths and same-origin full URLs)
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      // If opening in a separate new browser tab/window, don't trigger loader in current tab
      if (targetAttr === '_blank') return;

      try {
        const targetUrl = new URL(href, window.location.href);
        if (targetUrl.origin === window.location.origin) {
          const currentUrl = window.location.pathname + window.location.search;
          const destinationUrl = targetUrl.pathname + targetUrl.search;
          if (destinationUrl !== currentUrl && !targetUrl.hash) {
            setIsNavigating(true);
          }
        }
      } catch {
        // Invalid URL format, ignore
      }
    };

    // 2. Browser Back / Forward button navigation
    const handlePopState = () => {
      setIsNavigating(true);
    };

    // 3. Full browser unloads / Hard page redirects
    const handleBeforeUnload = () => {
      setIsNavigating(true);
    };

    // 4. Custom application navigation events (dispatched safely outside React render/effects)
    const handleStart = () => {
      // Use setTimeout 0 to avoid scheduling state updates inside insertion effects
      setTimeout(() => {
        setIsNavigating(true);
      }, 0);
    };
    const handleEnd = () => {
      setTimeout(() => {
        setIsNavigating(false);
      }, 0);
    };

    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('app:navigation-start', handleStart);
    window.addEventListener('app:navigation-end', handleEnd);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('app:navigation-start', handleStart);
      window.removeEventListener('app:navigation-end', handleEnd);
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <PageLoader
      message="Redirecting…"
      subMessage="Please wait while the page loads"
    />
  );
}
