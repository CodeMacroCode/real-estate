import { NextRequest } from 'next/server';
import { getAuthenticatedContext, clearSessionCookie } from '@/lib/auth/session';
import { User } from '@/models/User';
import { recordAuditEvent } from '@/services/auditService';
import { jsonResponse } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);

    if (authContext) {
      const { user, role } = authContext;
      // Revoke all existing sessions by recording lastLogoutAt
      await User.findByIdAndUpdate(user._id, {
        loginStatus: 'offline',
        lastLogoutAt: new Date(),
      });

      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
      const userAgent = req.headers.get('user-agent') || '';

      await recordAuditEvent({
        actor: {
          userId: user._id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          roleSlug: role.slug,
        },
        action: 'logout',
        entity: 'session',
        entityId: user._id || '',
        source: 'web_app',
        ipAddress,
        userAgent,
      });
    }

    const response = jsonResponse({ message: 'Logged out successfully' });
    clearSessionCookie(response);
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = jsonResponse({ message: 'Logged out' });
    clearSessionCookie(response);
    return response;
  }
}
