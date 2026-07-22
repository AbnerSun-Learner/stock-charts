import type { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from './client';

export interface FamilyAccessResult {
  allowed: boolean;
  session: Session | null;
  user: User | null;
}

/**
 * 发起 GitHub OAuth；完成后回跳 redirectTo（默认当前页）。
 */
export async function signInWithGitHub(redirectTo?: string): Promise<{ error: Error | null }> {
  const supabase = createBrowserSupabaseClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const next = redirectTo ?? (typeof window !== 'undefined' ? window.location.href : '/view/family');
  const callback = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: callback,
    },
  });
  return { error: error ? new Error(error.message) : null };
}

/** 登出当前 session。 */
export async function signOut(): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  await supabase.auth.signOut();
}

/** 获取当前浏览器 session。 */
export async function getBrowserSession(): Promise<Session | null> {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * 调用白名单 RPC；fail-closed（错误/空 → false）。
 */
export async function checkFamilyAccess(
  client?: SupabaseClient
): Promise<FamilyAccessResult> {
  const supabase = client ?? createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { allowed: false, session: null, user: null };
  }

  const { data, error } = await supabase.rpc('is_family_access_allowed');
  if (error || data !== true) {
    return { allowed: false, session, user: session.user };
  }
  return { allowed: true, session, user: session.user };
}
