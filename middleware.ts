import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VIEW_PATH_PREFIX = '/view';

console.log('test')

/**
 * 针对 /view/* 路径的中间件，目前只做占位放行，后续可扩展鉴权等逻辑。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(VIEW_PATH_PREFIX)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/view/:path*'],
};
