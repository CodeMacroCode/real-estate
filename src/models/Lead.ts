import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type LeadSource =
  | "Meta"
  | "LinkedIn"
  | "GoogleAds"
  | "DynamicForm"
  | "Manual";
export type LeadStatus =
  | "Pending"
  | "Assigned"
  | "In-Progress"
  | "Completed"
  | "Rejected";

export interface ILeadDocument extends Document {
  _id: Types.ObjectId;
  leadTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;

  source: LeadSource;
  campaignName?: string;
  adId?: string;
  rawSubmissionData?: Record<string, any>;

  status: LeadStatus;

  // 3-Tier Hierarchy Scoping
  adminId: Types.ObjectId; // Owning Admin (Org / Branch Head)
  assignedSubRoleId?: Types.ObjectId; // Assigned Sub-Role staff (e.g. Sales Executive)
  assignedSubRoleName?: string;

  // Appointment Linkage
  appointmentScheduled?: boolean;
  appointmentId?: Types.ObjectId;
  clientId?: Types.ObjectId;

  notes?: string;
  budget?: number;
  preferredProperty?: string;

  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    leadTitle: {
      type: String,
      required: true,
      trim: true,
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
    clientAddress: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["Meta", "LinkedIn", "GoogleAds", "DynamicForm", "Manual"],
      default: "Manual",
      required: true,
    },
    campaignName: {
      type: String,
      trim: true,
    },
    adId: {
      type: String,
      trim: true,
    },
    rawSubmissionData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["Pending", "Assigned", "In-Progress", "Completed", "Rejected"],
      default: "Pending",
      required: true,
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
      default: null,
      index: true,
    },
    assignedSubRoleName: {
      type: String,
      trim: true,
    },
    appointmentScheduled: {
      type: Boolean,
      default: false,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    budget: {
      type: Number,
    },
    preferredProperty: {
      type: String,
      trim: true,
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

LeadSchema.index({ adminId: 1, status: 1 });
LeadSchema.index({ assignedSubRoleId: 1, status: 1 });
LeadSchema.index({ clientPhone: 1, adminId: 1 });

export const Lead: Model<ILeadDocument> =
  mongoose.models.Lead || mongoose.model<ILeadDocument>("Lead", LeadSchema);
