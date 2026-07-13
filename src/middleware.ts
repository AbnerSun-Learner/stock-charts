import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import { updateSession } from '@/lib/supabase/session';

export async function middleware(request: NextRequest) {
  // TODO(auth): 审阅结束后删除此短路，恢复会话刷新
  if (AUTH_DISABLED) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
