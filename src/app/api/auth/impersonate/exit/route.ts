import { NextRequest } from 'next/server';
import {
  verifySessionToken,
  setSessionCookie,
  clearImpersonatorCookie,
  IMPERSONATOR_COOKIE_NAME,
} from '@/lib/auth/session';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const originalToken = req.cookies.get(IMPERSONATOR_COOKIE_NAME)?.value;

    if (!originalToken) {
      return errorResponse('No active impersonation session found to restore', 400);
    }

    // Verify original Super Admin token
    const superAdminContext = await verifySessionToken(originalToken);
    if (!superAdminContext || superAdminContext.role.slug !== 'super_admin') {
      return errorResponse('Invalid or expired Super Administrator session token', 401);
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    await recordAuditEvent({
      actor: {
        userId: superAdminContext.user._id.toString(),
        employeeId: superAdminContext.user.employeeId,
        name: superAdminContext.user.name,
        email: superAdminContext.user.email,
        roleSlug: superAdminContext.role.slug,
      },
      action: 'logout',
      entity: 'impersonation_exit',
      entityId: superAdminContext.user._id.toString(),
      source: 'web_app',
      ipAddress,
      userAgent,
      newValues: {
        restoredEmail: superAdminContext.user.email,
      },
    });

    const response = jsonResponse({
      message: 'Returned to Super Administrator session',
      user: superAdminContext.user,
    });

    // Restore original Super Admin session token and clear the impersonator cookie
    setSessionCookie(response, originalToken);
    clearImpersonatorCookie(response);

    return response;
  } catch (error: any) {
    console.error('Exit impersonation error:', error);
    return errorResponse(error.message || 'Failed to exit impersonation', 500);
  }
}
