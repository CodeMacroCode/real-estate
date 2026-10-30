import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMetaConnection extends Document {
  adminId: Types.ObjectId;             // Level 2 Admin
  pageId: string;
  pageName: string;
  pageToken: string;                   // Long-lived Page Access Token
  adAccountId?: string;
  formIds: string[];                   // Instant Form IDs
  isConnected: boolean;
  connectedAt: Date;
  leadsIngestedCount: number;
}

const metaConnectionSchema = new Schema<IMetaConnection>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    pageId: { type: String, required: true },
    pageName: { type: String, default: "" },
    pageToken: { type: String, required: true },
    adAccountId: { type: String },
    formIds: [{ type: String }],
    isConnected: { type: Boolean, default: false },
    connectedAt: { type: Date, default: Date.now },
    leadsIngestedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.MetaConnection ||
  mongoose.model<IMetaConnection>("MetaConnection", metaConnectionSchema);

