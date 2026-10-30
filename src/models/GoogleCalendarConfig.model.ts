import mongoose, { Document, Schema, Types } from "mongoose";

export interface IGoogleCalendarConfig extends Document {
  adminId: Types.ObjectId;             // Level 2 Admin
  accountEmail?: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiryDate?: number;
  scope?: string;
  isConnected: boolean;
  connectedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const googleCalendarConfigSchema = new Schema<IGoogleCalendarConfig>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountEmail: { type: String, default: "" },
    clientId: { type: String, required: true },
    clientSecret: { type: String, required: true },
    accessToken: { type: String, default: "" },
    refreshToken: { type: String, default: "" },
    tokenExpiryDate: { type: Number, default: 0 },
    scope: { type: String, default: "" },
    isConnected: { type: Boolean, default: false },
    connectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.GoogleCalendarConfig ||
  mongoose.model<IGoogleCalendarConfig>("GoogleCalendarConfig", googleCalendarConfigSchema);

