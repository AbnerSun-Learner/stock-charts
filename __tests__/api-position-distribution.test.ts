/**
 * @jest-environment node
 */
import { GET } from '@/app/api/chart/position-distribution/route';

describe('GET /api/chart/position-distribution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 200 and JSON with name, date, children when fallback file exists', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('date');
    expect(body).toHaveProperty('children');
    expect(Array.isArray(body.children)).toBe(true);
  });
});
