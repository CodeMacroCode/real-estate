import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { hashPassword } from '../../src/lib/auth/password';
import { seedRoles } from '../../scripts/seed-roles';
import { POST as loginHandler } from '../../src/app/api/auth/login/route';
import { SESSION_COOKIE_NAME } from '../../src/lib/auth/constants';
import { clearAllRateLimits } from '../../src/lib/auth/rateLimit';

describe('Integration: Authentication Logic & Inactive Account Enforcement', () => {
  let activeUserId: string;
  let inactiveUserId: string;

  beforeAll(async () => {
    await connectToDatabase();
    await seedRoles();
    const role = await Role.findOne({ slug: 'sales_executive' });

    // Clean up previous test users
    await User.deleteMany({ email: { $in: ['active@auth-test.com', 'inactive@auth-test.com', 'ratelimit@auth-test.com'] } });

    const passwordHash = await hashPassword('ValidPassword123!');

    const activeUser = await User.create({
      employeeId: 'AUTH_ACT_01',
      name: 'Active Staff Member',
      email: 'active@auth-test.com',
      passwordHash,
      mobile: '+919876543220',
      department: 'Sales',
      roleId: role!._id,
      designation: 'Consultant',
      branch: 'Main Branch',
      joiningDate: new Date(),
      status: 'active',
      loginStatus: 'never_logged_in',
    });
    activeUserId = activeUser._id.toString();

    const inactiveUser = await User.create({
      employeeId: 'AUTH_INACT_01',
      name: 'Deactivated Staff Member',
      email: 'inactive@auth-test.com',
      passwordHash,
      mobile: '+919876543221',
      department: 'Sales',
      roleId: role!._id,
      designation: 'Ex-Consultant',
      branch: 'Main Branch',
      joiningDate: new Date(),
      status: 'inactive', // Deactivated!
      loginStatus: 'offline',
    });
    inactiveUserId = inactiveUser._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['active@auth-test.com', 'inactive@auth-test.com', 'ratelimit@auth-test.com'] } });
    await disconnectFromDatabase();
  });

  beforeEach(() => {
    clearAllRateLimits();
  });

  it('CRITICAL: Inactive accounts must be rejected by real login API handler with HTTP 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'inactive@auth-test.com',
        password: 'ValidPassword123!',
      }),
    });

    const response = await loginHandler(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/deactivated/i);
    // Ensure no session cookie was set for deactivated account
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it('Active user with valid credentials logs in successfully via API handler, sets HttpOnly cookie, and omits JWT from JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'active@auth-test.com',
        password: 'ValidPassword123!',
      }),
    });

    const response = await loginHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user).toBeDefined();
    expect(data.data.user.email).toBe('active@auth-test.com');
    expect(data.data.user.passwordHash).toBeUndefined();

    // Priority 6: JWT must NOT be returned in JSON response
    expect(data.data.token).toBeUndefined();

    // Session cookie must be set and configured safely
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it('Rejects invalid password with HTTP 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'active@auth-test.com',
        password: 'WrongPassword999!',
      }),
    });

    const response = await loginHandler(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('Rejects non-existent email with HTTP 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nobody@auth-test.com',
        password: 'SomePassword123!',
      }),
    });

    const response = await loginHandler(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid email or password');
  });

  it('Enforces rate limiting after 5 consecutive failed attempts with HTTP 429 and Retry-After header', async () => {
    const clientIp = '192.168.1.100';

    for (let i = 0; i < 5; i++) {
      const failReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': clientIp,
        },
        body: JSON.stringify({
          email: 'ratelimit@auth-test.com',
          password: 'BadPassword!',
        }),
      });
      const failRes = await loginHandler(failReq);
      expect(failRes.status).toBe(401);
    }

    // 6th attempt should trigger 429
    const limitedReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': clientIp,
      },
      body: JSON.stringify({
        email: 'ratelimit@auth-test.com',
        password: 'BadPassword!',
      }),
    });

    const limitedRes = await loginHandler(limitedReq);
    const data = await limitedRes.json();

    expect(limitedRes.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/too many failed login attempts/i);
    expect(limitedRes.headers.get('Retry-After')).toBeDefined();
  });
});
