import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';

export type AuthResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string };

function mapAuthError(error: AuthError | null): AuthResult<never> {
  if (!error) {
    return { ok: false, error: '未知认证错误' };
  }
  const message = error.message.toLowerCase();
  if (
    message.includes('expired') ||
    message.includes('otp_expired') ||
    error.code === 'otp_expired'
  ) {
    return {
      ok: false,
      error: '登录会话已过期，请重新使用 GitHub 登录',
      code: 'otp_expired',
    };
  }
  if (
    message.includes('access_denied') ||
    message.includes('invalid') ||
    error.code === 'otp_disabled'
  ) {
    return {
      ok: false,
      error: 'GitHub 授权失败或已取消，请重试',
      code: 'oauth_denied',
    };
  }
  return { ok: false, error: error.message, code: error.code };
}

/**
 * 发起 GitHub OAuth（PKCE）；成功时返回需跳转的授权 URL。
 * 需在 Supabase Dashboard 启用 GitHub Provider，并配置 Redirect URL。
 */
export async function signInWithGitHub(
  client: SupabaseClient,
  redirectTo: string
): Promise<AuthResult<{ url: string }>> {
  if (AUTH_DISABLED) {
    return {
      ok: false,
      error: '登录已临时关闭（功能审阅）',
      code: 'auth_disabled',
    };
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return mapAuthError(error);
  }
  if (!data.url) {
    return {
      ok: false,
      error: '未能获取 GitHub 授权地址',
      code: 'oauth_no_url',
    };
  }
  return { ok: true, value: { url: data.url } };
}

/** 登出并清理会话 */
export async function signOut(client: SupabaseClient): Promise<AuthResult<null>> {
  const { error } = await client.auth.signOut();
  if (error) {
    return mapAuthError(error);
  }
  return { ok: true, value: null };
}

/** 获取当前用户（优先 getUser，校验服务端会话） */
export async function getCurrentUser(
  client: SupabaseClient
): Promise<AuthResult<User | null>> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    return mapAuthError(error);
  }
  return { ok: true, value: data.user };
}

/** 读取本地会话（刷新后恢复） */
export async function getCurrentSession(
  client: SupabaseClient
): Promise<AuthResult<Session | null>> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    return mapAuthError(error);
  }
  return { ok: true, value: data.session };
}

/** 用回调 code 换会话（OAuth / PKCE） */
export async function exchangeAuthCode(
  client: SupabaseClient,
  code: string
): Promise<AuthResult<Session>> {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return mapAuthError(error);
  }
  return { ok: true, value: data.session };
}

/**
 * @deprecated 使用 exchangeAuthCode；保留别名避免外部引用断裂
 */
export const exchangeMagicLinkCode = exchangeAuthCode;

/** 展示用登录标识：优先 GitHub 用户名，其次邮箱 */
export function formatAuthUserLabel(user: User): string {
  const meta = user.user_metadata ?? {};
  const github =
    (typeof meta.user_name === 'string' && meta.user_name) ||
    (typeof meta.preferred_username === 'string' && meta.preferred_username) ||
    (typeof meta.full_name === 'string' && meta.full_name);
  if (github) {
    return github;
  }
  return user.email ?? user.id;
}
