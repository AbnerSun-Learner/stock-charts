import {
  canEnterProtectedRoute,
  getAuthActionLabel,
} from '@/lib/supabase/auth-ui';

describe('auth-ui', () => {
  it('按登录状态返回顶栏操作文案', () => {
    expect(getAuthActionLabel('guest')).toBe('登录');
    expect(getAuthActionLabel('authenticated')).toBe('登出');
  });

  it('未登录时阻止进入受保护入口', () => {
    expect(canEnterProtectedRoute('guest')).toBe(false);
    expect(canEnterProtectedRoute('loading')).toBe(false);
    expect(canEnterProtectedRoute('misconfigured')).toBe(false);
    expect(canEnterProtectedRoute('authenticated')).toBe(true);
  });
});
