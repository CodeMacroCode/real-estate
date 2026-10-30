import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAdminSocialSettingsDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId; // Owning Admin

  meta: {
    pageAccessToken?: string;
    adAccountId?: string;
    leadGenFormIds?: string[];
    appSecret?: string;
    isActive: boolean;
  };

  linkedIn: {
    clientId?: string;
    clientSecret?: string;
    sponsoredFormId?: string;
    isActive: boolean;
  };

  googleAds: {
    webhookSecretKey?: string;
    customerId?: string;
    isActive: boolean;
  };

  googleCalendar: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: Date;
    connectedEmail?: string;
    isConnected: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const AdminSocialSettingsSchema = new Schema<IAdminSocialSettingsDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    meta: {
      pageAccessToken: { type: String, select: false },
      adAccountId: { type: String },
      leadGenFormIds: [{ type: String }],
      appSecret: { type: String, select: false },
      isActive: { type: Boolean, default: false },
    },
    linkedIn: {
      clientId: { type: String },
      clientSecret: { type: String, select: false },
      sponsoredFormId: { type: String },
      isActive: { type: Boolean, default: false },
    },
    googleAds: {
      webhookSecretKey: { type: String, select: false },
      customerId: { type: String },
      isActive: { type: Boolean, default: false },
    },
    googleCalendar: {
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      expiryDate: { type: Date },
      connectedEmail: { type: String },
      isConnected: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const AdminSocialSettings: Model<IAdminSocialSettingsDocument> =
  mongoose.models.AdminSocialSettings ||
  mongoose.model<IAdminSocialSettingsDocument>(
    "AdminSocialSettings",
    AdminSocialSettingsSchema,
  );
