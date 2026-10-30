import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ConfirmationOutcome = "YES" | "NO" | "MAYBE";

export interface IClientConfirmationDocument extends Document {
  _id: Types.ObjectId;
  appointmentId: Types.ObjectId;
  leadId: Types.ObjectId;

  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  deliveryOrSiteAddress?: string;

  clientConfirmation: ConfirmationOutcome;
  clientFeedback?: string;

  // Deal Won (YES): Final agreement / delivery date
  agreedDeliveryDate?: Date;

  // Decision Pending (MAYBE): Follow-up
  followUpDate?: Date;
  followUpGoogleCalendarEventId?: string;

  // Deal Lost (NO): Rejection reason
  rejectionReason?: string;

  // Commercials
  quotationAmount?: number;
  quotationNumber?: string;
  invoiceUrl?: string;

  // 3-Tier Hierarchy Scoping
  adminId: Types.ObjectId;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientConfirmationSchema = new Schema<IClientConfirmationDocument>(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    clientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    deliveryOrSiteAddress: {
      type: String,
      trim: true,
    },
    clientConfirmation: {
      type: String,
      enum: ["YES", "NO", "MAYBE"],
      required: true,
    },
    clientFeedback: {
      type: String,
      default: "",
    },
    agreedDeliveryDate: {
      type: Date,
    },
    followUpDate: {
      type: Date,
    },
    followUpGoogleCalendarEventId: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    quotationAmount: {
      type: Number,
    },
    quotationNumber: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

ClientConfirmationSchema.index({ adminId: 1, clientConfirmation: 1 });

export const ClientConfirmation: Model<IClientConfirmationDocument> =
  mongoose.models.ClientConfirmation ||
  mongoose.model<IClientConfirmationDocument>(
    "ClientConfirmation",
    ClientConfirmationSchema,
  );
