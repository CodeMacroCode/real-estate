import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type MeetingType = "In-Person" | "Virtual" | "Call";
export type AppointmentStatus =
  | "Scheduled"
  | "Rescheduled"
  | "Cancelled"
  | "Completed";
export type AppointmentOutcome = "YES" | "NO" | "MAYBE";

export interface IAppointmentDocument extends Document {
  _id: Types.ObjectId;
  leadId: Types.ObjectId;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  agenda: string;

  meetingType: MeetingType;
  meetingLocation?: string;
  meetingDate: Date;
  durationMinutes: number;

  status: AppointmentStatus;
  outcome?: AppointmentOutcome;
  confirmationId?: Types.ObjectId;
  meetingSequence?: number;
  previousAppointmentId?: Types.ObjectId;
  nextAppointmentId?: Types.ObjectId;

  // Proposal / Quotation attachment
  quotationTitle?: string;
  quotationAmount?: number;
  quotationUrl?: string;

  // Invoice attachment (strictly for YES outcome)
  invoiceUrl?: string;
  invoiceName?: string;
  invoiceUploadedAt?: Date;

  // Google Calendar Integration
  googleCalendarEventId?: string;
  googleCalendarLink?: string;

  // 3-Tier Hierarchy Scoping
  adminId: Types.ObjectId; // Owning Admin
  assignedSubRoleId: Types.ObjectId; // Sales Executive / Staff hosting the meeting
  createdById: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointmentDocument>(
  {
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
    agenda: {
      type: String,
      required: true,
      trim: true,
    },
    meetingType: {
      type: String,
      enum: ["In-Person", "Virtual", "Call"],
      default: "Virtual",
      required: true,
    },
    meetingLocation: {
      type: String,
      default: "",
    },
    meetingDate: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Rescheduled", "Cancelled", "Completed"],
      default: "Scheduled",
      required: true,
    },
    outcome: {
      type: String,
      enum: ["YES", "NO", "MAYBE"],
    },
    confirmationId: {
      type: Schema.Types.ObjectId,
      ref: "ClientConfirmation",
      default: null,
    },
    meetingSequence: {
      type: Number,
      default: 1,
    },
    previousAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    nextAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    quotationTitle: {
      type: String,
      trim: true,
    },
    quotationAmount: {
      type: Number,
    },
    quotationUrl: {
      type: String,
      trim: true,
    },
    invoiceUrl: {
      type: String,
      trim: true,
    },
    invoiceName: {
      type: String,
      trim: true,
    },
    invoiceUploadedAt: {
      type: Date,
    },
    googleCalendarEventId: {
      type: String,
    },
    googleCalendarLink: {
      type: String,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedSubRoleId: {
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

AppointmentSchema.index({ adminId: 1, meetingDate: 1 });
AppointmentSchema.index({ assignedSubRoleId: 1, meetingDate: 1 });

export const Appointment: Model<IAppointmentDocument> =
  mongoose.models.Appointment ||
  mongoose.model<IAppointmentDocument>("Appointment", AppointmentSchema);
