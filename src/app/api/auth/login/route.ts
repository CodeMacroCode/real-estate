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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const formatted = formatZodError(parseResult.error);
      return errorResponse(formatted.message, 400, formatted.errors);
    }

    const { email, password } = parseResult.data;

    await connectToDatabase();

    const user = await User.findOne({ email }).select('+passwordHash').populate('roleId');

    if (!user || !user.passwordHash) {
      return errorResponse('Invalid email or password', 401);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
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

    // Update login status and lastLoginAt
    user.loginStatus = 'online';
    user.lastLoginAt = new Date();
    await user.save();

    // Sign JWT
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

    const response = jsonResponse({
      user: safeUser,
      token,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'An unexpected error occurred during login', 500);
  }
}
