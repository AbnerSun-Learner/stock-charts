import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from '@/lib/supabase/env';

/**
 * 刷新 Auth cookie；Phase 1 不强制全站登录拦截（Dashboard 在 Phase 2 接 AuthGate）。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  try {
    const { url, anonKey } = getSupabasePublicConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    // 必须调用以触发 token 刷新写回 cookie
    await supabase.auth.getUser();
  } catch {
    // 配置缺失时不阻断公开页面
  }

  return response;
}
