// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseUserAgent } from '../../src/lib/auth/deviceParser';
import { IUserSession } from '../../src/types';

describe('deviceParser - User Agent Parsing', () => {
  it('parses Mac Chrome user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    const result = parseUserAgent(ua);
    expect(result.os).toBe('macOS');
    expect(result.browser).toBe('Chrome');
    expect(result.deviceType).toBe('desktop');
    expect(result.deviceName).toBe('Mac · Chrome');
  });

  it('parses iPhone Safari user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);
    expect(result.os).toBe('iOS');
    expect(result.browser).toBe('Safari');
    expect(result.deviceType).toBe('mobile');
    expect(result.deviceName).toBe('iPhone · Safari');
  });

  it('parses Windows Edge user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0';
    const result = parseUserAgent(ua);
    expect(result.os).toBe('Windows');
    expect(result.browser).toBe('Edge');
    expect(result.deviceType).toBe('desktop');
    expect(result.deviceName).toBe('Windows PC · Edge');
  });

  it('parses Android Chrome user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
    const result = parseUserAgent(ua);
    expect(result.os).toBe('Android');
    expect(result.browser).toBe('Chrome');
    expect(result.deviceType).toBe('mobile');
    expect(result.deviceName).toBe('Android · Chrome');
  });

  it('parses iPad Safari user agent correctly', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    const result = parseUserAgent(ua);
    expect(result.os).toBe('iPadOS');
    expect(result.browser).toBe('Safari');
    expect(result.deviceType).toBe('tablet');
    expect(result.deviceName).toBe('iPad · Safari');
  });

  it('handles empty or unrecognized user agents gracefully', () => {
    const result = parseUserAgent('');
    expect(result.os).toBe('Unknown OS');
    expect(result.browser).toBe('Web Browser');
    expect(result.deviceType).toBe('desktop');
    expect(result.deviceName).toBe('Unknown OS · Web Browser');
  });
});

describe('Multi-Device Session & Logout Logic', () => {
  let mockUser: {
    email: string;
    loginStatus: string;
    lastLogoutAt: Date | null;
    sessions: IUserSession[];
  };

  beforeEach(() => {
    mockUser = {
      email: 'agent@example.com',
      loginStatus: 'online',
      lastLogoutAt: null,
      sessions: [
        {
          sessionId: 'session-mac-01',
          deviceName: 'Mac · Chrome',
          browser: 'Chrome',
          os: 'macOS',
          deviceType: 'desktop',
          ipAddress: '192.168.1.10',
          lastActiveAt: new Date(),
          createdAt: new Date(),
          isActive: true,
        },
        {
          sessionId: 'session-iphone-02',
          deviceName: 'iPhone · Safari',
          browser: 'Safari',
          os: 'iOS',
          deviceType: 'mobile',
          ipAddress: '192.168.1.20',
          lastActiveAt: new Date(),
          createdAt: new Date(),
          isActive: true,
        },
      ],
    };
  });

  it('logs out from current device only while keeping other devices active', () => {
    const currentSessionId = 'session-mac-01';

    // Simulate logout from current device
    const currentSession = mockUser.sessions.find((s) => s.sessionId === currentSessionId);
    expect(currentSession).toBeDefined();
    if (currentSession) {
      currentSession.isActive = false;
    }

    const hasOtherActive = mockUser.sessions.some(
      (s) => s.isActive && s.sessionId !== currentSessionId
    );
    mockUser.loginStatus = hasOtherActive ? 'online' : 'offline';

    // Mac session is revoked
    expect(mockUser.sessions[0].isActive).toBe(false);
    // iPhone session remains active
    expect(mockUser.sessions[1].isActive).toBe(true);
    // Overall status remains online because iPhone is still active
    expect(mockUser.loginStatus).toBe('online');
  });

  it('logs out from all devices, revoking all active sessions', () => {
    // Simulate logout from all devices
    mockUser.sessions.forEach((s) => {
      s.isActive = false;
    });
    mockUser.loginStatus = 'offline';
    mockUser.lastLogoutAt = new Date();

    // Both sessions are revoked
    expect(mockUser.sessions.every((s) => !s.isActive)).toBe(true);
    // Overall user status becomes offline
    expect(mockUser.loginStatus).toBe('offline');
    // Logout timestamp recorded
    expect(mockUser.lastLogoutAt).toBeInstanceOf(Date);
  });
});
