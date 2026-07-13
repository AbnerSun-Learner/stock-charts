import {
  getSupabasePublicConfig,
  normalizeSupabaseUrl,
  SupabaseConfigError,
  tryGetSupabasePublicConfig,
} from '@/lib/supabase/env';

describe('supabase env', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishable;
  });

  it('规范化去掉 /rest/v1 后缀', () => {
    expect(
      normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/')
    ).toBe('https://abc.supabase.co');
  });

  it('缺失配置时抛明确错误', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(tryGetSupabasePublicConfig()).toBeNull();
    expect(() => getSupabasePublicConfig()).toThrow(SupabaseConfigError);
  });

  it('读取公开配置', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co/rest/v1';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
    expect(getSupabasePublicConfig()).toEqual({
      url: 'https://abc.supabase.co',
      anonKey: 'anon-test',
    });
  });
});
