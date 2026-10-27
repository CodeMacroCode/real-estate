import mongoose, { Schema, Document, Model } from 'mongoose';
import { IRole, PERMISSION_ACTIONS, BASELINE_ROLE_SLUGS, CRM_MODULES } from '../types';

export interface IRoleDocument extends Omit<IRole, '_id'>, Document {}

const ModulePermissionSchema = new Schema(
  {
    module: {
      type: String,
      required: true,
      enum: CRM_MODULES,
    },
    actions: {
      type: [String],
      required: true,
      validate: {
        validator: function (actions: string[]) {
          return actions.every((action) => (PERMISSION_ACTIONS as readonly string[]).includes(action));
        },
        message: 'Invalid permission action detected',
      },
      default: [],
    },
    leadVisibilityScope: {
      type: String,
      enum: ['assigned', 'team', 'company'],
      required: false,
    },
  },
  { _id: false }
);

const RoleSchema = new Schema<IRoleDocument>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [100, 'Role name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Role slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Role slug cannot exceed 50 characters'],
    },
    description: {
      type: String,
      required: [true, 'Role description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    leadVisibilityScope: {
      type: String,
      enum: ['assigned', 'team', 'company'],
      default: 'assigned',
      required: true,
    },
    permissions: {
      type: [ModulePermissionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// slug unique constraint defined in schema field


export const Role: Model<IRoleDocument> =
  mongoose.models.Role || mongoose.model<IRoleDocument>('Role', RoleSchema);

export default Role;
