import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { verifyPassword } from '@/lib/auth/password';
import { signAuthToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { loginSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';
import { parseUserAgent } from '@/lib/auth/deviceParser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const { username, email, password } = parseResult.data as any;
    const loginIdentifier = (username || email || '').trim().toLowerCase();

    await connectToDatabase();

    const user = await User.findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier },
      ],
    }).select('+passwordHash').populate('roleId');

    if (!user || !user.passwordHash) {
      return errorResponse('Invalid username or password', 401);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('Invalid username or password', 401);
    }

    // Check account status
    if (user.status !== 'active') {
      return errorResponse('Account is deactivated. Please contact your system administrator.', 403);
    }

    const role = user.roleId as any;
    if (!role) {
      return errorResponse('User has no valid role assigned', 403);
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    const sessionId = crypto.randomUUID();

    if (!user.sessions) {
      user.sessions = [];
    }

    user.sessions.push({
      sessionId,
      deviceName: deviceInfo.deviceName,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      ipAddress,
      userAgent,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      isActive: true,
    } as any);

    // Keep at most 20 recent sessions
    if (user.sessions.length > 20) {
      user.sessions = user.sessions.slice(-20);
    }

    // Update login status and lastLoginAt
    user.loginStatus = 'online';
    user.lastLoginAt = new Date();
    await user.save();

    // Sign JWT session token
    const token = await signAuthToken({
      userId: user._id.toString(),
      sessionId,
      employeeId: user.employeeId,
      username: user.username,
      email: user.email,
      name: user.name,
      roleSlug: role.slug,
      roleId: role._id.toString(),
      department: user.department,
      branch: user.branch,
      team: user.team,
    });

    const safeUser = user.toSafeUser();
    safeUser.role = role.toObject ? role.toObject() : role;

    // Record audit event
    await recordAuditEvent({
      actor: {
        userId: user._id.toString(),
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        roleSlug: role.slug,
      },
      action: 'login',
      entity: 'session',
      entityId: user._id.toString(),
      source: 'web_app',
      ipAddress,
      userAgent,
    });

    // CRITICAL SECURITY: Do not expose raw JWT in JSON response.
    // The session token is transmitted exclusively in the secure HttpOnly cookie.
    const response = jsonResponse({
      user: safeUser,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'An unexpected error occurred during login', 500);
  }
}
