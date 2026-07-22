import { normalizeOAuthRedirectPath } from '@/lib/supabase/auth';

describe('normalizeOAuthRedirectPath', () => {
  it('未传 redirectTo 时保留当前站内路径、查询和 hash', () => {
    expect(
      normalizeOAuthRedirectPath(undefined, {
        pathname: '/view/family/policies',
        search: '?page=2',
        hash: '#active',
      })
    ).toBe('/view/family/policies?page=2#active');
  });

  it('拒绝站外或非法回跳地址', () => {
    expect(normalizeOAuthRedirectPath('https://evil.example')).toBe('/view/family');
    expect(normalizeOAuthRedirectPath('//evil.example')).toBe('/view/family');
    expect(normalizeOAuthRedirectPath('/\\evil.example')).toBe('/view/family');
  });
});
