import {
  exchangeAuthCode,
  formatAuthUserLabel,
  signInWithGitHub,
} from '@/lib/supabase/auth';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import type { SupabaseClient, User } from '@supabase/supabase-js';

function mockClient(auth: Record<string, jest.Mock>): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

describe('supabase auth helpers', () => {
  it('发起 GitHub OAuth 成功返回授权 URL', async () => {
    if (AUTH_DISABLED) {
      const signInWithOAuth = jest.fn();
      const client = mockClient({ signInWithOAuth });
      const result = await signInWithGitHub(
        client,
        'http://localhost/auth/callback'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('auth_disabled');
      }
      expect(signInWithOAuth).not.toHaveBeenCalled();
      return;
    }

    const signInWithOAuth = jest.fn().mockResolvedValue({
      data: { url: 'https://github.com/login/oauth/authorize?…', provider: 'github' },
      error: null,
    });
    const client = mockClient({ signInWithOAuth });
    const result = await signInWithGitHub(
      client,
      'http://localhost/auth/callback'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.url).toContain('github.com');
    }
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost/auth/callback',
        skipBrowserRedirect: true,
      },
    });
  });

  it('OAuth 无 URL 时返回明确错误', async () => {
    if (AUTH_DISABLED) {
      expect(AUTH_DISABLED).toBe(true);
      return;
    }

    const signInWithOAuth = jest.fn().mockResolvedValue({
      data: { url: null, provider: 'github' },
      error: null,
    });
    const client = mockClient({ signInWithOAuth });
    const result = await signInWithGitHub(
      client,
      'http://localhost/auth/callback'
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('oauth_no_url');
    }
  });

  it('过期会话映射为可恢复错误', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: { message: 'otp_expired', code: 'otp_expired' },
    });
    const client = mockClient({ exchangeCodeForSession });
    const result = await exchangeAuthCode(client, 'bad-code');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('otp_expired');
  });

  it('formatAuthUserLabel 优先 GitHub 用户名', () => {
    const user = {
      id: 'u1',
      email: 'a@b.com',
      user_metadata: { user_name: 'octocat' },
    } as unknown as User;
    expect(formatAuthUserLabel(user)).toBe('octocat');
  });
});
