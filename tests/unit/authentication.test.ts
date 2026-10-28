import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/auth/password';
import { signAuthToken, verifyAuthToken, getAuthSecret, isAuthSecretConfigured } from '../../src/lib/auth/jwt';
import { AuthTokenPayload } from '../../src/types';

describe('E. Authentication and Security Cryptography', () => {
  describe('Password Hashing & Verification (bcrypt)', () => {
    const rawPassword = 'SuperSecretPassword@2025';

    it('should hash passwords into a bcrypt format ($2a$ or $2b$)', async () => {
      const hash = await hashPassword(rawPassword);
      expect(hash).toMatch(/^\$2[ab]\$\d+\$/);
      expect(hash).not.toBe(rawPassword);
    });

    it('should produce distinct hashes for identical passwords due to unique salting', async () => {
      const hash1 = await hashPassword(rawPassword);
      const hash2 = await hashPassword(rawPassword);
      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password successfully against the hash', async () => {
      const hash = await hashPassword(rawPassword);
      const isMatch = await verifyPassword(rawPassword, hash);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(rawPassword);
      const isMatch = await verifyPassword('WrongPassword123!', hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Session Tokens (jose)', () => {
    const mockPayload: AuthTokenPayload = {
      userId: '66f500000000000000000001',
      employeeId: 'EMP001',
      email: 'admin@realestate.com',
      name: 'System Admin',
      roleSlug: 'super_admin',
      roleId: '66f500000000000000000002',
      department: 'Management',
      branch: 'Headquarters',
      team: 'Executive',
    };

    it('should sign and successfully verify a JWT token with full payload', async () => {
      const token = await signAuthToken(mockPayload, '2h');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verified = await verifyAuthToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(mockPayload.userId);
      expect(verified?.email).toBe(mockPayload.email);
      expect(verified?.roleSlug).toBe(mockPayload.roleSlug);
    });

    it('should reject tampered or corrupted JWT tokens', async () => {
      const token = await signAuthToken(mockPayload, '2h');
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}X.${parts[2]}`;

      const verified = await verifyAuthToken(tampered);
      expect(verified).toBeNull();
    });

    it('should reject expired tokens', async () => {
      // 0 seconds expiration
      const token = await signAuthToken(mockPayload, '0s');
      // small delay to ensure expired
      await new Promise((r) => setTimeout(r, 50));

      const verified = await verifyAuthToken(token);
      expect(verified).toBeNull();
    });

    it('CRITICAL: should fail safely when AUTH_SECRET is missing or too short without hardcoded fallback', async () => {
      const originalSecret = process.env.AUTH_SECRET;
      try {
        // Missing AUTH_SECRET
        delete process.env.AUTH_SECRET;
        expect(isAuthSecretConfigured()).toBe(false);
        expect(() => getAuthSecret()).toThrow(/AUTH_SECRET environment variable is missing/);
        await expect(signAuthToken(mockPayload)).rejects.toThrow(/AUTH_SECRET environment variable is missing/);
        const verifiedWhenMissing = await verifyAuthToken('some.dummy.jwt');
        expect(verifiedWhenMissing).toBeNull();

        // Insecure / too short AUTH_SECRET (< 32 characters)
        process.env.AUTH_SECRET = 'short-secret';
        expect(isAuthSecretConfigured()).toBe(false);
        expect(() => getAuthSecret()).toThrow(/minimum 32 characters required/);
        await expect(signAuthToken(mockPayload)).rejects.toThrow(/minimum 32 characters required/);
        const verifiedWhenShort = await verifyAuthToken('some.dummy.jwt');
        expect(verifiedWhenShort).toBeNull();
      } finally {
        process.env.AUTH_SECRET = originalSecret;
      }
    });
  });
});
