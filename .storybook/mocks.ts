import { SafeUser, IRole } from '../src/types';

export const mockSuperAdminRole: IRole = {
  _id: 'role_super_admin_001',
  name: 'Super Admin',
  slug: 'super_admin',
  description: 'Unrestricted system owner with enterprise-wide governance authority.',
  isSystem: true,
  leadVisibilityScope: 'company',
  permissions: [
    { module: 'dashboard', actions: ['view', 'export'] },
    { module: 'staff_users', actions: ['view', 'create', 'edit', 'delete', 'export'] },
    { module: 'system_settings', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'audit_logs', actions: ['view', 'export'] },
  ],
};

export const mockAdminRole: IRole = {
  _id: 'role_admin_002',
  name: 'Admin',
  slug: 'admin',
  description: 'Operational business administrator managing users and pipelines.',
  isSystem: true,
  leadVisibilityScope: 'company',
  permissions: [
    { module: 'dashboard', actions: ['view', 'export'] },
    { module: 'staff_users', actions: ['view', 'create', 'edit', 'export'] },
  ],
};

export const mockSalesExecutiveRole: IRole = {
  _id: 'role_sales_exec_003',
  name: 'Sales Executive',
  slug: 'sales_executive',
  description: 'Frontline sales agent handling assigned leads and client visits.',
  isSystem: true,
  leadVisibilityScope: 'assigned',
  permissions: [
    { module: 'leads', actions: ['view', 'create', 'edit'], leadVisibilityScope: 'assigned' },
  ],
};

export const mockSuperAdminUser: SafeUser = {
  _id: 'user_super_admin_001',
  name: 'System Super Admin',
  username: 'superadmin',
  email: 'superadmin@realestatecrm.com',
  mobile: '+919876543210',
  department: 'Management',
  designation: 'Principal Super Administrator',
  branch: 'Headquarters',
  team: 'Executive Leadership',
  roleId: mockSuperAdminRole._id,
  role: mockSuperAdminRole,
  status: 'active',
  loginStatus: 'online',
  joiningDate: new Date('2026-01-01'),
};

export const mockAdminUser: SafeUser = {
  _id: 'user_admin_002',
  name: 'Prasad Sharma',
  username: 'prasad',
  email: 'prasad@realestatecrm.com',
  mobile: '8877665533',
  department: 'Sales Management',
  designation: 'General Admin',
  branch: 'Main Branch',
  team: 'Alpha Management',
  roleId: mockAdminRole._id,
  role: mockAdminRole,
  status: 'active',
  loginStatus: 'online',
  joiningDate: new Date('2026-02-15'),
  allowedSubRoles: ['sales_executive', 'sales_manager', 'property_manager'],
};

export const mockStaffUser: SafeUser = {
  _id: 'user_staff_003',
  employeeId: 'EMP101',
  name: 'Pooja Verma',
  username: 'pooja',
  email: 'pooja@realestatecrm.com',
  mobile: '9898989898',
  department: 'Sales',
  designation: 'Sales Executive',
  branch: 'Main Branch',
  team: 'Direct Sales',
  roleId: mockSalesExecutiveRole._id,
  role: mockSalesExecutiveRole,
  status: 'active',
  loginStatus: 'never_logged_in',
  joiningDate: new Date('2026-03-01'),
};
