import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  canExport,
  canAssign,
  canPublish,
  canApprove,
} from '../../src/policies/permissionPolicy';
import { BASELINE_ROLES } from '../../src/policies/baselineRoles';
import { IRole } from '../../src/types';

describe('B. Permission Evaluation & Fail-Closed RBAC Engine', () => {
  const viewerRole: Partial<IRole> = {
    name: 'Viewer',
    slug: 'management_viewer',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'reports', actions: ['view'] },
    ],
  };

  const editorRole: Partial<IRole> = {
    name: 'Editor',
    slug: 'custom_editor',
    permissions: [
      { module: 'properties', actions: ['view', 'edit'] },
    ],
  };

  const legitimateSuperAdmin = BASELINE_ROLES.find((r) => r.slug === 'super_admin')!;

  it('should grant access to explicitly permitted operations', () => {
    expect(hasPermission(viewerRole, 'dashboard', 'view')).toBe(true);
    expect(canView(viewerRole, 'reports')).toBe(true);
    expect(hasPermission(editorRole, 'properties', 'edit')).toBe(true);
  });

  it('should deny ungranted operations and fail closed', () => {
    expect(hasPermission(viewerRole, 'dashboard', 'delete')).toBe(false);
    expect(canCreate(viewerRole, 'reports')).toBe(false);
    expect(canDelete(viewerRole, 'leads')).toBe(false);
  });

  it('CRITICAL: View must NOT imply Edit', () => {
    expect(canView(viewerRole, 'reports')).toBe(true);
    expect(canEdit(viewerRole, 'reports')).toBe(false);
  });

  it('CRITICAL: Edit must NOT imply Publish', () => {
    expect(canEdit(editorRole, 'properties')).toBe(true);
    expect(canPublish(editorRole, 'properties')).toBe(false);
  });

  it('CRITICAL: View must NOT imply Export', () => {
    expect(canView(viewerRole, 'reports')).toBe(true);
    expect(canExport(viewerRole, 'reports')).toBe(false);
  });

  it('CRITICAL: Unauthorized assign and approve must be rejected', () => {
    expect(canAssign(viewerRole, 'leads')).toBe(false);
    expect(canApprove(editorRole, 'properties')).toBe(false);
  });

  it('CRITICAL: Null, undefined, or malformed role must fail closed safely', () => {
    expect(hasPermission(null, 'properties', 'view')).toBe(false);
    expect(hasPermission(undefined, 'properties', 'view')).toBe(false);
    expect(hasPermission({} as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: [] } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: 'all' } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: null } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: [null] } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: [{ module: 'properties' }] } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: [{ module: 'properties', actions: null }] } as any, 'properties', 'view')).toBe(false);
    expect(hasPermission({ permissions: [{ module: 'properties', actions: [] }] } as any, 'properties', 'view')).toBe(false);
  });

  it('CRITICAL: Forged super_admin role with empty or missing permissions must fail closed', () => {
    // Attempted bypass with slug only
    const forgedSuperAdminEmpty: Partial<IRole> = {
      name: 'Forged Super Admin',
      slug: 'super_admin',
      isSystem: true,
      permissions: [],
    };
    expect(hasPermission(forgedSuperAdminEmpty, 'system_settings', 'delete')).toBe(false);
    expect(hasPermission(forgedSuperAdminEmpty, 'staff_users', 'create')).toBe(false);
    expect(canPublish(forgedSuperAdminEmpty, 'properties')).toBe(false);

    // Attempted bypass with missing permissions key
    const forgedSuperAdminNoPerms: Partial<IRole> = {
      name: 'Forged Super Admin 2',
      slug: 'super_admin',
      isSystem: true,
    };
    expect(hasPermission(forgedSuperAdminNoPerms, 'system_settings', 'view')).toBe(false);

    // Attempted bypass with non-array permissions
    const forgedSuperAdminStringPerms: any = {
      slug: 'super_admin',
      permissions: 'all',
    };
    expect(hasPermission(forgedSuperAdminStringPerms, 'dashboard', 'view')).toBe(false);
  });

  it('should evaluate unknown modules as denied', () => {
    expect(hasPermission(viewerRole, 'unknown_module' as any, 'view')).toBe(false);
  });

  it('should evaluate legitimate Super Admin role with full authoritative permissions', () => {
    expect(hasPermission(legitimateSuperAdmin, 'system_settings', 'delete')).toBe(true);
    expect(hasPermission(legitimateSuperAdmin, 'staff_users', 'create')).toBe(true);
    expect(canPublish(legitimateSuperAdmin, 'properties')).toBe(true);
    expect(canApprove(legitimateSuperAdmin, 'projects')).toBe(true);
  });
});
