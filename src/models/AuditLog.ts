import mongoose, { Schema, Document, Model } from 'mongoose';
import { IAuditLog } from '../types';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditActorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    employeeId: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    roleSlug: {
      type: String,
      required: true,
    },
    parentAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actor: {
      type: AuditActorSchema,
      required: true,
    },
    parentAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'publish',
        'unpublish',
        'assign',
        'status_change',
        'login',
        'logout',
        'export',
        'import',
      ],
    },
    entity: {
      type: String,
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity identifier is required'],
      index: true,
    },
    oldValues: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['web_app', 'api', 'cli_bootstrap', 'system'],
      default: 'web_app',
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: false, // Explicit timestamp field used
  }
);

// Compound and single-field indexes for audit queries
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ 'actor.userId': 1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

export default AuditLog;
