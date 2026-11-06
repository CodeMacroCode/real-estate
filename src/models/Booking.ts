import mongoose, { Document, Model, Schema, Types } from "mongoose";
import "./Client";
import "./Project";
import "./ProjectUnit";
import "./Property";
import "./User";

export type BookingStatus = "Hold" | "Booked" | "Sold" | "Cancelled";

export interface IBookingDocumentFile {
  title: string;
  fileUrl: string;
  fileType?: string;
  uploadedAt: Date;
}

export interface IBookingPaymentEntry {
  _id?: Types.ObjectId;
  paymentType: "Token" | "Part Payment" | "Full Payment" | "Registration" | "Other";
  amount: number;
  paymentMode: "Cheque" | "NEFT/RTGS" | "UPI" | "Cash" | "Card" | "Demand Draft";
  referenceNumber?: string;
  receiptNumber?: string;
  paymentDate: Date;
  notes?: string;
}

export interface IBookingDocument extends Document {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  bookingNumber: string; // e.g. "BKG-2026-0001"
  clientId: Types.ObjectId; // Ref: Client

  // Inventory association: Either Project Unit OR Standalone Property
  itemType: "ProjectUnit" | "Property";
  projectId?: Types.ObjectId; // Ref: Project
  projectUnitId?: Types.ObjectId; // Ref: ProjectUnit
  propertyId?: Types.ObjectId; // Ref: Property

  // Quick snapshot details for quick rendering
  inventoryLabel: string; // e.g. "Crescent Park - Tower A - Flat 1602" or "Green Villa 4BHK"
  bookingStatus: BookingStatus;

  // Financials & Commercials
  agreementValue: number;
  totalPaid: number;
  balanceAmount: number;
  payments: IBookingPaymentEntry[];

  // Document Locker / Image & PDF Records
  documents: IBookingDocumentFile[];

  // Loan & Bank Financing Details
  loanDetails?: {
    isLoanRequired: boolean;
    bankName?: string;
    sanctionedAmount?: number;
    disbursedAmount?: number;
    loanAccountNumber?: string;
    loanStatus?: "Not Applied" | "Applied" | "In Process" | "Sanctioned" | "Disbursed" | "Rejected";
  };

  notes?: string;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingDocumentFileSchema = new Schema<IBookingDocumentFile>(
  {
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BookingPaymentEntrySchema = new Schema<IBookingPaymentEntry>(
  {
    paymentType: {
      type: String,
      enum: ["Token", "Part Payment", "Full Payment", "Registration", "Other"],
      default: "Token",
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ["Cheque", "NEFT/RTGS", "UPI", "Cash", "Card", "Demand Draft"],
      default: "NEFT/RTGS",
    },
    referenceNumber: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const BookingSchema = new Schema<IBookingDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["ProjectUnit", "Property"],
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    projectUnitId: {
      type: Schema.Types.ObjectId,
      ref: "ProjectUnit",
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },
    inventoryLabel: {
      type: String,
      required: true,
      trim: true,
    },
    bookingStatus: {
      type: String,
      enum: ["Hold", "Booked", "Sold", "Cancelled"],
      default: "Booked",
      index: true,
    },
    agreementValue: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    payments: [BookingPaymentEntrySchema],
    documents: [BookingDocumentFileSchema],
    loanDetails: {
      isLoanRequired: { type: Boolean, default: false },
      bankName: { type: String, trim: true },
      sanctionedAmount: { type: Number, default: 0 },
      disbursedAmount: { type: Number, default: 0 },
      loanAccountNumber: { type: String, trim: true },
      loanStatus: {
        type: String,
        enum: ["Not Applied", "Applied", "In Process", "Sanctioned", "Disbursed", "Rejected"],
        default: "Not Applied",
      },
    },
    notes: { type: String, trim: true },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-recalculate balance amount before saving
BookingSchema.pre("save", function (next) {
  const sumPaid = (this.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
  this.totalPaid = sumPaid;
  this.balanceAmount = Math.max(0, (this.agreementValue || 0) - sumPaid);
  next();
});

export const Booking: Model<IBookingDocument> =
  mongoose.models.Booking || mongoose.model<IBookingDocument>("Booking", BookingSchema);

