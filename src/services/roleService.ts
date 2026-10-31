import { connectToDatabase } from '../lib/mongodb/db';
import { Role, IRoleDocument } from '../models/Role';
import { recordAuditEvent } from './auditService';
import { IRole, PermissionAction } from '../types';
import { hasPermission } from '../policies/permissionPolicy';

export interface RoleActor {
  userId?: string;
  employeeId?: string;
  name: string;
  email: string;
  roleSlug: string;
  roleId?: string;
}

export async function listRoles(): Promise<any[]> {
  await connectToDatabase();
  return Role.find().sort({ isSystem: -1, name: 1 }).lean();
}

export async function getRoleById(id: string): Promise<IRoleDocument | null> {
  await connectToDatabase();
  return Role.findById(id);
}

export async function updateRole(
  id: string,
  data: Partial<IRole>,
  actor: RoleActor,
  actorRole?: Partial<IRole>
): Promise<IRoleDocument> {
  await connectToDatabase();

  const role = await Role.findById(id);
  if (!role) {
    throw new Error('Role not found');
  }

  // 1. SYSTEM ROLE PROTECTION & ACCIDENTAL LOCKOUT PREVENTION
  // System role 'super_admin' permissions and core privileges are immutable to prevent system lockout
  if (role.slug === 'super_admin') {
    if (data.permissions !== undefined) {
      throw new Error("Cannot alter permissions of system role 'super_admin': System permissions are immutable to prevent lockout");
    }
    if (data.leadVisibilityScope && data.leadVisibilityScope !== 'company') {
      throw new Error('Super Admin visibility scope must remain company-wide');
    }
    if (data.name && data.name !== role.name) {
      throw new Error("Cannot alter name of system role 'super_admin'");
    }
  }

  // 2. SELF-ESCALATION PREVENTION
  // An actor cannot modify the permissions or scope of their own assigned role
  if (
    actor.roleSlug === role.slug ||
    (actor.roleId && actor.roleId === role._id.toString())
  ) {
    throw new Error('Self-escalation forbidden: You cannot modify your own assigned role');
  }

  // 3. ARBITRARY ASSIGNMENT OF HIGHER PRIVILEGES
  // Non-super_admin actors cannot grant permissions or privileges exceeding their own authority
  if (data.permissions && Array.isArray(data.permissions)) {
    if (data.permissions.length === 0) {
      throw new Error('Role permissions cannot be empty');
    }

    if (actor.roleSlug !== 'super_admin' && actorRole) {
      for (const p of data.permissions) {
        if (!p.module || !Array.isArray(p.actions)) continue;
        for (const action of p.actions) {
          if (!hasPermission(actorRole, p.module, action as PermissionAction)) {
            throw new Error(
              `Privilege escalation forbidden: Cannot grant action '${action}' on module '${p.module}' exceeding your own permissions`
            );
          }
        }
      }
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
