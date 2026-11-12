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
  };

  return JSON.parse(JSON.stringify(defaultObj));
}

export async function upsertWebsiteSettings(
  adminId: string,
  payload: Partial<IWebsiteSettingDocument>,
) {
  await connectToDatabase();
  const updated = await WebsiteSetting.findOneAndUpdate(
    { adminId: new mongoose.Types.ObjectId(adminId) },
    {
      $set: {
        branding: payload.branding,
        hero: payload.hero,
        contact: payload.contact,
        socialLinks: payload.socialLinks,
        theme: payload.theme,
        regulatory: payload.regulatory,
        footer: payload.footer,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return updated;
}
