import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStoredFileDocument extends Document {
  _id: Types.ObjectId;
  fileName: string;
  mimeType: string;
  data: string; // Base64 encoded data or data URI
  size: number;
  uploadedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFileDocument>(
  {
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    data: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

StoredFileSchema.index({ createdAt: -1 });

export const StoredFile: Model<IStoredFileDocument> =
  mongoose.models.StoredFile ||
  mongoose.model<IStoredFileDocument>("StoredFile", StoredFileSchema);
