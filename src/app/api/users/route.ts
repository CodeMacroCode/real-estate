import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { listUsers, createUser } from '@/services/userService';
import { createUserSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { Role } from '@/models/Role';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'staff_users', 'view')) {
      return errorResponse('Forbidden: You lack permission to view staff users', 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const branch = searchParams.get('branch') || '';
    const roleId = searchParams.get('roleId') || '';
    const status = searchParams.get('status') || '';

    const result = await listUsers({
      page,
      limit,
      search,
      department,
      branch,
      roleId,
      status,
    });

    return jsonResponse(result.users, 200, result.pagination);
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return errorResponse(error.message || 'Failed to retrieve users', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'staff_users', 'create')) {
      return errorResponse('Forbidden: You lack permission to create staff users', 403);
    }

    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    // Role assignment authority validation
    const targetRole = await Role.findById(parseResult.data.roleId);
    if (!targetRole) {
      return errorResponse('Assigned role does not exist', 400);
    }

    const isSuperAdmin = authContext.role.slug === 'super_admin';
    const canAssignRole = hasPermission(authContext.role, 'staff_users', 'assign');

    if (!isSuperAdmin && !canAssignRole) {
      return errorResponse('Forbidden: You lack permission to assign user roles', 403);
    }

    if (targetRole.slug === 'super_admin' && !isSuperAdmin) {
      return errorResponse('Forbidden: Only a Super Admin can assign the Super Admin role', 403);
    }

    if (!isSuperAdmin) {
      for (const p of targetRole.permissions || []) {
        for (const action of p.actions || []) {
          if (!hasPermission(authContext.role, p.module, action)) {
            return errorResponse('Forbidden: You cannot assign a role with privileges exceeding your own authority', 403);
          }
        }
      }
    }

    const newUser = await createUser(parseResult.data, {
      userId: authContext.user._id,
      employeeId: authContext.user.employeeId,
      name: authContext.user.name,
      email: authContext.user.email,
      roleSlug: authContext.role.slug,
    });

    return jsonResponse(newUser, 201);
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    const msg = error.message || 'Failed to create user';
    if (msg.includes('Forbidden') || msg.includes('forbidden')) {
      return errorResponse(msg, 403);
    }
    return errorResponse(msg, 400);
  }
}
