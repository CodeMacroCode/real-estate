import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'file';

export type ClientFieldMapping =
  | 'client_name'
  | 'client_phone'
  | 'client_email'
  | 'client_address'
  | 'none';

export interface FormField {
  id: string; // e.g. "fld_1", "client_name"
  label: string; // e.g. "Full Name"
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Dropdown choices when type === 'select'
  order: number;
  mapping: ClientFieldMapping;
}

export interface ICustomFormDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  fields: FormField[];
  createdById: Types.ObjectId; // SuperAdmin
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldSchema = new Schema<FormField>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'text',
        'textarea',
        'number',
        'email',
        'phone',
        'date',
        'select',
        'checkbox',
        'file',
      ],
      default: 'text',
      required: true,
    },
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
    mapping: {
      type: String,
      enum: [
        'client_name',
        'client_phone',
        'client_email',
        'client_address',
        'none',
      ],
      default: 'none',
      required: true,
    },
  },
  { _id: false }
);

const CustomFormSchema = new Schema<ICustomFormDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    fields: [FormFieldSchema],
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const CustomForm: Model<ICustomFormDocument> =
  mongoose.models.CustomForm ||
  mongoose.model<ICustomFormDocument>('CustomForm', CustomFormSchema);

// Admin Assignment Schema
export interface IFormAdminAssignmentDocument extends Document {
  _id: Types.ObjectId;
  formId: Types.ObjectId;
  adminId: Types.ObjectId;
  publicSlug: string;
  isActive: boolean;
  assignedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FormAdminAssignmentSchema = new Schema<IFormAdminAssignmentDocument>(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomForm',
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publicSlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

FormAdminAssignmentSchema.index({ adminId: 1, formId: 1 });

export const FormAdminAssignment: Model<IFormAdminAssignmentDocument> =
  mongoose.models.FormAdminAssignment ||
  mongoose.model<IFormAdminAssignmentDocument>(
    'FormAdminAssignment',
    FormAdminAssignmentSchema
  );
