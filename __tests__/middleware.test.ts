/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost'));
}

describe('middleware', () => {
  it('allows non-view paths', async () => {
    const req = createRequest('/');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows /view/* without token', async () => {
    const req = createRequest('/view/sunburst');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});
