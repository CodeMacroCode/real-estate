import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ProjectUnitStatus =
  | "Available"
  | "Hold"
  | "Booked"
  | "Sold"
  | "Cancelled"
  | "Blocked";

export interface IProjectUnitDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  projectId: Types.ObjectId; // Ref: Project
  towerName: string; // Tower / Block / Building
  floorNumber: number;
  unitNumber: string; // e.g. "A-502"
  unitType: string; // "1BHK", "2BHK", "3BHK", "Penthouse", "Shop", "Office"
  carpetArea: number;
  builtUpArea?: number;
  balconyArea?: number;
  facing?: string;
  price: number;
  parkingSlots?: number;
  status: ProjectUnitStatus;
  bookedByClientId?: Types.ObjectId; // Ref: Client
  bookingDate?: Date;
  notes?: string;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectUnitSchema = new Schema<IProjectUnitDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    towerName: {
      type: String,
      required: true,
      trim: true,
    },
    floorNumber: {
      type: Number,
      required: true,
    },
    unitNumber: {
      type: String,
      required: true,
      trim: true,
    },
    unitType: {
      type: String,
      required: true,
      trim: true,
    },
    carpetArea: {
      type: Number,
      required: true,
    },
    builtUpArea: {
      type: Number,
    },
    balconyArea: {
      type: Number,
    },
    facing: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    parkingSlots: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Available", "Hold", "Booked", "Sold", "Cancelled", "Blocked"],
      default: "Available",
      index: true,
    },
    bookedByClientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
    },
    bookingDate: {
      type: Date,
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

// Unique unit within a project tower
ProjectUnitSchema.index(
  { projectId: 1, towerName: 1, unitNumber: 1 },
  { unique: true },
);
ProjectUnitSchema.index({ adminId: 1, status: 1 });

export const ProjectUnit: Model<IProjectUnitDocument> =
  mongoose.models.ProjectUnit ||
  mongoose.model<IProjectUnitDocument>("ProjectUnit", ProjectUnitSchema);
