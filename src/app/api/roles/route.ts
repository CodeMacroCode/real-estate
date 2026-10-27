import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { listRoles } from '@/services/roleService';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const canViewSettings = hasPermission(authContext.role, 'master_settings', 'view');
    const canViewUsers = hasPermission(authContext.role, 'staff_users', 'view');

    if (!canViewSettings && !canViewUsers) {
      return errorResponse('Forbidden: You lack permission to view roles', 403);
    }

    const roles = await listRoles();
    return jsonResponse(roles);
  } catch (error: any) {
    console.error('GET /api/roles error:', error);
    return errorResponse(error.message || 'Failed to retrieve roles', 500);
  }
}
