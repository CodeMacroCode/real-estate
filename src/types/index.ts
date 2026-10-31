export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'assign'
  | 'publish'
  | 'approve';

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'assign',
  'publish',
  'approve',
];

export type BaselineRoleSlug =
  | 'super_admin'
  | 'admin'
  | 'sales_manager'
  | 'sales_executive'
  | 'property_manager'
  | 'website_manager'
  | 'management_viewer';

export const BASELINE_ROLE_SLUGS: BaselineRoleSlug[] = [
  'super_admin',
  'admin',
  'sales_manager',
  'sales_executive',
  'property_manager',
  'website_manager',
  'management_viewer',
];

export const ADMIN_DELEGATABLE_SUBROLES = [
  'property_manager',
  'sales_executive',
  'sales_manager',
  'website_manager',
] as const;

export type AdminDelegatableSubrole = (typeof ADMIN_DELEGATABLE_SUBROLES)[number];

export type CRMModule =
  | 'dashboard'
  | 'leads'
  | 'enquiries'
  | 'clients'
  | 'owners'
  | 'properties'
  | 'residential_properties'
  | 'commercial_properties'
  | 'plots_land'
  | 'rental_leasing'
  | 'pre_leased_investment'
  | 'projects'
  | 'site_visits'
  | 'follow_ups'
  | 'tasks'
  | 'sales_pipeline'
  | 'rental_leasing_pipeline'
  | 'investment_pipeline'
  | 'bookings_transactions'
  | 'documents'
  | 'communications'
  | 'campaigns_lead_sources'
  | 'staff_users'
  | 'reports'
  | 'website_cms'
  | 'media_library'
  | 'notifications'
  | 'integrations'
  | 'import_export'
  | 'audit_logs'
  | 'master_settings'
  | 'system_settings';

export const CRM_MODULES: CRMModule[] = [
  'dashboard',
  'leads',
  'enquiries',
  'clients',
  'owners',
  'properties',
  'residential_properties',
  'commercial_properties',
  'plots_land',
  'rental_leasing',
  'pre_leased_investment',
  'projects',
  'site_visits',
  'follow_ups',
  'tasks',
  'sales_pipeline',
  'rental_leasing_pipeline',
  'investment_pipeline',
  'bookings_transactions',
  'documents',
  'communications',
  'campaigns_lead_sources',
  'staff_users',
  'reports',
  'website_cms',
  'media_library',
  'notifications',
  'integrations',
  'import_export',
  'audit_logs',
  'master_settings',
  'system_settings',
];

export type LeadVisibilityScope = 'assigned' | 'team' | 'company';

export type UserStatus = 'active' | 'inactive';
export type LoginStatus = 'online' | 'offline' | 'never_logged_in';

export interface ModulePermissionConfig {
  module: CRMModule;
  actions: PermissionAction[];
  leadVisibilityScope?: LeadVisibilityScope;
}

export interface IRole {
  _id?: string | any;
  name: string;
  slug: BaselineRoleSlug | string;
  description: string;
  isSystem: boolean;
  leadVisibilityScope: LeadVisibilityScope;
  permissions: ModulePermissionConfig[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IUser {
  _id?: string | any;
  employeeId?: string;
  name: string;
  username?: string;
  email: string;
  passwordHash?: string;
  encryptedPassword?: string;
  plainPassword?: string;
  mobile: string;
  department: string;
  roleId: string | IRole | any;
  designation: string;
  branch: string;
  profilePhoto?: string;
  joiningDate: string | Date;
  status: UserStatus;
  loginStatus: LoginStatus;
  reportingManagerId?: string | IUser;
  team?: string;
  allowedSubRoles?: string[];
  parentAdminId?: string | IUser;
  customPermissions?: ModulePermissionConfig[];
  createdBy?: string | IUser;
  lastLoginAt?: string | Date;
  lastLogoutAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type SafeUser = Omit<IUser, 'passwordHash' | 'encryptedPassword'> & {
  role?: IRole;
  reportingManager?: { _id: string; name: string; employeeId?: string; email: string };
  plainPassword?: string;
  isImpersonating?: boolean;
  impersonator?: { userId: string; email: string; name: string };
};

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'assign'
  | 'status_change'
  | 'login'
  | 'logout'
  | 'export'
  | 'import';

export interface IAuditLog {
  _id?: string;
  actor: {
    userId?: string;
    employeeId?: string;
    name: string;
    email: string;
    roleSlug: string;
    parentAdminId?: string;
  };
  targetUserId?: string;
  parentAdminId?: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  timestamp: string | Date;
  source: 'web_app' | 'api' | 'cli_bootstrap' | 'system';
  ipAddress?: string;
  userAgent?: string;
}

export type PropertyPublicationStatus = 'draft' | 'verification' | 'approved' | 'published';
export type ProjectPublicationStatus = 'draft' | 'review' | 'approved' | 'published';
export type WebsiteContentPublicationStatus = 'draft' | 'review' | 'published';


export interface AuthTokenPayload {
  userId: string;
  employeeId?: string;
  username?: string;
  email: string;
  name: string;
  roleSlug: string;
  roleId: string;
  department: string;
  branch: string;
  team?: string;
  isImpersonating?: boolean;
  impersonator?: {
    userId: string;
    email: string;
    name: string;
  };
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
