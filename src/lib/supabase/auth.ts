import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

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
      error: '登录链接已过期，请重新发送 Magic Link',
      code: 'otp_expired',
    };
  }
  if (message.includes('invalid') || error.code === 'otp_disabled') {
    return {
      ok: false,
      error: '登录链接无效，请重新发送 Magic Link',
      code: 'invalid_link',
    };
  }
  return { ok: false, error: error.message, code: error.code };
}

/**
 * 发送邮箱 Magic Link（Phase 1 不做 OAuth）。
 */
export async function sendMagicLink(
  client: SupabaseClient,
  email: string,
  emailRedirectTo: string
): Promise<AuthResult<{ emailed: true }>> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) {
    return { ok: false, error: '请输入有效邮箱', code: 'invalid_email' };
  }

  const { error } = await client.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return mapAuthError(error);
  }
  return { ok: true, value: { emailed: true } };
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

/** 用回调 code 换会话 */
export async function exchangeMagicLinkCode(
  client: SupabaseClient,
  code: string
): Promise<AuthResult<Session>> {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return mapAuthError(error);
  }
  return { ok: true, value: data.session };
}
