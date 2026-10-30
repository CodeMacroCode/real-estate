import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGoogleAdsConfig extends Document {
  adminId: Types.ObjectId;             // Level 2 Admin
  webhookKey: string;                  // Secret alphanumeric key for webhook verification
  customerId?: string;                 // 10-digit Google Ads Customer ID
  isConnected: boolean;
  leadsIngestedCount: number;
  lastLeadReceivedAt?: Date;
}

const googleAdsConfigSchema = new Schema<IGoogleAdsConfig>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    webhookKey: { type: String, required: true, index: true },
    customerId: { type: String },
    isConnected: { type: Boolean, default: true },
    leadsIngestedCount: { type: Number, default: 0 },
    lastLeadReceivedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.GoogleAdsConfig ||
  mongoose.model<IGoogleAdsConfig>("GoogleAdsConfig", googleAdsConfigSchema);

