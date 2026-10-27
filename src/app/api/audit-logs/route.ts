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

    const result = await getAuditLogs({
      page,
      limit,
      entity,
      entityId,
      action,
      userId,
      startDate,
      endDate,
    });

    return jsonResponse(result.logs, 200, result.pagination);
  } catch (error: any) {
    console.error('GET /api/audit-logs error:', error);
    return errorResponse(error.message || 'Failed to retrieve audit logs', 500);
  }
}
