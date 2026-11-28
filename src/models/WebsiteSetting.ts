import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWebsiteSettingDocument extends Document {
  adminId: Types.ObjectId;
  branding: {
    logoUrl?: string;
    companyName?: string;
    tagline?: string;
  };
  hero: {
    eyebrowText?: string;
    headline?: string;
    subheadline?: string;
    bannerType: "default_svg" | "custom_image";
    customBannerUrl?: string;
    coverImageUrl?: string;
    coverAspectRatio?: "auto" | "21:9" | "16:9" | "16:5" | "3:1";
    coverImageOpacity?: number;
    coverOverlayOpacity?: number;
    trustBadges?: Array<{ label: string }>;
  };
  contact: {
    address?: string;
    city?: string;
    pincode?: string;
    phone?: string;
    alternatePhone?: string;
    email?: string;
    whatsappNumber?: string;
    googleMapsEmbedUrl?: string;
    workingHours?: string;
    latitude?: number;
    longitude?: number;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
  };
  theme: {
    primaryColor?: string; // Default #0e3b2e
    deepColor?: string;    // Default #0b2d22
    accentColor?: string;  // Default #b5822c (brass)
    paperColor?: string;   // Default #f6f2ea
  };
  regulatory: {
    badgeText?: string;        // Default "MahaRERA Approved Partner"
    registrationNumber?: string;
    disclaimerText?: string;
  };
  footer: {
    aboutText?: string;
    copyrightText?: string;
    logoUrl?: string;
  };
  aboutUs?: {
    eyebrowText?: string;
    headline?: string;
    story?: string;
    missionTitle?: string;
    missionDescription?: string;
    visionTitle?: string;
    visionDescription?: string;
    bannerImageUrl?: string;
    yearsExperience?: string;
    propertiesSoldCount?: string;
    happyClientsCount?: string;
    teamSizeCount?: string;
    highlights?: Array<{ title: string; description: string }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteSettingSchema = new Schema<IWebsiteSettingDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    branding: {
      logoUrl: { type: String, trim: true, default: "" },
      companyName: { type: String, trim: true, default: "" },
      tagline: { type: String, trim: true, default: "" },
    },
    hero: {
      eyebrowText: { type: String, trim: true, default: "" },
      headline: { type: String, trim: true, default: "" },
      subheadline: { type: String, trim: true, default: "" },
      bannerType: {
        type: String,
        enum: ["default_svg", "custom_image"],
        default: "default_svg",
      },
      customBannerUrl: { type: String, trim: true, default: "" },
      coverImageUrl: { type: String, trim: true, default: "" },
      coverAspectRatio: {
        type: String,
        enum: ["auto", "21:9", "16:9", "16:5", "3:1"],
        default: "auto",
      },
      coverImageOpacity: { type: Number, min: 0, max: 100, default: 100 },
      coverOverlayOpacity: { type: Number, min: 0, max: 100, default: 60 },
      trustBadges: [
        {
          label: { type: String, trim: true },
        },
      ],
    },
    contact: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      alternatePhone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      whatsappNumber: { type: String, trim: true, default: "" },
      googleMapsEmbedUrl: { type: String, trim: true, default: "" },
      workingHours: { type: String, trim: true, default: "" },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    socialLinks: {
      facebook: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
    },
    theme: {
      primaryColor: { type: String, trim: true, default: "#0e3b2e" },
      deepColor: { type: String, trim: true, default: "#0b2d22" },
      accentColor: { type: String, trim: true, default: "#b5822c" },
      paperColor: { type: String, trim: true, default: "#f6f2ea" },
    },
    regulatory: {
      badgeText: { type: String, trim: true, default: "MahaRERA Approved Partner" },
      registrationNumber: { type: String, trim: true, default: "" },
      disclaimerText: { type: String, trim: true, default: "" },
    },
    footer: {
      aboutText: { type: String, trim: true, default: "" },
      copyrightText: { type: String, trim: true, default: "" },
      logoUrl: { type: String, trim: true, default: "" },
    },
    aboutUs: {
      eyebrowText: { type: String, trim: true, default: "" },
      headline: { type: String, trim: true, default: "" },
      story: { type: String, trim: true, default: "" },
      missionTitle: { type: String, trim: true, default: "" },
      missionDescription: { type: String, trim: true, default: "" },
      visionTitle: { type: String, trim: true, default: "" },
      visionDescription: { type: String, trim: true, default: "" },
      bannerImageUrl: { type: String, trim: true, default: "" },
      yearsExperience: { type: String, trim: true, default: "" },
      propertiesSoldCount: { type: String, trim: true, default: "" },
      happyClientsCount: { type: String, trim: true, default: "" },
      teamSizeCount: { type: String, trim: true, default: "" },
      highlights: [
        {
          title: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

if (
  process.env.NODE_ENV !== "production" &&
  mongoose.models &&
  mongoose.models.WebsiteSetting
) {
  delete mongoose.models.WebsiteSetting;
}

export const WebsiteSetting: mongoose.Model<IWebsiteSettingDocument> =
  mongoose.models.WebsiteSetting ||
  mongoose.model<IWebsiteSettingDocument>("WebsiteSetting", WebsiteSettingSchema);

