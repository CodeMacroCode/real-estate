import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { getUserById, updateUser } from '@/services/userService';
import { updateUserSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { User } from '@/models/User';
import { Role } from '@/models/Role';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'staff_users', 'view')) {
      return errorResponse('Forbidden: You lack permission to view staff user details', 403);
    }

    const user = await getUserById(params.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return jsonResponse(user);
  } catch (error: any) {
    console.error(`GET /api/users/${params.id} error:`, error);
    return errorResponse(error.message || 'Failed to retrieve user', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    // Baseline staff edit permission
    if (!hasPermission(authContext.role, 'staff_users', 'edit')) {
      return errorResponse('Forbidden: You lack permission to update staff users', 403);
    }

    const body = await req.json();
    const parseResult = updateUserSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const existingUser = await User.findById(params.id);
    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Separate ordinary staff editing from privileged role assignment
    if (parseResult.data.roleId && parseResult.data.roleId !== existingUser.roleId.toString()) {
      // 1. Prevent self-escalation
      if (params.id.toString() === authContext.user._id.toString()) {
        return errorResponse('Self-escalation forbidden: You cannot change your own role', 403);
      }

      // 2. Validate role assignment authority
      const isSuperAdmin = authContext.role.slug === 'super_admin';
      const canAssign = hasPermission(authContext.role, 'staff_users', 'assign');

      if (!isSuperAdmin && !canAssign) {
        return errorResponse('Forbidden: You lack permission to assign user roles', 403);
      }

      const newRole = await Role.findById(parseResult.data.roleId);
      if (!newRole) {
        return errorResponse('Assigned role does not exist', 400);
      }

      // 3. Prevent non-super-admin from assigning super_admin
      if (newRole.slug === 'super_admin' && !isSuperAdmin) {
        return errorResponse('Forbidden: Only a Super Admin can assign the Super Admin role', 403);
      }

      // 4. Prevent assigning roles with privileges exceeding actor's own authority
      if (!isSuperAdmin) {
        for (const p of newRole.permissions || []) {
          for (const action of p.actions || []) {
            if (!hasPermission(authContext.role, p.module, action)) {
              return errorResponse('Forbidden: You cannot assign a role with privileges exceeding your own authority', 403);
            }
          }
        }
      }
    }

    const updatedUser = await updateUser(params.id, parseResult.data, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse(updatedUser);
  } catch (error: any) {
    console.error(`PUT /api/users/${params.id} error:`, error);
    const msg = error.message || 'Failed to update user';
    if (msg.includes('forbidden') || msg.includes('Forbidden') || msg.includes('Self-escalation')) {
      return errorResponse(msg, 403);
    }
    if (msg.includes('not found') || msg.includes('Not found')) {
      return errorResponse(msg, 404);
    }
    return errorResponse(msg, 400);
  }
}
