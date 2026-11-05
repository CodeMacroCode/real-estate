import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProjectDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  projectId: string; // e.g. "PRJ-2026-0001"
  name: string;
  developerName: string;
  projectType: string;
  location: {
    address: string;
    city: string;
    landmark?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  reraNumber?: string;
  constructionStatus: string;
  launchDate?: Date;
  possessionDate?: Date;
  amenities: string[];
  description?: string;
  media: {
    coverImage?: string;
    images: string[];
    videos?: string[];
    brochureUrl?: string;
    masterPlanUrl?: string;
    floorPlans?: Array<{ title: string; imageUrl: string }>;
  };
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  isPublishedOnWebsite: boolean;
  featuredOnWebsite: boolean;
  towers?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    slug: string;
  };
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    developerName: {
      type: String,
      required: true,
      trim: true,
    },
    projectType: {
      type: String,
      default: "Residential",
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      landmark: { type: String },
      pincode: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    reraNumber: { type: String, trim: true },
    constructionStatus: {
      type: String,
      default: "Under Construction",
    },
    launchDate: { type: Date },
    possessionDate: { type: Date },
    amenities: [{ type: String, trim: true }],
    description: { type: String, default: "" },
    media: {
      coverImage: { type: String },
      images: [{ type: String }],
      videos: [{ type: String }],
      brochureUrl: { type: String },
      masterPlanUrl: { type: String },
      floorPlans: [
        {
          title: { type: String, required: true },
          imageUrl: { type: String, required: true },
        },
      ],
    },
    totalUnits: { type: Number, default: 0 },
    availableUnits: { type: Number, default: 0 },
    bookedUnits: { type: Number, default: 0 },
    soldUnits: { type: Number, default: 0 },
    isPublishedOnWebsite: { type: Boolean, default: false, index: true },
    featuredOnWebsite: { type: Boolean, default: false },
    towers: [{ type: String, trim: true }],
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      slug: { type: String, trim: true, lowercase: true },
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

ProjectSchema.index({ adminId: 1, projectId: 1 }, { unique: true });
ProjectSchema.index({
  adminId: 1,
  isPublishedOnWebsite: 1,
  "location.city": 1,
});
ProjectSchema.index({ adminId: 1, "seo.slug": 1 });

export const Project: Model<IProjectDocument> =
  mongoose.models.Project ||
  mongoose.model<IProjectDocument>("Project", ProjectSchema);
