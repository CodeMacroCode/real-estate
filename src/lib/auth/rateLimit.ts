interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks whether an actor key (e.g. IP + email) has exceeded login rate limits.
 */
export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - record.attempts };
}

/**
 * Increments failed login attempt counter for an actor key.
 */
export function recordFailedLoginAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { attempts: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    record.attempts += 1;
  }
}

/**
 * Resets failed login attempt counter upon successful authentication.
 */
export function resetLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}

/**
 * Clears all rate limit state (useful in test suites).
 */
export function clearAllRateLimits(): void {
  loginAttempts.clear();
}
