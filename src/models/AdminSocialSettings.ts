import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAdminSocialSettingsDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId; // Owning Admin

  meta: {
    pageAccessToken?: string;
    pageId?: string;
    pageName?: string;
    adAccountId?: string;
    leadGenFormIds?: string[];
    appSecret?: string;
    isActive: boolean;
  };

  linkedIn: {
    clientId?: string;
    clientSecret?: string;
    adAccountId?: string;
    formId?: string;
    sponsoredFormId?: string;
    isActive: boolean;
  };

  googleAds: {
    webhookSecretKey?: string;
    customerId?: string;
    isActive: boolean;
  };

  googleCalendar: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: Date;
    connectedEmail?: string;
    calendarEmail?: string;
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
      pageId: { type: String },
      pageName: { type: String },
      adAccountId: { type: String },
      leadGenFormIds: [{ type: String }],
      appSecret: { type: String, select: false },
      isActive: { type: Boolean, default: false },
    },
    linkedIn: {
      clientId: { type: String },
      clientSecret: { type: String, select: false },
      adAccountId: { type: String },
      formId: { type: String },
      sponsoredFormId: { type: String },
      isActive: { type: Boolean, default: false },
    },
    googleAds: {
      webhookSecretKey: { type: String, select: false },
      customerId: { type: String },
      isActive: { type: Boolean, default: false },
    },
    googleCalendar: {
      clientId: { type: String },
      clientSecret: { type: String, select: false },
      accessToken: { type: String, select: false },
      refreshToken: { type: String, select: false },
      expiryDate: { type: Date },
      connectedEmail: { type: String },
      calendarEmail: { type: String },
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
