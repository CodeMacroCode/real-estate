import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  setSessionCookie,
  clearSessionCookie,
  extractTokenFromRequest,
  SESSION_COOKIE_NAME,
} from '../../src/lib/auth/session';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { Role } from '../../src/models/Role';
import { listRoles, getRoleById, updateRole } from '../../src/services/roleService';
import { seedRoles } from '../../scripts/seed-roles';

describe('Session Utilities and Role Service', () => {
  describe('Session Cookies and Extraction', () => {
    it('sets session cookie with httpOnly and 8 hour expiration', () => {
      const response = NextResponse.json({ success: true });
      setSessionCookie(response, 'sample-jwt-token-xyz');

      const cookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('sample-jwt-token-xyz');
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.maxAge).toBe(28800); // 8 hours
    });

    it('clears session cookie by setting maxAge to 0', () => {
      const response = NextResponse.json({ success: true });
      clearSessionCookie(response);

      const cookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('');
      expect(cookie?.maxAge).toBe(0);
    });

    it('extracts token from cookie', () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=token-from-cookie`,
        },
      });

      expect(extractTokenFromRequest(req)).toBe('token-from-cookie');
    });

    it('extracts token from Authorization header if cookie is absent', () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        headers: {
          authorization: 'Bearer token-from-header',
        },
      });

      expect(extractTokenFromRequest(req)).toBe('token-from-header');
    });

    it('returns null if neither cookie nor auth header is present', () => {
      const req = new NextRequest('http://localhost:3000/api/users');
      expect(extractTokenFromRequest(req)).toBeNull();
    });
  });

  describe('Role Service Integration', () => {
    const actor = {
      userId: '66f500000000000000000001',
      employeeId: 'EMP001',
      name: 'Super Admin',
      email: 'admin@crm.com',
      roleSlug: 'super_admin',
    };

    beforeAll(async () => {
      await connectToDatabase();
      await seedRoles();
    });

    afterAll(async () => {
      await disconnectFromDatabase();
    });

    it('lists all baseline roles', async () => {
      const roles = await listRoles();
      expect(roles.length).toBe(7);
    });

    it('retrieves role by ID', async () => {
      const roles = await listRoles();
      const first = roles[0];
      const retrieved = await getRoleById(first._id.toString());
      expect(retrieved).not.toBeNull();
      expect(retrieved?.slug).toBe(first.slug);
    });

    it('prevents stripping all permissions from Super Admin role', async () => {
      const superAdmin = await Role.findOne({ slug: 'super_admin' });
      expect(superAdmin).not.toBeNull();

      await expect(
        updateRole(
          superAdmin!._id.toString(),
          { permissions: [] },
          actor
        )
      ).rejects.toThrow('Cannot strip all permissions from Super Admin role');
    });

    it('prevents changing Super Admin visibility scope away from company', async () => {
      const superAdmin = await Role.findOne({ slug: 'super_admin' });
      expect(superAdmin).not.toBeNull();

      await expect(
        updateRole(
          superAdmin!._id.toString(),
          { leadVisibilityScope: 'assigned' },
          actor
        )
      ).rejects.toThrow('Super Admin visibility scope must remain company-wide');
    });
  });
});
