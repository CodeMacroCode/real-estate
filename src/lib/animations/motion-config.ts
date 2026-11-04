/**
 * Motion and Interaction Timing & Easing Specifications
 * Master Design System Configuration
 */

export const MOTION_TOKENS = {
  duration: {
    imageZoom: "400ms",
    cardElevation: "350ms",
    shadow: "350ms",
    favourite: "200ms",
    button: "200ms",
    overlay: "300ms",
  },
  easing: {
    premium: "cubic-bezier(0.2, 0.65, 0.3, 1)",
    standard: "ease",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  },
} as const;
