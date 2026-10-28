import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/db';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { verifyPassword } from '@/lib/auth/password';
import { signAuthToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { loginSchema, formatZodError } from '@/lib/validation/schemas';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const { email, password } = parseResult.data;

    // Rate Limiting Enforcement (IP + normalized email)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitKey = `${ip}:${email.toLowerCase()}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.retryAfterSeconds || 60;
      return NextResponse.json(
        {
          success: false,
          error: 'Too many failed login attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email }).select('+passwordHash').populate('roleId');

    if (!user || !user.passwordHash) {
      recordFailedLoginAttempt(rateLimitKey);
      return errorResponse('Invalid email or password', 401);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      recordFailedLoginAttempt(rateLimitKey);
      return errorResponse('Invalid email or password', 401);
    }

    // Check account status
    if (user.status !== 'active') {
      return errorResponse('Account is deactivated. Please contact your system administrator.', 403);
    }

    const role = user.roleId as any;
    if (!role) {
      return errorResponse('User has no valid role assigned', 403);
    }

    // Reset rate limiter on successful authentication
    resetLoginRateLimit(rateLimitKey);

    // Update login status and lastLoginAt
    user.loginStatus = 'online';
    user.lastLoginAt = new Date();
    await user.save();

    // Sign JWT session token
    const token = await signAuthToken({
      userId: user._id.toString(),
      employeeId: user.employeeId,
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
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

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
