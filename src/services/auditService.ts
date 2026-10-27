import { connectToDatabase } from '../lib/mongodb/db';
import { AuditLog, IAuditLogDocument } from '../models/AuditLog';
import { AuditAction, IAuditLog } from '../types';

export interface RecordAuditParams {
  actor: {
    userId?: string;
    employeeId?: string;
    name: string;
    email: string;
    roleSlug: string;
  };
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  source?: 'web_app' | 'api' | 'cli_bootstrap' | 'system';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Strips sensitive keys such as passwords, hashes, and session tokens
 * before committing audit data to persistent storage.
 */
export function sanitizeAuditData(data: Record<string, any> | null | undefined): Record<string, any> | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'auth_secret',
    'authToken',
    'refreshToken',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function recordAuditEvent(params: RecordAuditParams): Promise<IAuditLogDocument> {
  await connectToDatabase();

  const auditEntry = new AuditLog({
    actor: {
      userId: params.actor.userId,
      employeeId: params.actor.employeeId || '',
      name: params.actor.name,
      email: params.actor.email,
      roleSlug: params.actor.roleSlug,
    },
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    oldValues: sanitizeAuditData(params.oldValues),
    newValues: sanitizeAuditData(params.newValues),
    timestamp: new Date(),
    source: params.source || 'web_app',
    ipAddress: params.ipAddress || '',
    userAgent: params.userAgent || '',
  });

  return auditEntry.save();
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  entity?: string;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getAuditLogs(options: AuditQueryOptions = {}) {
  await connectToDatabase();

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (options.entity) {
    query.entity = options.entity;
  }
  if (options.entityId) {
    query.entityId = options.entityId;
  }
  if (options.action) {
    query.action = options.action;
  }
  if (options.userId) {
    query['actor.userId'] = options.userId;
  }
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = options.startDate;
    }
    if (options.endDate) {
      query.timestamp.$lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
