import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VIEW_PATH_PREFIX = '/view';

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
