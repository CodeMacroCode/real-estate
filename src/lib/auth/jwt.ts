import { SignJWT, jwtVerify } from 'jose';
import { AuthTokenPayload } from '../../types';

export const MIN_AUTH_SECRET_LENGTH = 32;

/**
 * Retrieves and validates the AUTH_SECRET environment variable.
 * Fails safely with an informative error if the secret is missing or insecure (< 32 chars).
 * Never supplies a hardcoded fallback.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET environment variable is missing, empty, or too short (minimum ${MIN_AUTH_SECRET_LENGTH} characters required).`
    );
  }
  return secret.trim();
}

/**
 * Returns true if the AUTH_SECRET environment variable is present and meets the minimum length requirement.
 */
export function isAuthSecretConfigured(): boolean {
  try {
    getAuthSecret();
    return true;
  } catch {
    return false;
  }
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signAuthToken(
  payload: AuthTokenPayload,
  expiresIn: string = '8h'
): Promise<string> {
  const secret = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthTokenPayload;
  } catch {
    return null;
  }
}
