import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type MasterCategory =
  | "property_types"
  | "transaction_types"
  | "property_statuses"
  | "lead_sources"
  | "lead_statuses"
  | "locations"
  | "amenities"
  | "furnishing_options";

export interface IMasterOptionDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId | null; // null = Global default; ObjectId = Tenant override
  category: MasterCategory;
  label: string;
  value: string;
  metadata?: {
    isUnpublishTrigger?: boolean; // If true for a status, triggers auto-unpublish on website
    city?: string; // For locality: parent city
    icon?: string;
    color?: string;
  };
  displayOrder: number;
  isSystemDefault: boolean;
  isActive: boolean;
  createdById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MasterOptionSchema = new Schema<IMasterOptionDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "property_types",
        "transaction_types",
        "property_statuses",
        "lead_sources",
        "lead_statuses",
        "locations",
        "amenities",
        "furnishing_options",
      ],
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    metadata: {
      isUnpublishTrigger: { type: Boolean, default: false },
      city: { type: String, trim: true },
      icon: { type: String, trim: true },
      color: { type: String, trim: true },
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for uniqueness within tenant scope
MasterOptionSchema.index(
  { adminId: 1, category: 1, value: 1 },
  { unique: true },
);
MasterOptionSchema.index({ category: 1, isActive: 1, displayOrder: 1 });

export const MasterOption: Model<IMasterOptionDocument> =
  mongoose.models.MasterOption ||
  mongoose.model<IMasterOptionDocument>("MasterOption", MasterOptionSchema);
