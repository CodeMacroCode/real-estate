import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { AuditLog } from '../../src/models/AuditLog';
import { recordAuditEvent, getAuditLogs } from '../../src/services/auditService';

describe('Integration: Audit Trail Database Persistence & Querying', () => {
  beforeAll(async () => {
    await connectToDatabase();
    await AuditLog.deleteMany({ 'actor.email': 'auditor@integration-test.com' });
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ 'actor.email': 'auditor@integration-test.com' });
    await disconnectFromDatabase();
  });

  it('should persist audit records in MongoDB and redact sensitive information', async () => {
    const actor = {
      userId: '66f500000000000000000077',
      employeeId: 'AUD001',
      name: 'Auditor Test',
      email: 'auditor@integration-test.com',
      roleSlug: 'super_admin',
    };

    const entry = await recordAuditEvent({
      actor,
      action: 'create',
      entity: 'user',
      entityId: 'user-id-999',
      oldValues: null,
      newValues: {
        name: 'New Employee',
        email: 'employee@test.com',
        password: 'PlainTextSecretShouldBeRedacted',
        passwordHash: '$2b$12$someSecretHash',
      },
      source: 'api',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest-Agent/1.0',
    });

    expect(entry._id).toBeDefined();

    // Query back from MongoDB using getAuditLogs
    const result = await getAuditLogs({
      entity: 'user',
      entityId: 'user-id-999',
      action: 'create',
    });

    expect(result.logs.length).toBeGreaterThanOrEqual(1);
    const retrieved: any = result.logs.find((l: any) => l.entityId === 'user-id-999');
    expect(retrieved).toBeDefined();
    if (!retrieved) throw new Error('Retrieved log not found');
    expect(retrieved.actor.name).toBe('Auditor Test');
    expect(retrieved.action).toBe('create');
    expect(retrieved.newValues.password).toBe('[REDACTED]');
    expect(retrieved.newValues.passwordHash).toBe('[REDACTED]');
    expect(retrieved.newValues.name).toBe('New Employee');
    expect(retrieved.source).toBe('api');
  });
});
