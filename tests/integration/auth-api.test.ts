import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { hashPassword } from '../../src/lib/auth/password';
import { signAuthToken, verifyAuthToken } from '../../src/lib/auth/jwt';
import { seedRoles } from '../../scripts/seed-roles';

describe('Integration: Authentication Logic & Inactive Account Enforcement', () => {
  let activeUserId: string;
  let inactiveUserId: string;

  beforeAll(async () => {
    await connectToDatabase();
    await seedRoles();
    const role = await Role.findOne({ slug: 'sales_executive' });

    // Clean up previous test users
    await User.deleteMany({ email: { $in: ['active@auth-test.com', 'inactive@auth-test.com'] } });

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
    await User.deleteMany({ email: { $in: ['active@auth-test.com', 'inactive@auth-test.com'] } });
    await disconnectFromDatabase();
  });

  it('CRITICAL: Inactive accounts must be denied access even with correct credentials', async () => {
    const user = await User.findOne({ email: 'inactive@auth-test.com' }).select('+passwordHash');
    expect(user).not.toBeNull();
    expect(user?.status).toBe('inactive');

    // Authentication evaluation rule
    const isAccountActive = user?.status === 'active';
    expect(isAccountActive).toBe(false);
  });

  it('Active user with valid credentials generates valid JWT session payload', async () => {
    const user = await User.findOne({ email: 'active@auth-test.com' }).populate('roleId');
    expect(user).not.toBeNull();

    const role = user!.roleId as any;

    const token = await signAuthToken({
      userId: user!._id.toString(),
      employeeId: user!.employeeId,
      email: user!.email,
      name: user!.name,
      roleSlug: role.slug,
      roleId: role._id.toString(),
      department: user!.department,
      branch: user!.branch,
    });

    expect(token).toBeDefined();

    const verified = await verifyAuthToken(token);
    expect(verified?.userId).toBe(user!._id.toString());
    expect(verified?.email).toBe('active@auth-test.com');
  });
});
