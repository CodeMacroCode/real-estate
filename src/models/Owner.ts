import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IOwnerDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId; // Multi-tenant org isolation
  ownerId: string; // e.g. "OWN-2026-0001"
  name: string;
  mobile: string;
  whatsApp?: string;
  email?: string;
  address?: string;
  company?: string;
  panGstNumber?: string;
  ownershipType: "Individual" | "Joint" | "Corporate" | "NRI";
  preferredContactMethod: "Call" | "WhatsApp" | "Email";
  notes?: string;
  documents: Array<{
    title: string;
    fileUrl: string;
    documentType: "PAN" | "Aadhar" | "TitleDeed" | "Agreement" | "Other";
    uploadedAt: Date;
  }>;
  totalPropertiesOwned: number;
  assignedStaffId?: Types.ObjectId;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerSchema = new Schema<IOwnerDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    whatsApp: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    panGstNumber: {
      type: String,
      trim: true,
    },
    ownershipType: {
      type: String,
      enum: ["Individual", "Joint", "Corporate", "NRI"],
      default: "Individual",
    },
    preferredContactMethod: {
      type: String,
      enum: ["Call", "WhatsApp", "Email"],
      default: "Call",
    },
    notes: {
      type: String,
      default: "",
    },
    documents: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        documentType: {
          type: String,
          enum: ["PAN", "Aadhar", "TitleDeed", "Agreement", "Other"],
          default: "Other",
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    totalPropertiesOwned: {
      type: Number,
      default: 0,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

// Indexes
OwnerSchema.index({ adminId: 1, ownerId: 1 }, { unique: true });
OwnerSchema.index({ adminId: 1, mobile: 1 });
OwnerSchema.index({ adminId: 1, email: 1 });

export const Owner: Model<IOwnerDocument> =
  mongoose.models.Owner || mongoose.model<IOwnerDocument>("Owner", OwnerSchema);
