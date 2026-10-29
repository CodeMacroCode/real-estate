import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { User } from '../../src/models/User';
import { Role } from '../../src/models/Role';
import { hashPassword } from '../../src/lib/auth/password';
import { signAuthToken } from '../../src/lib/auth/jwt';
import { seedRoles } from '../../scripts/seed-roles';
import { SESSION_COOKIE_NAME } from '../../src/lib/auth/constants';

import { GET as getUsersHandler, POST as createUserHandler } from '../../src/app/api/users/route';
import { GET as getUserByIdHandler, PUT as updateUserHandler } from '../../src/app/api/users/[id]/route';
import { PUT as updateRoleHandler } from '../../src/app/api/roles/[id]/route';
import { GET as getMeHandler } from '../../src/app/api/auth/me/route';
import { POST as logoutHandler } from '../../src/app/api/auth/logout/route';

describe('Integration: Comprehensive API Handlers & Authorization Security', () => {
  let superAdminUser: any;
  let adminUser: any;
  let salesExecUser: any;
  let targetStaffUser: any;

  let superAdminToken: string;
  let adminToken: string;
  let salesExecToken: string;

  let superAdminRole: any;
  let adminRole: any;
  let salesExecRole: any;

  beforeAll(async () => {
    await connectToDatabase();
    await seedRoles({ overwritePermissions: true });

    superAdminRole = await Role.findOne({ slug: 'super_admin' });
    adminRole = await Role.findOne({ slug: 'admin' });
    salesExecRole = await Role.findOne({ slug: 'sales_executive' });

    // Clean up test database
    await User.deleteMany({ email: { $regex: /@api-test\.com$/ } });
    await Role.deleteMany({ slug: { $in: ['custom_admin_escalate', 'custom_editable_role'] } });

    const passwordHash = await hashPassword('SecurePass123!');

    // 1. Super Admin
    superAdminUser = await User.create({
      employeeId: 'API_SA_01',
      name: 'Super Admin Tester',
      email: 'superadmin@api-test.com',
      passwordHash,
      mobile: '+919999900001',
      department: 'Management',
      roleId: superAdminRole._id,
      designation: 'Managing Director',
      branch: 'Headquarters',
      joiningDate: new Date(),
      status: 'active',
      loginStatus: 'online',
    });

    superAdminToken = await signAuthToken({
      userId: superAdminUser._id.toString(),
      employeeId: superAdminUser.employeeId,
      email: superAdminUser.email,
      name: superAdminUser.name,
      roleSlug: superAdminRole.slug,
      roleId: superAdminRole._id.toString(),
      department: superAdminUser.department,
      branch: superAdminUser.branch,
    });

    // 2. Admin
    adminUser = await User.create({
      employeeId: 'API_ADM_01',
      name: 'Admin Tester',
      email: 'admin@api-test.com',
      passwordHash,
      mobile: '+919999900002',
      department: 'Operations',
      roleId: adminRole._id,
      designation: 'Operations Lead',
      branch: 'Headquarters',
      joiningDate: new Date(),
      status: 'active',
      loginStatus: 'online',
      allowedSubRoles: ['sales_executive', 'property_manager', 'sales_manager', 'website_manager'],
    });

    adminToken = await signAuthToken({
      userId: adminUser._id.toString(),
      employeeId: adminUser.employeeId,
      email: adminUser.email,
      name: adminUser.name,
      roleSlug: adminRole.slug,
      roleId: adminRole._id.toString(),
      department: adminUser.department,
      branch: adminUser.branch,
    });

    // 3. Sales Executive
    salesExecUser = await User.create({
      employeeId: 'API_SE_01',
      name: 'Sales Exec Tester',
      email: 'salesexec@api-test.com',
      passwordHash,
      mobile: '+919999900003',
      department: 'Sales',
      roleId: salesExecRole._id,
      designation: 'Sales Agent',
      branch: 'North Branch',
      joiningDate: new Date(),
      status: 'active',
      loginStatus: 'online',
    });

    salesExecToken = await signAuthToken({
      userId: salesExecUser._id.toString(),
      employeeId: salesExecUser.employeeId,
      email: salesExecUser.email,
      name: salesExecUser.name,
      roleSlug: salesExecRole.slug,
      roleId: salesExecRole._id.toString(),
      department: salesExecUser.department,
      branch: salesExecUser.branch,
    });

    // 4. Target Staff User (for updates)
    targetStaffUser = await User.create({
      employeeId: 'API_TGT_01',
      name: 'Target Staff Member',
      email: 'target@api-test.com',
      passwordHash,
      mobile: '+919999900004',
      department: 'Sales',
      roleId: salesExecRole._id,
      designation: 'Junior Agent',
      branch: 'North Branch',
      joiningDate: new Date(),
      status: 'active',
      loginStatus: 'never_logged_in',
      parentAdminId: adminUser._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@api-test\.com$/ } });
    await Role.deleteMany({ slug: { $in: ['custom_admin_escalate', 'custom_editable_role'] } });
    await disconnectFromDatabase();
  });

  // --- USER PROVISIONING & ROLE ASSIGNMENT ---
  describe('User Creation & Role Assignment Authority (POST /api/users)', () => {
    it('Success: Super Admin can provision new staff user with any role', async () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
        body: JSON.stringify({
          employeeId: 'NEW_EMP_01',
          name: 'New Agent',
          email: 'newagent@api-test.com',
          password: 'Password123!',
          mobile: '+919876540001',
          department: 'Sales',
          roleId: salesExecRole._id.toString(),
          designation: 'Agent',
          branch: 'Main Branch',
          joiningDate: new Date().toISOString(),
        }),
      });

      const res = await createUserHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.employeeId).toBe('NEW_EMP_01');
      expect(data.data.passwordHash).toBeUndefined();
    });

    it('Rejection: Non-super-admin (Admin) cannot create user with Super Admin role', async () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({
          employeeId: 'ILLEGAL_SA_01',
          name: 'Illegal Super Admin',
          email: 'illegal-sa@api-test.com',
          password: 'Password123!',
          mobile: '+919876540002',
          department: 'Management',
          roleId: superAdminRole._id.toString(),
          designation: 'Rogue Admin',
          branch: 'Main Branch',
          joiningDate: new Date().toISOString(),
        }),
      });

      const res = await createUserHandler(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Only a Super Admin can assign the Super Admin role/);
    });

    it('Rejection: User without staff_users:create (Sales Exec) cannot create staff users', async () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${salesExecToken}`,
        },
        body: JSON.stringify({
          employeeId: 'EXEC_ATTEMPT_01',
          name: 'Exec Attempt',
          email: 'exec-attempt@api-test.com',
          password: 'Password123!',
          mobile: '+919876540003',
          department: 'Sales',
          roleId: salesExecRole._id.toString(),
          designation: 'Agent',
          branch: 'Main Branch',
          joiningDate: new Date().toISOString(),
        }),
      });

      const res = await createUserHandler(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/lack permission to create staff users/);
    });
  });

  // --- USER UPDATE & SEPARATION OF STAFF EDITING FROM ROLE ASSIGNMENT ---
  describe('User Updating & Privilege Separation (PUT /api/users/[id])', () => {
    it('Success: Admin can perform ordinary staff editing (mobile, designation) without altering role', async () => {
      const req = new NextRequest(`http://localhost:3000/api/users/${targetStaffUser._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({
          mobile: '+919999988888',
          designation: 'Senior Consultant',
        }),
      });

      const res = await updateUserHandler(req, { params: { id: targetStaffUser._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.mobile).toBe('+919999988888');
      expect(data.data.designation).toBe('Senior Consultant');
    });

    it('Rejection: Non-super-admin cannot escalate target user to Super Admin role', async () => {
      const req = new NextRequest(`http://localhost:3000/api/users/${targetStaffUser._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({
          roleId: superAdminRole._id.toString(),
        }),
      });

      const res = await updateUserHandler(req, { params: { id: targetStaffUser._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Only a Super Admin can assign the Super Admin role/);
    });

    it('Rejection: Self-escalation is blocked when an actor attempts to change their own role', async () => {
      const req = new NextRequest(`http://localhost:3000/api/users/${adminUser._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({
          roleId: superAdminRole._id.toString(),
        }),
      });

      const res = await updateUserHandler(req, { params: { id: adminUser._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Self-escalation forbidden: You cannot change your own role/);
    });
  });

  // --- ROLE MANAGEMENT & SYSTEM ROLE PROTECTIONS ---
  describe('Role Management Authorization (PUT /api/roles/[id])', () => {
    it('Success: Super Admin can update permissions of a non-super-admin role', async () => {
      const targetRole = await Role.create({
        name: 'Editable Custom Role',
        slug: 'custom_editable_role',
        description: 'Original Description',
        isSystem: false,
        leadVisibilityScope: 'team',
        permissions: [{ module: 'leads', actions: ['view'] }],
      });

      const req = new NextRequest(`http://localhost:3000/api/roles/${targetRole._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
        body: JSON.stringify({
          description: 'Updated Role Description by Super Admin',
          permissions: [
            { module: 'leads', actions: ['view', 'create', 'edit'] },
            { module: 'properties', actions: ['view'] },
          ],
        }),
      });

      const res = await updateRoleHandler(req, { params: { id: targetRole._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.description).toBe('Updated Role Description by Super Admin');
    });

    it('Rejection: Attempt to alter permissions of system role super_admin must be rejected', async () => {
      const req = new NextRequest(`http://localhost:3000/api/roles/${superAdminRole._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
        body: JSON.stringify({
          permissions: [{ module: 'dashboard', actions: ['view'] }],
        }),
      });

      const res = await updateRoleHandler(req, { params: { id: superAdminRole._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Cannot alter permissions of system role 'super_admin'/);
    });

    it('Rejection: Non-administrative principal (Sales Exec) cannot update role permissions', async () => {
      const req = new NextRequest(`http://localhost:3000/api/roles/${salesExecRole._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${salesExecToken}`,
        },
        body: JSON.stringify({
          description: 'Hacked role description',
        }),
      });

      const res = await updateRoleHandler(req, { params: { id: salesExecRole._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Modifying role grants requires authorized administrative privileges/);
    });

    it('Rejection: Self-escalation blocked when administrative actor attempts to modify their own assigned role', async () => {
      // Create a temporary custom admin role so we can test self-escalation
      const customRole = await Role.create({
        name: 'Custom Admin',
        slug: 'custom_admin_escalate',
        description: 'Test custom admin',
        isSystem: false,
        leadVisibilityScope: 'company',
        permissions: [
          { module: 'system_settings', actions: ['edit', 'view'] },
          { module: 'staff_users', actions: ['view', 'edit'] },
        ],
      });

      const customUser = await User.create({
        employeeId: 'CUSTOM_ESC_01',
        name: 'Custom Admin User',
        email: 'custom-admin@api-test.com',
        passwordHash: await hashPassword('Pass123!'),
        mobile: '+919999900010',
        department: 'Operations',
        roleId: customRole._id,
        designation: 'Ops Lead',
        branch: 'HQ',
        joiningDate: new Date(),
        status: 'active',
        loginStatus: 'online',
      });

      const customToken = await signAuthToken({
        userId: customUser._id.toString(),
        employeeId: customUser.employeeId,
        email: customUser.email,
        name: customUser.name,
        roleSlug: customRole.slug,
        roleId: customRole._id.toString(),
        department: customUser.department,
        branch: customUser.branch,
      });

      const req = new NextRequest(`http://localhost:3000/api/roles/${customRole._id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${customToken}`,
        },
        body: JSON.stringify({
          description: 'Self-escalated description',
        }),
      });

      const res = await updateRoleHandler(req, { params: { id: customRole._id.toString() } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Self-escalation forbidden: You cannot modify your own assigned role/);
    });
  });

  // --- INACTIVE SESSION REJECTION & REVOCATION ---
  describe('Inactive-Session Rejection & Revocation', () => {
    it('CRITICAL: Protected API rejects request immediately if user status becomes inactive', async () => {
      // 1. Verify user can query /api/auth/me while active
      const activeReq = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${salesExecToken}`,
        },
      });
      const activeRes = await getMeHandler(activeReq);
      expect(activeRes.status).toBe(200);

      // 2. Deactivate the user in the database
      salesExecUser.status = 'inactive';
      await salesExecUser.save();

      // 3. Immediately query /api/auth/me with the same token
      const inactiveReq = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${salesExecToken}`,
        },
      });
      const inactiveRes = await getMeHandler(inactiveReq);
      expect(inactiveRes.status).toBe(401);

      // Restore user status
      salesExecUser.status = 'active';
      await salesExecUser.save();
    });

    it('CRITICAL: Token is invalidated after user logs out via POST /api/auth/logout', async () => {
      // Create user and token for logout test
      const logoutUser = await User.create({
        employeeId: 'LOGOUT_USER_01',
        name: 'Logout Test User',
        email: 'logout-test@api-test.com',
        passwordHash: await hashPassword('Pass123!'),
        mobile: '+919999900020',
        department: 'Sales',
        roleId: salesExecRole._id,
        designation: 'Agent',
        branch: 'HQ',
        joiningDate: new Date(),
        status: 'active',
        loginStatus: 'online',
      });

      const tokenBeforeLogout = await signAuthToken({
        userId: logoutUser._id.toString(),
        employeeId: logoutUser.employeeId,
        email: logoutUser.email,
        name: logoutUser.name,
        roleSlug: salesExecRole.slug,
        roleId: salesExecRole._id.toString(),
        department: logoutUser.department,
        branch: logoutUser.branch,
      });

      // 1. Calling /api/auth/me before logout works
      const req1 = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenBeforeLogout}` },
      });
      const res1 = await getMeHandler(req1);
      expect(res1.status).toBe(200);

      // 2. Perform logout
      // Wait 1.1s so token iat is strictly earlier than lastLogoutAt
      await new Promise((r) => setTimeout(r, 1100));
      const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenBeforeLogout}` },
      });
      const logoutRes = await logoutHandler(logoutReq);
      expect(logoutRes.status).toBe(200);

      // 3. Replaying the previous token to /api/auth/me must now be rejected (session revoked)
      const req2 = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenBeforeLogout}` },
      });
      const res2 = await getMeHandler(req2);
      expect(res2.status).toBe(401);
    });

    it('Rejects unauthenticated requests to protected endpoints with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/users');
      const res = await getUsersHandler(req);
      expect(res.status).toBe(401);
    });
  });

  // --- CSRF PROTECTION ---
  describe('CSRF Protection on State-Changing API Endpoints', () => {
    it('CRITICAL: State-changing cookie request with mismatched Origin header must be rejected', async () => {
      const req = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
          host: 'localhost:3000',
          origin: 'http://malicious-attacker-site.com', // Mismatched origin!
        },
        body: JSON.stringify({
          employeeId: 'CSRF_01',
          name: 'CSRF User',
          email: 'csrf@api-test.com',
          password: 'Password123!',
          mobile: '+919876543299',
          department: 'Sales',
          roleId: salesExecRole._id.toString(),
          designation: 'Agent',
          branch: 'Main Branch',
          joiningDate: new Date().toISOString(),
        }),
      });

      const res = await createUserHandler(req);
      // Fails CSRF check in getAuthenticatedContext, resulting in 401 Unauthorized
      expect(res.status).toBe(401);
    });
  });
});
