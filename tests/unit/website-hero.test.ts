import { describe, expect, it } from "vitest";
import { WebsiteSetting } from "@/models/WebsiteSetting";
import {
  HERO_COVER_RATIO_OPTIONS,
  HERO_WHITE_GLASS_STYLE,
  buildHeroCoverOverlayGradient,
  getHeroCoverImageOpacity,
  getHeroCoverOverlayAlpha,
  getHeroCoverRatioOption,
  isHeroLightGlassMode,
} from "@/lib/websiteHero";

describe("websiteHero cover ratio helpers", () => {
  it("resolves known cover ratios and falls back safely to auto", () => {
    expect(HERO_COVER_RATIO_OPTIONS.map((o) => o.value)).toEqual([
      "auto",
      "21:9",
      "16:9",
      "16:5",
      "3:1",
    ]);

    expect(getHeroCoverRatioOption("21:9").sectionAspectClass).toBe(
      "md:aspect-[21/9]",
    );
    expect(getHeroCoverRatioOption("16:9").sectionAspectClass).toBe(
      "md:aspect-video",
    );
    expect(getHeroCoverRatioOption("16:5").sectionAspectClass).toBe(
      "md:aspect-[16/5]",
    );
    expect(getHeroCoverRatioOption("3:1").sectionAspectClass).toBe(
      "md:aspect-[3/1]",
    );
    expect(getHeroCoverRatioOption("unknown").value).toBe("auto");
  });

  it("clamps image opacity and overlay opacity percentages safely between 0 and 1", () => {
    expect(getHeroCoverImageOpacity(undefined)).toBe(1);
    expect(getHeroCoverImageOpacity(35)).toBe(0.35);
    expect(getHeroCoverImageOpacity(-10)).toBe(0);
    expect(getHeroCoverImageOpacity(140)).toBe(1);

    expect(getHeroCoverOverlayAlpha(undefined)).toBe(0.6);
    expect(getHeroCoverOverlayAlpha(0)).toBe(0);
    expect(getHeroCoverOverlayAlpha(45)).toBe(0.45);
    expect(getHeroCoverOverlayAlpha(-10)).toBe(0);
    expect(getHeroCoverOverlayAlpha(120)).toBe(1);

    expect(buildHeroCoverOverlayGradient(0)).toContain("rgba(11, 45, 34, 0)");

    expect(HERO_WHITE_GLASS_STYLE.backgroundColor).toContain("255, 255, 255");
    expect(HERO_WHITE_GLASS_STYLE.backdropFilter).toContain("blur");
    expect(isHeroLightGlassMode(0.25)).toBe(true);
    expect(isHeroLightGlassMode(0.65)).toBe(true);
    expect(isHeroLightGlassMode(0.8)).toBe(false);
  });

  it("defines hero cover banner fields on WebsiteSetting schema", () => {
    expect(WebsiteSetting.schema.path("hero.coverImageUrl")).toBeDefined();
    expect(WebsiteSetting.schema.path("hero.coverAspectRatio")).toBeDefined();
    expect(WebsiteSetting.schema.path("hero.coverImageOpacity")).toBeDefined();
    expect(WebsiteSetting.schema.path("hero.coverOverlayOpacity")).toBeDefined();
  });
});
