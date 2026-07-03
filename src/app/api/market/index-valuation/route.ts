import { NextRequest, NextResponse } from 'next/server';
import {
  INDEX_VALUATION_CACHE_TTL_MS,
  buildIndexValuationCacheKey,
  indexValuationProviders,
} from '@/lib/market/config';
import { fetchWithFallback } from '@/lib/market/fetch-with-fallback';
import type { IndexValuationQuery } from '@/types/market';

/** GET /api/market/index-valuation?indexCode=000300&start=20200101
 *  单源（东方财富）；无 provider 级备源，降级仅依赖 24h 缓存与 stale 兜底。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const indexCode = searchParams.get('indexCode');

  if (!indexCode) {
    return NextResponse.json(
      { error: '缺少 indexCode 参数' },
      { status: 400 }
    );
  }

  const query: IndexValuationQuery = {
    indexCode,
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
  };

  const { response, httpStatus } = await fetchWithFallback(query, {
    cacheKey: buildIndexValuationCacheKey,
    cacheTtlMs: INDEX_VALUATION_CACHE_TTL_MS,
    providers: indexValuationProviders,
  });

  return NextResponse.json(response, { status: httpStatus });
}
