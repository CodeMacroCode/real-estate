import { connectToDatabase } from '../lib/mongodb/db';
import { Role, IRoleDocument } from '../models/Role';
import { recordAuditEvent } from './auditService';
import { IRole } from '../types';

export async function listRoles(): Promise<IRoleDocument[]> {
  await connectToDatabase();
  return Role.find().sort({ isSystem: -1, name: 1 });
}

export async function getRoleById(id: string): Promise<IRoleDocument | null> {
  await connectToDatabase();
  return Role.findById(id);
}

export async function updateRole(
  id: string,
  data: Partial<IRole>,
  actor: { userId?: string; employeeId?: string; name: string; email: string; roleSlug: string }
): Promise<IRoleDocument> {
  await connectToDatabase();

  const role = await Role.findById(id);
  if (!role) {
    throw new Error('Role not found');
  }

  // Safety protection for Super Admin system role
  if (role.slug === 'super_admin') {
    if (data.leadVisibilityScope && data.leadVisibilityScope !== 'company') {
      throw new Error('Super Admin visibility scope must remain company-wide');
    }
  }

  const oldValues = {
    name: role.name,
    description: role.description,
    leadVisibilityScope: role.leadVisibilityScope,
    permissionsCount: role.permissions.length,
  };

  if (data.name) role.name = data.name;
  if (data.description) role.description = data.description;
  if (data.leadVisibilityScope) role.leadVisibilityScope = data.leadVisibilityScope;
  if (data.permissions && Array.isArray(data.permissions)) {
    // For super_admin, verify permissions don't become empty
    if (role.slug === 'super_admin' && data.permissions.length === 0) {
      throw new Error('Cannot strip all permissions from Super Admin role');
    }
    role.permissions = data.permissions as any;
  }

  await role.save();

  await recordAuditEvent({
    actor,
    action: 'update',
    entity: 'role',
    entityId: role._id.toString(),
    oldValues,
    newValues: {
      name: role.name,
      description: role.description,
      leadVisibilityScope: role.leadVisibilityScope,
      permissionsCount: role.permissions.length,
    },
    source: 'web_app',
  });

  return role;
}
