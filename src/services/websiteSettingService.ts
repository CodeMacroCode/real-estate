import { connectToDatabase } from "@/lib/mongodb/db";
import {
  WebsiteSetting,
  IWebsiteSettingDocument,
} from "@/models/WebsiteSetting";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function getWebsiteSettingsByAdminId(adminId: string) {
  await connectToDatabase();
  const setting = await WebsiteSetting.findOne({
    adminId: new mongoose.Types.ObjectId(adminId),
  }).lean();

  if (setting) {
    // Deep clone to a clean plain JSON object with no MongoDB ObjectIds or buffers
    return JSON.parse(
      JSON.stringify(setting, (key, value) => {
        if (value && typeof value === "object" && value._bsontype === "ObjectID") {
          return value.toString();
        }
        return value;
      })
    );
  }

  // Fallback to clean blank defaults (no pre-filled copy text)
  const adminUser = await User.findById(adminId).lean();
  const defaultObj = {
    adminId: adminId.toString(),
    branding: {
      companyName:
        adminUser?.agencyName || adminUser?.name || "",
      tagline: "",
      logoUrl: "",
    },
    hero: {
      eyebrowText: "",
      headline: "",
      subheadline: "",
      bannerType: "default_svg",
      customBannerUrl: "",
      coverImageUrl: "",
      coverAspectRatio: "auto",
      coverImageOpacity: 100,
      coverOverlayOpacity: 60,
      trustBadges: [],
    },
    contact: {
      address: "",
      city: "",
      pincode: "",
      phone: "",
      alternatePhone: "",
      email: "",
      whatsappNumber: "",
      googleMapsEmbedUrl: "",
      workingHours: "",
      latitude: undefined,
      longitude: undefined,
    },
    socialLinks: {
      facebook: "",
      instagram: "",
      linkedin: "",
      youtube: "",
      twitter: "",
    },
    theme: {
      primaryColor: "#0e3b2e",
      deepColor: "#0b2d22",
      accentColor: "#b5822c",
      paperColor: "#f6f2ea",
    },
    regulatory: {
      badgeText: "",
      registrationNumber: "",
      disclaimerText: "",
    },
    footer: {
      aboutText: "",
      copyrightText: "",
      logoUrl: "",
    },
    aboutUs: {
      eyebrowText: "",
      headline: "",
      story: "",
      missionTitle: "",
      missionDescription: "",
      visionTitle: "",
      visionDescription: "",
      bannerImageUrl: "",
      yearsExperience: "",
      propertiesSoldCount: "",
      happyClientsCount: "",
      teamSizeCount: "",
      highlights: [],
    },
  };

  return JSON.parse(JSON.stringify(defaultObj));
}

export async function upsertWebsiteSettings(
  adminId: string,
  payload: Partial<IWebsiteSettingDocument>,
) {
  await connectToDatabase();
  const existingHero = (payload.hero || {}) as Partial<IWebsiteSettingDocument["hero"]>;
  const normalizedHero = {
    eyebrowText: existingHero.eyebrowText ?? "",
    headline: existingHero.headline ?? "",
    subheadline: existingHero.subheadline ?? "",
    bannerType: existingHero.bannerType || "default_svg",
    customBannerUrl: existingHero.customBannerUrl ?? "",
    coverImageUrl: existingHero.coverImageUrl ?? "",
    coverAspectRatio: existingHero.coverAspectRatio || "auto",
    coverImageOpacity:
      typeof existingHero.coverImageOpacity === "number"
        ? existingHero.coverImageOpacity
        : 100,
    coverOverlayOpacity:
      typeof existingHero.coverOverlayOpacity === "number"
        ? existingHero.coverOverlayOpacity
        : 60,
    trustBadges: Array.isArray(existingHero.trustBadges)
      ? existingHero.trustBadges
      : [],
  };

  const existingAbout = (payload.aboutUs || {}) as Partial<
    NonNullable<IWebsiteSettingDocument["aboutUs"]>
  >;
  const normalizedAboutUs = {
    eyebrowText: existingAbout.eyebrowText ?? "",
    headline: existingAbout.headline ?? "",
    story: existingAbout.story ?? "",
    missionTitle: existingAbout.missionTitle ?? "",
    missionDescription: existingAbout.missionDescription ?? "",
    visionTitle: existingAbout.visionTitle ?? "",
    visionDescription: existingAbout.visionDescription ?? "",
    bannerImageUrl: existingAbout.bannerImageUrl ?? "",
    yearsExperience: existingAbout.yearsExperience ?? "",
    propertiesSoldCount: existingAbout.propertiesSoldCount ?? "",
    happyClientsCount: existingAbout.happyClientsCount ?? "",
    teamSizeCount: existingAbout.teamSizeCount ?? "",
    highlights: Array.isArray(existingAbout.highlights)
      ? existingAbout.highlights.map((h) => ({
          title: h?.title ?? "",
          description: h?.description ?? "",
        }))
      : [],
  };

  const updated = await WebsiteSetting.findOneAndUpdate(
    { adminId: new mongoose.Types.ObjectId(adminId) },
    {
      $set: {
        branding: payload.branding,
        hero: normalizedHero,
        contact: payload.contact,
        socialLinks: payload.socialLinks,
        theme: payload.theme,
        regulatory: payload.regulatory,
        footer: payload.footer,
        aboutUs: normalizedAboutUs,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, strict: false },
  ).lean();

  return updated;
}
