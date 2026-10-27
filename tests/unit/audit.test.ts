import { describe, it, expect } from 'vitest';
import { sanitizeAuditData } from '../../src/services/auditService';

describe('H. Audit Logging Logic & Data Sanitization (Section 58)', () => {
  it('CRITICAL: should strip passwords, hashes, tokens, and secrets from audit payloads', () => {
    const rawPayload = {
      name: 'Alice Agent',
      email: 'alice@company.com',
      password: 'PlainPassword123!',
      passwordHash: '$2b$12$eX4mpleH4shV4lu3Th4tShouldN0tB3L0gged',
      authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      secretKey: 'top-secret-signing-key',
      department: 'Sales',
      nestedSecurity: {
        api_token: 'secret-token-abc',
        role: 'sales_executive',
      },
    };

    const sanitized = sanitizeAuditData(rawPayload);

    expect(sanitized).toBeDefined();
    expect(sanitized?.name).toBe('Alice Agent');
    expect(sanitized?.email).toBe('alice@company.com');
    expect(sanitized?.department).toBe('Sales');

    // Sensitive keys redacted
    expect(sanitized?.password).toBe('[REDACTED]');
    expect(sanitized?.passwordHash).toBe('[REDACTED]');
    expect(sanitized?.authToken).toBe('[REDACTED]');
    expect(sanitized?.secretKey).toBe('[REDACTED]');
    expect(sanitized?.nestedSecurity?.api_token).toBe('[REDACTED]');
    expect(sanitized?.nestedSecurity?.role).toBe('sales_executive');
  });

  it('should handle null or non-object payloads gracefully', () => {
    expect(sanitizeAuditData(null)).toBeNull();
    expect(sanitizeAuditData(undefined)).toBeNull();
    expect(sanitizeAuditData('string' as any)).toBeNull();
  });
});
