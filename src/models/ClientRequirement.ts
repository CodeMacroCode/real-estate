import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IClientRequirementDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  clientId: Types.ObjectId; // Ref: Client
  transactionType: "Buy" | "Rent" | "Lease";
  propertyCategories: (
    | "Residential"
    | "Commercial"
    | "Land"
    | "Special Investment"
  )[];
  propertyTypes: string[]; // Master Option values e.g. ["apartment", "villa"]
  minBudget: number;
  maxBudget: number;
  preferredLocations: string[]; // e.g. ["Whitefield", "Indiranagar"]
  minBedrooms?: number;
  furnishing?:
    | "Unfurnished"
    | "Semi-Furnished"
    | "Fully-Furnished"
    | "Semi Furnished"
    | "Fully Furnished"
    | "Furnished";
  notes?: string;
  isActive: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientRequirementSchema = new Schema<IClientRequirementDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ["Buy", "Rent", "Lease"],
      default: "Buy",
      required: true,
    },
    propertyCategories: [
      {
        type: String,
        enum: ["Residential", "Commercial", "Land", "Special Investment"],
      },
    ],
    propertyTypes: [{ type: String, trim: true }],
    minBudget: { type: Number, default: 0 },
    maxBudget: { type: Number, required: true },
    preferredLocations: [{ type: String, trim: true }],
    minBedrooms: { type: Number },
    furnishing: {
      type: String,
      enum: [
        "Unfurnished",
        "Semi-Furnished",
        "Fully-Furnished",
        "Semi Furnished",
        "Fully Furnished",
        "Furnished",
      ],
    },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
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

ClientRequirementSchema.index({ adminId: 1, clientId: 1 });
ClientRequirementSchema.index({ adminId: 1, transactionType: 1, maxBudget: 1 });

export const ClientRequirement: Model<IClientRequirementDocument> =
  mongoose.models.ClientRequirement ||
  mongoose.model<IClientRequirementDocument>(
    "ClientRequirement",
    ClientRequirementSchema,
  );
