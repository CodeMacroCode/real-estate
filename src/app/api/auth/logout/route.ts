import { NextRequest } from 'next/server';
import { getAuthenticatedContext, clearSessionCookie } from '@/lib/auth/session';
import { User } from '@/models/User';
import { recordAuditEvent } from '@/services/auditService';
import { jsonResponse } from '@/lib/apiResponse';
import { connectToDatabase } from '@/lib/mongodb/db';

export async function POST(req: NextRequest) {
  try {
    let scope: 'current' | 'all' = 'current';
    try {
      const body = await req.json();
      if (body?.scope === 'all') {
        scope = 'all';
      }
    } catch {
      // No JSON body passed (e.g. empty POST request) - default to current or all
    }

    const authContext = await getAuthenticatedContext(req);

    if (authContext) {
      const { user, role, sessionId } = authContext;
      await connectToDatabase();
      const userDoc = await User.findById(user._id);

      if (userDoc) {
        if (scope === 'all' || !sessionId) {
          // Revoke all sessions across all devices
          if (userDoc.sessions && userDoc.sessions.length > 0) {
            userDoc.sessions.forEach((s: any) => {
              s.isActive = false;
            });
          }
          userDoc.loginStatus = 'offline';
          userDoc.lastLogoutAt = new Date();
          await userDoc.save();
        } else {
          // Revoke only the current device session
          if (userDoc.sessions && userDoc.sessions.length > 0) {
            const currentSession = userDoc.sessions.find(
              (s: any) => s.sessionId === sessionId
            );
            if (currentSession) {
              currentSession.isActive = false;
            }
            // Check if user still has other active devices
            const hasOtherActive = userDoc.sessions.some(
              (s: any) => s.isActive && s.sessionId !== sessionId
            );
            userDoc.loginStatus = hasOtherActive ? 'online' : 'offline';
          } else {
            userDoc.loginStatus = 'offline';
            userDoc.lastLogoutAt = new Date();
          }
          await userDoc.save();
        }

        const ipAddress =
          req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          req.headers.get('x-real-ip') ||
          '';
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
    }

    const response = jsonResponse({
      message:
        scope === 'all'
          ? 'Logged out from all devices successfully'
          : 'Logged out from this device successfully',
      scope,
    });
    clearSessionCookie(response);
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = jsonResponse({ message: 'Logged out' });
    clearSessionCookie(response);
    return response;
  }
}
