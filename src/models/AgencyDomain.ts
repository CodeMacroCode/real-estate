import mongoose, { Document, Model, Schema, Types } from "mongoose";
import "./User";

export interface IAgencyDomainDocument extends Document {
  _id: Types.ObjectId;
  agencyId: Types.ObjectId;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyDomainSchema = new Schema<IAgencyDomainDocument>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Agency ID is required"],
      index: true,
    },
    hostname: {
      type: String,
      required: [true, "Hostname is required"],
      lowercase: true,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
AgencyDomainSchema.index({ hostname: 1 }, { unique: true });
AgencyDomainSchema.index(
  { agencyId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true },
  },
);

if (
  process.env.NODE_ENV !== "production" &&
  mongoose.models &&
  mongoose.models.AgencyDomain
) {
  delete mongoose.models.AgencyDomain;
}

export const AgencyDomain: Model<IAgencyDomainDocument> =
  (mongoose.models.AgencyDomain as Model<IAgencyDomainDocument>) ||
  mongoose.model<IAgencyDomainDocument>("AgencyDomain", AgencyDomainSchema);

export default AgencyDomain;
