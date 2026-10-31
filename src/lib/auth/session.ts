import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthToken } from './jwt';
import { connectToDatabase } from '../mongodb/db';
import { User } from '../../models/User';
import { Role, IRoleDocument } from '../../models/Role';
import { SafeUser } from '../../types';
import { validateCsrfProtection } from './csrf';

import { SESSION_COOKIE_NAME } from './constants';
export { SESSION_COOKIE_NAME };

export interface AuthenticatedContext {
  user: SafeUser;
  role: IRoleDocument;
}

export function extractTokenFromRequest(req: NextRequest): string | null {
  // Check cookie first
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    return cookie.value;
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function getAuthenticatedContext(
  req: NextRequest
): Promise<AuthenticatedContext | null> {
  // 1. CSRF Protection for state-changing requests
  const csrfResult = validateCsrfProtection(req);
  if (!csrfResult.valid) {
    console.warn(`CSRF validation blocked request: ${csrfResult.reason}`);
    return null;
  }

  // 2. Token Extraction & Cryptographic Verification
  const token = extractTokenFromRequest(req);
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function verifySessionToken(
  token: string
): Promise<AuthenticatedContext | null> {
  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  // Independent Database Verification of Current Active User & Authoritative Role
  await connectToDatabase();
  const user = await User.findById(payload.userId).populate('roleId');
  if (!user) {
    return null;
  }

  // CRITICAL SECURITY RULE: Deactivated users must not retain authenticated access
  if (user.status !== 'active') {
    return null;
  }

  // Session Revocation Check:
  // If user logged out after this token was issued, reject the session token
  if (user.lastLogoutAt && payload.iat) {
    const tokenIssuedMs = payload.iat * 1000;
    const logoutMs = new Date(user.lastLogoutAt).getTime();
    // Allow 1 second clock variance
    if (tokenIssuedMs < logoutMs - 1000) {
      return null;
    }
  }

  const role = user.roleId as unknown as IRoleDocument;
  if (!role) {
    return null;
  }

  const safeUser = user.toSafeUser();
  safeUser.role = role.toObject ? role.toObject() : (role as any);

  // If user has customized user-centric permissions, overlay them onto role for runtime authorization
  if (user.customPermissions && user.customPermissions.length > 0 && role.slug !== 'super_admin') {
    const effectiveRole: any = {
      ...(role.toObject ? role.toObject() : (role as any)),
      permissions: user.customPermissions,
    };
    safeUser.role = effectiveRole;
    return {
      user: safeUser,
      role: effectiveRole,
    };
  }

  return {
    user: safeUser,
    role: safeUser.role as any,
  };
}

export async function getServerAuthContext(): Promise<AuthenticatedContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return verifySessionToken(token);
  } catch (error) {
    console.error('Failed to get server auth context:', error);
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
