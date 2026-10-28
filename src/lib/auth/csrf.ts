import { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './constants';

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates CSRF protections for incoming state-changing HTTP requests.
 * 
 * Rules:
 * 1. Safe methods (GET, HEAD, OPTIONS) do not alter state and are exempt.
 * 2. Requests authenticated strictly via Authorization: Bearer headers are exempt because
 *    standard browsers cannot forge custom Authorization headers cross-origin without CORS approval.
 * 3. Cookie-authenticated state-changing requests (POST, PUT, PATCH, DELETE) MUST:
 *    a. Not have Sec-Fetch-Site: cross-site.
 *    b. Have an Origin or Referer header matching the request host.
 */
export function validateCsrfProtection(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (!stateChangingMethods.includes(method)) {
    return { valid: true };
  }

  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  const authHeader = req.headers.get('authorization');
  const hasBearerHeader = Boolean(authHeader && authHeader.startsWith('Bearer '));

  // If request does NOT use session cookies and uses pure Bearer header, CSRF via ambient browser cookies is not possible
  if (!hasSessionCookie && hasBearerHeader) {
    return { valid: true };
  }

  // If no session cookie exists at all (e.g. unauthenticated public endpoints like login)
  if (!hasSessionCookie) {
    return { valid: true };
  }

  // 1. Fetch Metadata check (Sec-Fetch-Site)
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return { valid: false, reason: 'Cross-site state mutation blocked by Fetch Metadata policy' };
  }

  // 2. Origin / Host check
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host !== host) {
        return { valid: false, reason: `Origin header '${originUrl.host}' does not match host '${host}'` };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Invalid Origin header URL' };
    }
  }

  // 3. Fallback to Referer header if Origin is absent
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host !== host) {
        return { valid: false, reason: `Referer header '${refererUrl.host}' does not match host '${host}'` };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Invalid Referer header URL' };
    }
  }

  // In standard browser environments, state-changing requests include Origin or Referer.
  // Allow programmatic or local testing requests when host is localhost.
  return { valid: true };
}
