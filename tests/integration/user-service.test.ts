import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { createUser, updateUserStatus, listUsers, getUserById } from '../../src/services/userService';
import { seedRoles } from '../../scripts/seed-roles';

describe('Integration: User Management & Real Database Persistence', () => {
  let testRoleId: string;
  const testActor = {
    userId: '66f500000000000000000099',
    employeeId: 'ADMIN01',
    name: 'Admin Test Actor',
    email: 'actor@crm.com',
    roleSlug: 'super_admin',
  };

  beforeAll(async () => {
    await connectToDatabase();
    await seedRoles();
    const role = await Role.findOne({ slug: 'sales_executive' });
    testRoleId = role!._id.toString();

    // Clean up test users
    await User.deleteMany({ email: { $regex: /@integration-test\.com$/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@integration-test\.com$/ } });
    await disconnectFromDatabase();
  });

  it('should create and persist a new staff member with all 12 Section 48 fields', async () => {
    const userData = {
      employeeId: 'EMP_INT_001',
      name: 'Integration Tester',
      email: 'test1@integration-test.com',
      password: 'StrongPassword123!',
      mobile: '+919876543201',
      department: 'Sales',
      roleId: testRoleId,
      designation: 'Field Representative',
      branch: 'North Branch',
      profilePhoto: 'https://example.com/avatar.jpg',
      joiningDate: new Date('2024-03-01'),
      status: 'active',
      team: 'Residential Sales Team A',
    };

    const created = await createUser(userData, testActor);

    expect(created._id).toBeDefined();
    expect(created.employeeId).toBe('EMP_INT_001');
    expect(created.email).toBe('test1@integration-test.com');
    expect(created.name).toBe('Integration Tester');
    expect(created.mobile).toBe('+919876543201');
    expect(created.department).toBe('Sales');
    expect(created.designation).toBe('Field Representative');
    expect(created.branch).toBe('North Branch');
    expect(created.status).toBe('active');
    expect(created.loginStatus).toBe('never_logged_in');

    // CRITICAL SECURITY: passwordHash must NOT be returned in safe user object
    expect((created as any).passwordHash).toBeUndefined();

    // Verify persisted in MongoDB
    const userInDb = await User.findById(created._id).select('+passwordHash');
    expect(userInDb).not.toBeNull();
    expect(userInDb?.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);
  });

  it('should reject creating user with duplicate email', async () => {
    const duplicateEmailData = {
      employeeId: 'EMP_INT_002',
      name: 'Duplicate Email Tester',
      email: 'test1@integration-test.com', // Already used
      password: 'StrongPassword123!',
      mobile: '+919876543202',
      department: 'Sales',
      roleId: testRoleId,
      designation: 'Sales Agent',
      branch: 'North Branch',
      joiningDate: new Date(),
    };

    await expect(createUser(duplicateEmailData, testActor)).rejects.toThrow(
      "User with email 'test1@integration-test.com' already exists"
    );
  });

  it('should reject creating user with duplicate Employee ID', async () => {
    const duplicateEmpIdData = {
      employeeId: 'EMP_INT_001', // Already used
      name: 'Duplicate Emp ID Tester',
      email: 'different@integration-test.com',
      password: 'StrongPassword123!',
      mobile: '+919876543203',
      department: 'Sales',
      roleId: testRoleId,
      designation: 'Sales Agent',
      branch: 'North Branch',
      joiningDate: new Date(),
    };

    await expect(createUser(duplicateEmpIdData, testActor)).rejects.toThrow(
      "User with Employee ID 'EMP_INT_001' already exists"
    );
  });

  it('should deactivate an active user, set loginStatus to offline, and preserve historical records', async () => {
    const user = await User.findOne({ email: 'test1@integration-test.com' });
    expect(user).not.toBeNull();

    const updated = await updateUserStatus(
      user!._id.toString(),
      'inactive',
      'Employee contract concluded',
      testActor
    );

    expect(updated.status).toBe('inactive');

    // Check directly in database
    const userInDb = await User.findById(user!._id);
    expect(userInDb?.status).toBe('inactive');
    expect(userInDb?.loginStatus).toBe('offline');

    // Historical record is preserved, NOT deleted
    const queried = await getUserById(user!._id.toString());
    expect(queried).not.toBeNull();
    expect(queried?.name).toBe('Integration Tester');
  });
});
