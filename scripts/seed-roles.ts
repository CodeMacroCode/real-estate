import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb/db';
import { Role } from '../src/models/Role';
import { BASELINE_ROLES } from '../src/policies/baselineRoles';

export async function seedRoles(): Promise<{ created: number; updated: number; total: number }> {
  await connectToDatabase();

  let created = 0;
  let updated = 0;

  for (const roleDef of BASELINE_ROLES) {
    const existing = await Role.findOne({ slug: roleDef.slug });

    if (existing) {
      existing.name = roleDef.name;
      existing.description = roleDef.description;
      existing.isSystem = roleDef.isSystem;
      existing.leadVisibilityScope = roleDef.leadVisibilityScope;
      existing.permissions = roleDef.permissions as any;
      await existing.save();
      updated++;
    } else {
      await Role.create({
        name: roleDef.name,
        slug: roleDef.slug,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        leadVisibilityScope: roleDef.leadVisibilityScope,
        permissions: roleDef.permissions,
      });
      created++;
    }
  }

  const total = await Role.countDocuments();
  return { created, updated, total };
}

// Direct execution guard
if (require.main === module || process.argv[1]?.endsWith('seed-roles.ts')) {
  (async () => {
    try {
      console.log('Seeding baseline roles into MongoDB...');
      const result = await seedRoles();
      console.log(`Roles seeding completed successfully!`);
      console.log(`- Created: ${result.created}`);
      console.log(`- Updated: ${result.updated}`);
      console.log(`- Total Roles in DB: ${result.total}`);
      await disconnectFromDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed roles:', error);
      process.exit(1);
    }
  })();
}
