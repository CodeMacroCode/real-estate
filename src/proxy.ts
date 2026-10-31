import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth/constants';
import { verifyAuthToken } from './lib/auth/jwt';

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static resources and internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // CSRF protection: evaluate cookie-authenticated state-changing requests
  const method = request.method.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isStateChanging && token) {
    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Cross-site request rejected by CSRF policy' },
        { status: 403 }
      );
    }

    const host = request.headers.get('host');
    const origin = request.headers.get('origin');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Origin mismatch rejected by CSRF policy' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Invalid Origin header' },
          { status: 403 }
        );
      }
    }
  }

  let isValidSession = false;
  if (token) {
    const payload = await verifyAuthToken(token);
    if (payload && payload.userId) {
      isValidSession = true;
    }
  }

  // Redirect unauthenticated requests to login page
  if (!isValidSession && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated requests away from login page
  if (isValidSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect root path to dashboard or login
  if (pathname === '/') {
    if (isValidSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
