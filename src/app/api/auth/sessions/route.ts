import { NextRequest } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth/session';
import { User } from '@/models/User';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { parseUserAgent } from '@/lib/auth/deviceParser';
import { connectToDatabase } from '@/lib/mongodb/db';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    await connectToDatabase();
    const user = await User.findById(authContext.user._id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    const currentSessionId = authContext.sessionId;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const ua = req.headers.get('user-agent') || '';
    const currentDevice = parseUserAgent(ua);

    let activeSessions: any[] = (user.sessions || [])
      .filter((s: any) => s.isActive)
      .map((s: any) => ({
        sessionId: s.sessionId,
        deviceName: s.deviceName || `${s.os || 'Device'} · ${s.browser || 'Browser'}`,
        browser: s.browser,
        os: s.os,
        deviceType: s.deviceType || 'desktop',
        ipAddress: s.ipAddress || ip,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        isCurrentDevice: Boolean(currentSessionId && s.sessionId === currentSessionId),
      }));

    // If no active sessions recorded yet (e.g. legacy token), create a fallback entry for current device
    if (activeSessions.length === 0) {
      activeSessions.push({
        sessionId: currentSessionId || 'current-session',
        deviceName: currentDevice.deviceName,
        browser: currentDevice.browser,
        os: currentDevice.os,
        deviceType: currentDevice.deviceType,
        ipAddress: ip,
        lastActiveAt: new Date(),
        createdAt: user.lastLoginAt || new Date(),
        isCurrentDevice: true,
      });
    } else {
      // If none was flagged as current device, flag the most recent one or match by ip/device
      const hasCurrent = activeSessions.some((s) => s.isCurrentDevice);
      if (!hasCurrent && activeSessions.length > 0) {
        // Find best match or default to latest
        const match = activeSessions.find(
          (s) => s.browser === currentDevice.browser && s.os === currentDevice.os
        );
        if (match) {
          match.isCurrentDevice = true;
        } else {
          activeSessions[activeSessions.length - 1].isCurrentDevice = true;
        }
      }
    }

    // Sort: current device first, then most recently active
    activeSessions.sort((a, b) => {
      if (a.isCurrentDevice) return -1;
      if (b.isCurrentDevice) return 1;
      return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
    });

    return jsonResponse({
      sessions: activeSessions,
      totalDevices: activeSessions.length,
    });
  } catch (error: any) {
    console.error('Fetch sessions error:', error);
    return errorResponse(error.message || 'Failed to fetch device sessions', 500);
  }
}
