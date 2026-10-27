import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToDatabase, disconnectFromDatabase } from '../../src/lib/mongodb/db';
import { Role } from '../../src/models/Role';
import { seedRoles } from '../../scripts/seed-roles';

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
});
