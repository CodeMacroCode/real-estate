import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb/db';
import { User } from '../src/models/User';
import { Role } from '../src/models/Role';
import { hashPassword } from '../src/lib/auth/password';
import { recordAuditEvent } from '../src/services/auditService';
import { seedRoles } from './seed-roles';

export async function bootstrapSuperAdmin(): Promise<{
  created: boolean;
  user: { email: string; employeeId?: string; name: string };
}> {
  await connectToDatabase();

  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const username = (process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME?.trim() || 'superadmin').toLowerCase();
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim() || 'System Super Admin';
  const employeeId = (process.env.BOOTSTRAP_SUPER_ADMIN_EMP_ID?.trim() || 'EMP001').toUpperCase();
  const mobile = process.env.BOOTSTRAP_SUPER_ADMIN_PHONE?.trim() || '+919876543210';

  if (!email || !password) {
    throw new Error(
      'BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_PASSWORD environment variables are strictly required.'
    );
  }

  if (password.length < 8) {
    throw new Error('Super Admin password must be at least 8 characters in length.');
  }

  // Ensure roles exist
  let superAdminRole = await Role.findOne({ slug: 'super_admin' });
  if (!superAdminRole) {
    console.log('Super Admin role not found. Seeding baseline roles first...');
    await seedRoles();
    superAdminRole = await Role.findOne({ slug: 'super_admin' });
    if (!superAdminRole) {
      throw new Error('Failed to initialize Super Admin role');
    }
  }

  // Check if admin already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { employeeId }],
  });

  if (existingUser) {
    if (!existingUser.username) {
      existingUser.username = username;
      await existingUser.save();
    }
    console.log(`Administrator already exists with email '${existingUser.email}' or ID '${existingUser.employeeId}'. No changes made.`);
    return {
      created: false,
      user: {
        email: existingUser.email,
        employeeId: existingUser.employeeId,
        name: existingUser.name,
      },
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await User.create({
    employeeId,
    username,
    name,
    email,
    passwordHash,
    mobile,
    department: 'Management',
    roleId: superAdminRole._id,
    designation: 'Principal Super Administrator',
    branch: 'Headquarters',
    joiningDate: new Date(),
    status: 'active',
    loginStatus: 'never_logged_in',
    team: 'Executive Leadership',
  });

  // Record audit log
  await recordAuditEvent({
    actor: {
      userId: newUser._id.toString(),
      employeeId: newUser.employeeId,
      name: newUser.name,
      email: newUser.email,
      roleSlug: 'super_admin',
    },
    action: 'create',
    entity: 'user',
    entityId: newUser._id.toString(),
    newValues: {
      employeeId: newUser.employeeId,
      name: newUser.name,
      email: newUser.email,
      role: 'super_admin',
      department: newUser.department,
      branch: newUser.branch,
      status: newUser.status,
    },
    source: 'cli_bootstrap',
  });

  return {
    created: true,
    user: {
      email: newUser.email,
      employeeId: newUser.employeeId,
      name: newUser.name,
    },
  };
}

// CLI execution
if (require.main === module || process.argv[1]?.endsWith('bootstrap-admin.ts')) {
  (async () => {
    try {
      console.log('Bootstrapping initial Super Admin user...');
      const result = await bootstrapSuperAdmin();
      if (result.created) {
        console.log('Super Admin provisioned successfully:');
        console.log(`- Name: ${result.user.name}`);
        console.log(`- Email: ${result.user.email}`);
        console.log(`- Employee ID: ${result.user.employeeId}`);
      }
      await disconnectFromDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Failed to bootstrap Super Admin:', error);
      process.exit(1);
    }
  })();
}
