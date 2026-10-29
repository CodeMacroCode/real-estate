import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { modulePermissionSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { recordAuditEvent } from '@/services/auditService';
import { CRMModule, PermissionAction, ModulePermissionConfig } from '@/types';

export const dynamic = 'force-dynamic';

const updateCustomPermissionsSchema = z.object({
  permissions: z.array(modulePermissionSchema),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const isSuperAdmin = authContext.role.slug === 'super_admin';
    const isAdmin = authContext.role.slug === 'admin';

    if (!isSuperAdmin && !isAdmin) {
      return errorResponse('Forbidden: You lack authority to view user permission matrices', 403);
    }

    const targetUser = await User.findById(params.userId).populate('roleId');
    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    const targetRoleSlug = (targetUser.roleId as any)?.slug;

    // Super Admin is immutable
    if (targetRoleSlug === 'super_admin') {
      return errorResponse('Super Admin permissions are complete and immutable', 400);
    }

    // Admin boundary check
    if (isAdmin) {
      if (targetUser.parentAdminId?.toString() !== authContext.user._id.toString()) {
        return errorResponse('Forbidden: You can only view permissions of staff under your administration', 403);
      }
    }

    // Determine the ceiling:
    // If super admin: ceiling is all CRM modules
    // If admin: ceiling is authContext.role.permissions
    const ceilingPermissions = isSuperAdmin
      ? null
      : (authContext.role.permissions || []);

    // Current permissions for targetUser:
    // If customPermissions are present, use those; otherwise fallback to their roleId's default permissions
    const currentPermissions =
      targetUser.customPermissions && targetUser.customPermissions.length > 0
        ? targetUser.customPermissions
        : (targetUser.roleId as any)?.permissions || [];

    return jsonResponse({
      userId: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.roleId,
      permissions: currentPermissions,
      ceilingPermissions,
    });
  } catch (error: any) {
    console.error(`GET /api/permissions/user/${params.userId} error:`, error);
    return errorResponse(error.message || 'Failed to retrieve user permissions', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const isSuperAdmin = authContext.role.slug === 'super_admin';
    const isAdmin = authContext.role.slug === 'admin';

    if (!isSuperAdmin && !isAdmin) {
      return errorResponse('Forbidden: You lack authority to modify permission matrices', 403);
    }

    const body = await req.json();
    const parseResult = updateCustomPermissionsSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid permissions payload structure', 400, parseResult.error.format());
    }

    const targetUser = await User.findById(params.userId).populate('roleId');
    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    const targetRoleSlug = (targetUser.roleId as any)?.slug;
    if (targetRoleSlug === 'super_admin') {
      return errorResponse('Forbidden: Super Admin permissions cannot be restricted', 403);
    }

    // SuperAdmin configuring an Admin
    if (isSuperAdmin) {
      // SuperAdmin has full authority to configure Admin or any staff member
    } else if (isAdmin) {
      // Admin configuring a Sub-Role Staff member
      if (targetUser.parentAdminId?.toString() !== authContext.user._id.toString()) {
        return errorResponse('Forbidden: You can only customize permissions of staff in your directory', 403);
      }

      if (targetRoleSlug === 'admin') {
        return errorResponse('Forbidden: Admins cannot configure other Admin permissions', 403);
      }

      // Check sub-role category authorization
      const allowedSubRoles = authContext.user.allowedSubRoles || [];
      if (!allowedSubRoles.includes(targetRoleSlug)) {
        return errorResponse(`Forbidden: You are not authorized to manage '${targetRoleSlug}' sub-roles`, 403);
      }

      // STRICT CEILING CHECK:
      // Ensure Admin only grants modules and actions that the Admin possesses
      const adminPermissions = authContext.role.permissions || [];
      for (const reqPerm of parseResult.data.permissions) {
        const adminPermForModule = adminPermissions.find((p: any) => p.module === reqPerm.module);
        if (!adminPermForModule) {
          return errorResponse(
            `Forbidden: You cannot grant access to module '${reqPerm.module}' as you do not possess it`,
            403
          );
        }
        for (const action of reqPerm.actions) {
          if (!adminPermForModule.actions.includes(action as PermissionAction)) {
            return errorResponse(
              `Forbidden: You cannot grant action '${action}' on module '${reqPerm.module}' beyond your own authority`,
              403
            );
          }
        }
      }
    }

    const oldPermissions = targetUser.customPermissions;
    targetUser.customPermissions = parseResult.data.permissions as ModulePermissionConfig[];
    await targetUser.save();

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
      },
      action: 'update',
      entity: 'role_permissions',
      entityId: targetUser._id.toString(),
      targetUserId: targetUser._id.toString(),
      parentAdminId: targetUser.parentAdminId ? targetUser.parentAdminId.toString() : undefined,
      oldValues: { permissions: oldPermissions },
      newValues: { permissions: parseResult.data.permissions },
      source: 'web_app',
    });

    return jsonResponse({
      message: 'User permissions matrix successfully updated',
      userId: targetUser._id,
      permissions: targetUser.customPermissions,
    });
  } catch (error: any) {
    console.error(`PUT /api/permissions/user/${params.userId} error:`, error);
    return errorResponse(error.message || 'Failed to update user permissions', 500);
  }
}
