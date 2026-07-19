import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * 读取公开 Supabase 环境变量；缺失时抛出明确错误。
 */
export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      '缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，无法连接共享行情库'
    );
  }
  return { url, anonKey };
}

/**
 * 浏览器端单例 anon client（无用户会话）。
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }
  const { url, anonKey } = getSupabasePublicConfig();
  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return browserClient;
}

/**
 * Server Component / Route Handler 用的 anon client。
 */
export function createServerSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
