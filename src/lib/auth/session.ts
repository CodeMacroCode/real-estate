import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from './jwt';
import { connectToDatabase } from '../mongodb/db';
import { User, IUserDocument } from '../../models/User';
import { Role, IRoleDocument } from '../../models/Role';
import { SafeUser } from '../../types';

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
  const token = extractTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  await connectToDatabase();
  const user = await User.findById(payload.userId).populate('roleId');
  if (!user) {
    return null;
  }

  // CRITICAL SECURITY RULE: Deactivated users must not retain ordinary authenticated access
  if (user.status !== 'active') {
    return null;
  }

  const role = user.roleId as unknown as IRoleDocument;
  if (!role) {
    return null;
  }

  const safeUser = user.toSafeUser();
  safeUser.role = role.toObject();

  return {
    user: safeUser,
    role,
  };
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
