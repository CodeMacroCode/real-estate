import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { hasPermission } from '@/policies/permissionPolicy';
import { getAuditLogs } from '@/services/auditService';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { AuditAction } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    if (!hasPermission(authContext.role, 'audit_logs', 'view')) {
      return errorResponse('Forbidden: You lack permission to view audit logs', 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const entity = searchParams.get('entity') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const action = (searchParams.get('action') as AuditAction) || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const isSuperAdmin = authContext.role.slug === 'super_admin';
    const isAdmin = authContext.role.slug === 'admin';

    let parentAdminId: string | undefined = undefined;
    let excludeSuperAdmin = false;
    let allowedUserIds: string[] | undefined = undefined;
    let targetUserIdToFilter = userId;

    if (!isSuperAdmin) {
      excludeSuperAdmin = true;
    }

    const scope = searchParams.get('scope') || 'all'; // 'own', 'admin', 'subrole', 'all'
    const adminFilter = searchParams.get('adminId');

    if (isAdmin) {
      if (scope === 'own') {
        // Admin's own logs only
        targetUserIdToFilter = authContext.user._id.toString();
      } else if (userId) {
        // Specific sub-role staff member under this admin
        targetUserIdToFilter = userId;
        parentAdminId = authContext.user._id.toString();
      } else {
        // All activity under this admin (admin + their staff)
        parentAdminId = authContext.user._id.toString();
      }
    } else if (isSuperAdmin) {
      if (scope === 'own') {
        // Superadmin's own logs only
        targetUserIdToFilter = authContext.user._id.toString();
      } else if (adminFilter) {
        if (scope === 'admin') {
          // Exactly that admin's direct logs
          targetUserIdToFilter = adminFilter;
        } else if (userId) {
          // Exactly that subrole staff user
          targetUserIdToFilter = userId;
        } else {
          // Admin + their subroles
          parentAdminId = adminFilter;
        }
      }
    }

    const result = await getAuditLogs({
      page,
      limit,
      entity,
      entityId,
      action,
      userId: targetUserIdToFilter,
      startDate,
      endDate,
      parentAdminId,
      excludeSuperAdmin,
      allowedUserIds,
    });

    return jsonResponse(result.logs, 200, result.pagination);
  } catch (error: any) {
    console.error('GET /api/audit-logs error:', error);
    return errorResponse(error.message || 'Failed to retrieve audit logs', 500);
  }
}
