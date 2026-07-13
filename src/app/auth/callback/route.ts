import { NextResponse } from 'next/server';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth / PKCE 回调：用 code 换会话后跳转；失败则导向可恢复错误页。
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  if (AUTH_DISABLED) {
    return NextResponse.redirect(`${origin}/view/dashboard`);
  }

  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');

  let next = searchParams.get('next') ?? '/';
  // 仅允许站内相对路径，拒绝协议相对 URL（//evil）
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    next = '/';
  }

  if (errorCode || errorDescription) {
    const params = new URLSearchParams();
    if (errorCode) {
      params.set('code', errorCode);
    }
    if (errorDescription) {
      params.set('message', errorDescription);
    }
    return NextResponse.redirect(`${origin}/auth/error?${params.toString()}`);
  }

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocal = process.env.NODE_ENV === 'development';
      if (isLocal) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    const params = new URLSearchParams({
      code: error.code ?? 'exchange_failed',
      message: error.message,
    });
    return NextResponse.redirect(`${origin}/auth/error?${params.toString()}`);
  }

  return NextResponse.redirect(
    `${origin}/auth/error?code=missing_code&message=${encodeURIComponent('缺少登录凭证，请重新使用 GitHub 登录')}`
  );
}
