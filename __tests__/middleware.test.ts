/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function createRequest(pathname: string, token?: string): NextRequest {
  const url = new URL(pathname, 'http://localhost');
  if (token !== undefined) url.searchParams.set('token', token);
  return new NextRequest(url);
}

describe('middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows non-view paths without token', async () => {
    process.env.SECRET_TOKEN = 'secret123';
    const req = createRequest('/');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('returns 403 for /view/* without token', async () => {
    process.env.SECRET_TOKEN = 'secret123';
    const req = createRequest('/view/sunburst');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 for /view/* with wrong token', async () => {
    process.env.SECRET_TOKEN = 'secret123';
    const req = createRequest('/view/sunburst', 'wrong');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it('allows /view/* with correct token and sets security headers', async () => {
    process.env.SECRET_TOKEN = 'secret123';
    const req = createRequest('/view/sunburst', 'secret123');
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(res.headers.get('Content-Security-Policy')).toContain('frame-ancestors');
  });

  it('returns 403 when SECRET_TOKEN is not set', async () => {
    delete process.env.SECRET_TOKEN;
    const req = createRequest('/view/sunburst', 'any');
    const res = await middleware(req);
    expect(res.status).toBe(403);
  });
});
