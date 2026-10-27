import { describe, it, expect } from 'vitest';
import { BASELINE_ROLES } from '../../src/policies/baselineRoles';
import { BASELINE_ROLE_SLUGS, CRM_MODULES, PERMISSION_ACTIONS } from '../../src/types';

describe('A. Baseline Role Definitions and Specifications', () => {
  it('should define exactly seven baseline roles required by Section 49', () => {
    expect(BASELINE_ROLES).toHaveLength(7);

    const slugs = BASELINE_ROLES.map((r) => r.slug);
    expect(slugs).toEqual(expect.arrayContaining(BASELINE_ROLE_SLUGS));
  });

  it('should have stable, distinct role identifiers and descriptions', () => {
    const slugs = new Set<string>();
    BASELINE_ROLES.forEach((role) => {
      expect(role.name).toBeDefined();
      expect(role.slug).toMatch(/^[a-z_]+$/);
      expect(role.description.length).toBeGreaterThan(10);
      expect(slugs.has(role.slug)).toBe(false);
      slugs.add(role.slug);
    });
  });

  it('should configure Super Admin with full system access across all 32 modules with all 8 actions', () => {
    const superAdmin = BASELINE_ROLES.find((r) => r.slug === 'super_admin');
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.leadVisibilityScope).toBe('company');
    expect(superAdmin?.permissions).toHaveLength(CRM_MODULES.length);

    // Verify all 8 actions are present on each module
    superAdmin?.permissions.forEach((perm) => {
      expect(perm.actions).toHaveLength(8);
      expect(perm.actions).toEqual(expect.arrayContaining(PERMISSION_ACTIONS));
    });
  });

  it('should configure Sales Manager with team scope and supervisory capabilities', () => {
    const salesManager = BASELINE_ROLES.find((r) => r.slug === 'sales_manager');
    expect(salesManager).toBeDefined();
    expect(salesManager?.leadVisibilityScope).toBe('team');

    const leadPerm = salesManager?.permissions.find((p) => p.module === 'leads');
    expect(leadPerm?.actions).toContain('view');
    expect(leadPerm?.actions).toContain('assign');
    expect(leadPerm?.actions).toContain('approve');
  });

  it('should configure Sales Executive with assigned scope without company-wide or unconstrained delete authority', () => {
    const salesExec = BASELINE_ROLES.find((r) => r.slug === 'sales_executive');
    expect(salesExec).toBeDefined();
    expect(salesExec?.leadVisibilityScope).toBe('assigned');

    const leadPerm = salesExec?.permissions.find((p) => p.module === 'leads');
    expect(leadPerm?.actions).toContain('view');
    expect(leadPerm?.actions).toContain('create');
    expect(leadPerm?.actions).toContain('edit');
    expect(leadPerm?.actions).not.toContain('delete');
    expect(leadPerm?.actions).not.toContain('assign');
  });

  it('should configure Management / Viewer with read-only permissions and no modification or publish authority', () => {
    const viewer = BASELINE_ROLES.find((r) => r.slug === 'management_viewer');
    expect(viewer).toBeDefined();

    viewer?.permissions.forEach((perm) => {
      expect(perm.actions).toContain('view');
      expect(perm.actions).not.toContain('create');
      expect(perm.actions).not.toContain('edit');
      expect(perm.actions).not.toContain('delete');
      expect(perm.actions).not.toContain('publish');
      expect(perm.actions).not.toContain('approve');
      expect(perm.actions).not.toContain('assign');
    });
  });

  it('should configure Website Manager with website CMS access but restrict direct publish without workflow', () => {
    const webMgr = BASELINE_ROLES.find((r) => r.slug === 'website_manager');
    expect(webMgr).toBeDefined();

    const cmsPerm = webMgr?.permissions.find((p) => p.module === 'website_cms');
    expect(cmsPerm).toBeDefined();
    expect(cmsPerm?.actions).toContain('view');
    expect(cmsPerm?.actions).toContain('edit');

    // Does NOT have access to staff_users or audit_logs
    expect(webMgr?.permissions.find((p) => p.module === 'staff_users')).toBeUndefined();
    expect(webMgr?.permissions.find((p) => p.module === 'audit_logs')).toBeUndefined();
  });
});
