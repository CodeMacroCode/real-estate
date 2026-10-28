import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { Role } from '../../src/models/Role';
import { seedRoles } from '../../scripts/seed-roles';
import { BASELINE_ROLES } from '../../src/policies/baselineRoles';

describe('Integration: Database Role Seeding & Persistence', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  it('should seed 7 baseline roles idempotently into MongoDB without duplicates', async () => {
    // First run
    const result1 = await seedRoles();
    expect(result1.total).toBe(7);

    const rolesInDb = await Role.find();
    expect(rolesInDb).toHaveLength(7);

    // Verify all 7 slugs are present
    const slugs = rolesInDb.map((r) => r.slug).sort();
    expect(slugs).toEqual([
      'admin',
      'management_viewer',
      'property_manager',
      'sales_executive',
      'sales_manager',
      'super_admin',
      'website_manager',
    ]);

    // Second run: verify idempotent behavior
    const result2 = await seedRoles();
    expect(result2.created).toBe(0); // 0 new roles created
    expect(result2.total).toBe(7);

    const rolesAfterSecondSeed = await Role.find();
    expect(rolesAfterSecondSeed).toHaveLength(7);
  });

  it('REGRESSION: repeat seed must NOT overwrite administrator-customized permission grants', async () => {
    // 1. Fetch an existing role and add an administrator-customized permission
    const salesExec = await Role.findOne({ slug: 'sales_executive' });
    expect(salesExec).not.toBeNull();

    const originalPermCount = salesExec!.permissions.length;
    const customPermission = {
      module: 'campaigns_lead_sources' as const,
      actions: ['view' as const, 'export' as const],
    };

    salesExec!.permissions.push(customPermission as any);
    salesExec!.description = 'Customized Sales Executive Description';
    await salesExec!.save();

    // 2. Perform a normal repeat seed without force overwrite
    const repeatResult = await seedRoles({ overwritePermissions: false });
    expect(repeatResult.created).toBe(0);

    // 3. Verify the customized permission and description were preserved!
    const reloadedExec = await Role.findOne({ slug: 'sales_executive' });
    expect(reloadedExec).not.toBeNull();
    expect(reloadedExec!.description).toBe('Customized Sales Executive Description');
    expect(reloadedExec!.permissions).toHaveLength(originalPermCount + 1);

    const hasCustomPerm = reloadedExec!.permissions.some(
      (p) => p.module === 'campaigns_lead_sources' && p.actions.includes('export')
    );
    expect(hasCustomPerm).toBe(true);

    // 4. Verify deliberate migration with overwritePermissions: true DOES reset system defaults
    const deliberateReset = await seedRoles({ overwritePermissions: true });
    expect(deliberateReset.updated).toBeGreaterThan(0);

    const baselineDef = BASELINE_ROLES.find((r) => r.slug === 'sales_executive')!;
    const resetExec = await Role.findOne({ slug: 'sales_executive' });
    expect(resetExec!.permissions).toHaveLength(baselineDef.permissions.length);
    const hasCustomPermAfterReset = resetExec!.permissions.some(
      (p) => p.module === 'campaigns_lead_sources'
    );
    expect(hasCustomPermAfterReset).toBe(false);
  });
});
