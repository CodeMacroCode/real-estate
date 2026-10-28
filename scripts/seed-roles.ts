import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb/db';
import { Role } from '../src/models/Role';
import { BASELINE_ROLES } from '../src/policies/baselineRoles';

export interface SeedRolesOptions {
  /**
   * If true, forces overwriting existing role permissions and scopes with system defaults.
   * Defaults to false, guaranteeing that repeat seeds never overwrite administrator customizations.
   */
  overwritePermissions?: boolean;
}

export async function seedRoles(
  options: SeedRolesOptions = {}
): Promise<{ created: number; updated: number; preserved: number; total: number }> {
  await connectToDatabase();

  let created = 0;
  let updated = 0;
  let preserved = 0;

  for (const roleDef of BASELINE_ROLES) {
    const existing = await Role.findOne({ slug: roleDef.slug });

    if (existing) {
      if (options.overwritePermissions) {
        // Deliberate migration of defaults requested
        existing.name = roleDef.name;
        existing.description = roleDef.description;
        existing.isSystem = roleDef.isSystem;
        existing.leadVisibilityScope = roleDef.leadVisibilityScope;
        existing.permissions = roleDef.permissions as any;
        await existing.save();
        updated++;
      } else {
        // Safe repeat seed: PRESERVE administrator-customized permissions and scopes
        let needsSave = false;
        if (!existing.isSystem && roleDef.isSystem) {
          existing.isSystem = true;
          needsSave = true;
        }
        if (needsSave) {
          await existing.save();
          updated++;
        } else {
          preserved++;
        }
      }
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
  return { created, updated, preserved, total };
}

// Direct execution guard
if (require.main === module || process.argv[1]?.endsWith('seed-roles.ts')) {
  (async () => {
    try {
      const forceOverwrite =
        process.argv.includes('--force') || process.argv.includes('--overwrite-permissions');
      console.log(
        `Seeding baseline roles into MongoDB (forceOverwrite: ${forceOverwrite})...`
      );
      const result = await seedRoles({ overwritePermissions: forceOverwrite });
      console.log(`Roles seeding completed successfully!`);
      console.log(`- Created: ${result.created}`);
      console.log(`- Updated: ${result.updated}`);
      console.log(`- Preserved: ${result.preserved}`);
      console.log(`- Total Roles in DB: ${result.total}`);
      await disconnectFromDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed roles:', error);
      process.exit(1);
    }
  })();
}
