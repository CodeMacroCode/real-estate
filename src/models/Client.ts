import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IClientDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId; // Level 2 Admin / Org Head
  leadId?: Types.ObjectId; // Original Lead reference
  appointmentId?: Types.ObjectId; // Converted Appointment reference
  confirmationId?: Types.ObjectId; // Linked Confirmation reference

  clientName: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;

  totalDealsWon: number;
  totalRevenue?: number;
  lastAgreedDeliveryDate?: Date;
  status: "Active" | "Inactive" | "VIP";

  notes?: string;
  createdById: Types.ObjectId; // Staff member who closed deal
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClientDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    confirmationId: {
      type: Schema.Types.ObjectId,
      ref: "ClientConfirmation",
    },
    clientName: {
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
    address: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    totalDealsWon: {
      type: Number,
      default: 1,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    lastAgreedDeliveryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "VIP"],
      default: "Active",
    },
    notes: {
      type: String,
      default: "",
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

ClientSchema.index({ adminId: 1, phone: 1 });
ClientSchema.index({ adminId: 1, status: 1 });

export const Client: Model<IClientDocument> =
  mongoose.models.Client ||
  mongoose.model<IClientDocument>("Client", ClientSchema);
