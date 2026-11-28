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

  // Fallback to initial defaults populated from User model if available
  const adminUser = await User.findById(adminId).lean();
  const defaultObj = {
    adminId: adminId.toString(),
    branding: {
      companyName:
        adminUser?.agencyName || adminUser?.name || "Real Estate Agency",
      tagline: "RERA Verified Real Estate Advisory & Brokerage",
      logoUrl: "",
    },
    hero: {
      eyebrowText: "OFFICIAL REAL ESTATE GAZETTE",
      headline: "Find a home with the paperwork already in order.",
      subheadline:
        "Direct buyer exchange featuring RERA-sanctioned apartments, clear-title agricultural & NA layouts, and verified freehold residences.",
      bannerType: "default_svg",
      customBannerUrl: "",
      coverImageUrl: "",
      coverAspectRatio: "auto",
      coverImageOpacity: 100,
      coverOverlayOpacity: 60,
      trustBadges: [
        { label: "RERA Registered Listings" },
        { label: "Zero Phantom Listings" },
      ],
    },
    contact: {
      address: "Civil Lines, Wardha Road Junction, Nagpur, Maharashtra 440001",
      city: "Nagpur",
      pincode: "440001",
      phone: "+91 (0712) 256-8900",
      alternatePhone: "",
      email: adminUser?.email || "contact@propertyportal.in",
      whatsappNumber: "",
      googleMapsEmbedUrl: "",
      workingHours: "Mon - Sat: 9:30 AM - 7:00 PM",
      latitude: 21.1278,
      longitude: 79.1396,
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
      badgeText: "MahaRERA Approved Partner",
      registrationNumber: "",
      disclaimerText: "",
    },
    footer: {
      aboutText:
        "Official verified customer property exchange. Curating 100% RERA-registered developments, clean-titled freeholds, and verified residential plots with full documentation scrutiny.",
      copyrightText: `© ${new Date().getFullYear()} ${
        adminUser?.agencyName || adminUser?.name || "Real Estate Agency"
      }. All rights reserved.`,
    },
    aboutUs: {
      eyebrowText: "ABOUT OUR AGENCY • VERIFIED ADVISORY",
      headline: "Trusted Real Estate Guidance Built on Legal Clarity.",
      story:
        "We specialize in RERA-verified residential homes, clear-title NA layouts, commercial offices, and strategic investment opportunities. Every property in our portfolio undergoes thorough title and documentation verification before reaching buyers.",
      missionTitle: "Our Mission",
      missionDescription:
        "Deliver transparent, paperwork-first property transactions where buyers and investors make confident decisions backed by verified documentation.",
      visionTitle: "Our Vision",
      visionDescription:
        "Become the region's most trusted real estate advisory desk known for zero hidden charges, verified developers, and lifelong client relationships.",
      bannerImageUrl: "",
      yearsExperience: "10+",
      propertiesSoldCount: "500+",
      happyClientsCount: "1,200+",
      teamSizeCount: "25+",
      highlights: [
        {
          title: "100% RERA & Title Vetted",
          description:
            "Every project and listing is screened for legal clearances, RERA registration, and clean chain of title.",
        },
        {
          title: "End-to-End Registry Support",
          description:
            "Dedicated guidance from site inspection and price negotiation to home loans, stamp duty, and final registration.",
        },
        {
          title: "Direct Owner & Builder Access",
          description:
            "Transparent pricing directly from verified owners and Grade-A developers with zero inflated middleman markups.",
        },
      ],
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
