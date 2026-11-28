export type HeroCoverRatio = "auto" | "21:9" | "16:9" | "16:5" | "3:1";

export interface HeroCoverRatioOption {
  value: HeroCoverRatio;
  label: string;
  shortLabel: string;
  hint: string;
  previewAspectClass: string;
  sectionAspectClass: string;
}

export const HERO_COVER_RATIO_OPTIONS: HeroCoverRatioOption[] = [
  {
    value: "auto",
    label: "Responsive Fit (Auto)",
    shortLabel: "Auto",
    hint: "Fits hero height automatically",
    previewAspectClass: "aspect-[21/9]",
    sectionAspectClass: "",
  },
  {
    value: "21:9",
    label: "21:9 Ultra-Wide",
    shortLabel: "21:9",
    hint: "Recommended 1920 × 820 px",
    previewAspectClass: "aspect-[21/9]",
    sectionAspectClass: "md:aspect-[21/9]",
  },
  {
    value: "16:9",
    label: "16:9 Widescreen",
    shortLabel: "16:9",
    hint: "Recommended 1920 × 1080 px",
    previewAspectClass: "aspect-video",
    sectionAspectClass: "md:aspect-video",
  },
  {
    value: "16:5",
    label: "16:5 Panoramic",
    shortLabel: "16:5",
    hint: "Recommended 1920 × 600 px",
    previewAspectClass: "aspect-[16/5]",
    sectionAspectClass: "md:aspect-[16/5]",
  },
  {
    value: "3:1",
    label: "3:1 Editorial",
    shortLabel: "3:1",
    hint: "Recommended 1800 × 600 px",
    previewAspectClass: "aspect-[3/1]",
    sectionAspectClass: "md:aspect-[3/1]",
  },
];

export function getHeroCoverRatioOption(ratio?: string): HeroCoverRatioOption {
  return (
    HERO_COVER_RATIO_OPTIONS.find((opt) => opt.value === ratio) ||
    HERO_COVER_RATIO_OPTIONS[0]
  );
}

/** Convert percentage (0-100) into CSS opacity (0-1) for the uploaded cover image. */
export function getHeroCoverImageOpacity(opacityPercent?: number): number {
  const num = typeof opacityPercent === "number" ? opacityPercent : 100;
  const clamped = Math.min(100, Math.max(0, num));
  return Number((clamped / 100).toFixed(2));
}

/** Convert percentage (0-100) into a safe CSS alpha (0-1) for the green hero tint. */
export function getHeroCoverOverlayAlpha(opacityPercent?: number): number {
  const num = typeof opacityPercent === "number" ? opacityPercent : 60;
  const clamped = Math.min(100, Math.max(0, num));
  return Number((clamped / 100).toFixed(2));
}

/** Build directional dark-green readability gradient respecting 0% true transparency. */
export function buildHeroCoverOverlayGradient(alpha: number): string {
  const mid = Number((alpha * 0.85).toFixed(3));
  const end = Number((alpha * 0.7).toFixed(3));
  return `linear-gradient(90deg, rgba(11, 45, 34, ${alpha}) 0%, rgba(14, 59, 46, ${mid}) 55%, rgba(11, 45, 34, ${end}) 100%)`;
}

/** Frosted white glass surface rendered behind a translucent uploaded cover banner. */
export const HERO_WHITE_GLASS_STYLE = {
  backgroundColor: "rgba(255, 255, 255, 0.72)",
  backgroundImage:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.68) 50%, rgba(255, 255, 255, 0.9) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
} as const;

/** Switch hero text to dark ink when the cover image opacity is translucent over white glass. */
export function isHeroLightGlassMode(imageOpacity: number): boolean {
  return imageOpacity <= 0.65;
}
