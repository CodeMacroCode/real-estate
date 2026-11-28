import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

function makeRequest(url: string, host: string) {
  return new NextRequest(url, {
    headers: {
      host,
    },
  });
}

describe('proxy() routing for custom domains vs platform hosts', () => {
  it('redirects unknown paths on a custom domain without session to the custom domain root /', async () => {
    const req = makeRequest('https://9pillars.co.in/properties1/', '9pillars.co.in');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://9pillars.co.in/');
  });

  it('redirects protected CRM paths on a custom domain without session to /login', async () => {
    for (const path of ['/dashboard', '/leads', '/leads/123']) {
      const req = makeRequest(`https://9pillars.co.in${path}`, '9pillars.co.in');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).not.toBeNull();
      const redirectUrl = new URL(location!);
      expect(redirectUrl.pathname).toBe('/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe(path);
    }
  });

  it('redirects unknown paths on a platform host without session to /login', async () => {
    const req = makeRequest('http://localhost:3000/properties1/', 'localhost:3000');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).not.toBeNull();
    const redirectUrl = new URL(location!);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/properties1/');
  });
});
