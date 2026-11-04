import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type PublicInquiryType =
  | "General"
  | "Property"
  | "Project"
  | "Schedule_Visit"
  | "Callback"
  | "Requirement";

export interface IPublicInquiryDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId; // Organization receiver
  inquiryType: PublicInquiryType;
  propertyId?: Types.ObjectId; // Ref: Property
  projectId?: Types.ObjectId; // Ref: Project
  name: string;
  phone: string;
  email?: string;
  whatsApp?: string;
  preferredDateTime?: Date;
  message?: string;
  status: "Pending" | "Converted_To_Lead" | "Appended_To_Existing_Lead";
  crmLeadId?: Types.ObjectId; // Linked Lead in CRM
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PublicInquirySchema = new Schema<IPublicInquiryDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inquiryType: {
      type: String,
      enum: [
        "General",
        "Property",
        "Project",
        "Schedule_Visit",
        "Callback",
        "Requirement",
      ],
      default: "General",
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    whatsApp: {
      type: String,
      trim: true,
    },
    preferredDateTime: {
      type: Date,
    },
    message: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Converted_To_Lead", "Appended_To_Existing_Lead"],
      default: "Pending",
      index: true,
    },
    crmLeadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
    syncError: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

PublicInquirySchema.index({ adminId: 1, phone: 1, createdAt: -1 });

export const PublicInquiry: Model<IPublicInquiryDocument> =
  mongoose.models.PublicInquiry ||
  mongoose.model<IPublicInquiryDocument>("PublicInquiry", PublicInquirySchema);
