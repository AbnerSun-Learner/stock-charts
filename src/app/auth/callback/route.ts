import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * OAuth 回调：用 code 换 session，再跳回 next。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextRaw = url.searchParams.get('next');
  const next =
    nextRaw &&
    nextRaw.startsWith('/') &&
    !nextRaw.startsWith('//') &&
    !nextRaw.includes('\\') &&
    !nextRaw.includes('://')
      ? nextRaw
      : '/view/family';

  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=missing_code', url.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL('/?auth_error=config', url.origin));
  }

  const cookieStore = cookies();
  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=exchange', url.origin));
  }

  return response;
}
