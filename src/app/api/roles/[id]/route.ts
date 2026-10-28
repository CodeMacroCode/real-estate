import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { getRoleById, updateRole } from '@/services/roleService';
import { updateRoleSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

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

    const canViewSettings = hasPermission(authContext.role, 'master_settings', 'view');
    const canViewUsers = hasPermission(authContext.role, 'staff_users', 'view');

    if (!canViewSettings && !canViewUsers) {
      return errorResponse('Forbidden: You lack permission to view role details', 403);
    }

    const role = await getRoleById(params.id);
    if (!role) {
      return errorResponse('Role not found', 404);
    }

    return jsonResponse(role);
  } catch (error: any) {
    console.error(`GET /api/roles/${params.id} error:`, error);
    return errorResponse(error.message || 'Failed to retrieve role', 500);
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

    // Role-grant changes require a specific authorized administrative principal (Super Admin)
    // or distinct role-management authorization (system_settings: edit)
    const isSuperAdminPrincipal = authContext.role.slug === 'super_admin';
    const hasRoleManagementPerm = hasPermission(authContext.role, 'system_settings', 'edit');

    if (!isSuperAdminPrincipal && !hasRoleManagementPerm) {
      return errorResponse('Forbidden: Modifying role grants requires authorized administrative privileges', 403);
    }

    const body = await req.json();
    const parseResult = updateRoleSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const updatedRole = await updateRole(
      params.id,
      parseResult.data as any,
      {
        userId: authContext.user._id,
        employeeId: authContext.user.employeeId,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
        roleId: authContext.role._id?.toString(),
      },
      authContext.role
    );

    return jsonResponse(updatedRole);
  } catch (error: any) {
    console.error(`PUT /api/roles/${params.id} error:`, error);
    const msg = error.message || 'Failed to update role';
    if (msg.includes('forbidden') || msg.includes('Forbidden') || msg.includes('Cannot alter permissions of system role')) {
      return errorResponse(msg, 403);
    }
    if (msg.includes('not found') || msg.includes('Not found')) {
      return errorResponse(msg, 404);
    }
    return errorResponse(msg, 400);
  }
}
