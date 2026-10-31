import { NextRequest } from 'next/server';
import {
  getAuthenticatedContext,
  extractTokenFromRequest,
  setSessionCookie,
  setImpersonatorCookie,
  IMPERSONATOR_COOKIE_NAME,
} from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb/db';
import { User } from '@/models/User';
import { signAuthToken } from '@/lib/auth/jwt';
import { jsonResponse, errorResponse } from '@/lib/apiResponse';
import { recordAuditEvent } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    // Only Super Admin or someone already authorized with Super Admin credentials can initiate impersonation
    const isSuperAdmin = authContext.role.slug === 'super_admin';
    if (!isSuperAdmin) {
      return errorResponse('Forbidden: Only Super Administrators can log in as other users', 403);
    }

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return errorResponse('Target user ID is required', 400);
    }

    await connectToDatabase();
    const targetUser = await User.findById(targetUserId).populate('roleId');

    if (!targetUser) {
      return errorResponse('Target user not found', 404);
    }

    if (targetUser.status !== 'active') {
      return errorResponse('Cannot log in as an inactive user', 400);
    }

    const targetRole = targetUser.roleId as any;
    if (!targetRole) {
      return errorResponse('Target user has no valid role assigned', 400);
    }

    // Prevent impersonating another Super Admin
    if (targetRole.slug === 'super_admin') {
      return errorResponse('Forbidden: Cannot impersonate another Super Administrator', 403);
    }

    const currentToken = extractTokenFromRequest(req);
    if (!currentToken) {
      return errorResponse('Session token not found', 401);
    }

    // Sign new JWT token representing the target admin account
    const impersonatedToken = await signAuthToken({
      userId: targetUser._id.toString(),
      employeeId: targetUser.employeeId,
      email: targetUser.email,
      name: targetUser.name,
      roleSlug: targetRole.slug,
      roleId: targetRole._id.toString(),
      department: targetUser.department,
      branch: targetUser.branch,
      team: targetUser.team,
      isImpersonating: true,
      impersonator: {
        userId: authContext.user._id.toString(),
        email: authContext.user.email,
        name: authContext.user.name,
      },
    });

    const safeTargetUser = targetUser.toSafeUser();
    safeTargetUser.role = targetRole.toObject ? targetRole.toObject() : targetRole;
    safeTargetUser.isImpersonating = true;
    safeTargetUser.impersonator = {
      userId: authContext.user._id.toString(),
      email: authContext.user.email,
      name: authContext.user.name,
    };

    // Record audit event
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    await recordAuditEvent({
      actor: {
        userId: authContext.user._id.toString(),
        employeeId: authContext.user.employeeId,
        name: authContext.user.name,
        email: authContext.user.email,
        roleSlug: authContext.role.slug,
      },
      action: 'login',
      entity: 'impersonation',
      entityId: targetUser._id.toString(),
      targetUserId: targetUser._id.toString(),
      source: 'web_app',
      ipAddress,
      userAgent,
      newValues: {
        impersonatedEmail: targetUser.email,
        impersonatedName: targetUser.name,
        impersonatedRole: targetRole.slug,
      },
    });

    const response = jsonResponse({
      message: `Successfully logged in as ${targetUser.name}`,
      user: safeTargetUser,
    });

    // If an impersonator cookie already exists (e.g. nested), preserve original, otherwise store current SuperAdmin token
    const existingImpersonatorCookie = req.cookies.get(IMPERSONATOR_COOKIE_NAME)?.value;
    setImpersonatorCookie(response, existingImpersonatorCookie || currentToken);
    setSessionCookie(response, impersonatedToken);

    return response;
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return errorResponse(error.message || 'Failed to impersonate user', 500);
  }
}
