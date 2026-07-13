import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@/lib/supabase/env';

/**
 * 服务端请求级客户端：基于 cookie 读写会话（Magic Link 回调 / RSC）。
 * Next.js 14 的 cookies() 为同步 API。
 */
export function createSupabaseServerClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 中 set 可能只读；中间件会负责刷新会话 cookie
        }
      },
    },
  });
}
