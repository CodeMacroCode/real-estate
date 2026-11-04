'use client';

import { useEffect } from 'react';

/**
 * Disables mouse wheel scrolling from unintentionally incrementing/decrementing
 * <input type="number"> values across the entire application.
 */
export function NumberInputScrollLock() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement &&
        activeElement.type === 'number'
      ) {
        // Blur the input or prevent default so the page or modal scrolls normally
        // without altering the numerical value!
        activeElement.blur();
      }
    };

    // Attach passive wheel listener globally
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}

