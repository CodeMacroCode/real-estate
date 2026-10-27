import { SignJWT, jwtVerify } from 'jose';
import { AuthTokenPayload } from '../../types';

const AUTH_SECRET = process.env.AUTH_SECRET || 'real-estate-crm-jwt-secret-key-32-chars-long-secure-key';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(AUTH_SECRET);
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
  } catch (error) {
    return null;
  }
}
