import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VIEW_PATH_PREFIX = '/view';

const PREVIEW_BOT_UA_PATTERNS = [
  'Notion',
  'notion.so',
  'notion.com',
  'facebookexternalhit',
  'Twitterbot',
  'Slack',
  'Discord',
  'WhatsApp',
  'TelegramBot',
  'LinkedInBot',
  'embed',
  'crawler',
  'bot',
  'unfurl',
  'preview',
];

function isPreviewBot(userAgent: string | null): boolean {
  if (userAgent === null || userAgent === undefined) return true;
  const trimmed = userAgent.trim();
  if (trimmed === '') return true;
  const ua = trimmed.toLowerCase();
  return PREVIEW_BOT_UA_PATTERNS.some((p) => ua.includes(p.toLowerCase()));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(VIEW_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const token = request.nextUrl.searchParams.get('token');
  const secret = process.env.SECRET_TOKEN;
  const userAgent = request.headers.get('user-agent') ?? null;

  if (!secret || token !== secret) {
    if (isPreviewBot(userAgent)) {
      return NextResponse.next();
    }
    return new NextResponse(null, { status: 403 });
  }

  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://www.notion.so https://notion.so"
  );
  return response;
}

export const config = {
  matcher: ['/view/:path*'],
};
