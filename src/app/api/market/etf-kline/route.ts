import { NextRequest, NextResponse } from 'next/server';
import {
  ETF_KLINE_CACHE_TTL_MS,
  buildEtfKlineCacheKey,
  etfKlineProviders,
} from '@/lib/market/config';
import { fetchWithFallback } from '@/lib/market/fetch-with-fallback';
import { inferExchange } from '@/lib/market/symbol-utils';
import type { EtfKlineQuery, Exchange, KlineFrequency } from '@/types/market';

function parseExchange(value: string | null): Exchange | null {
  if (value === 'SSE' || value === 'SZSE') return value;
  return null;
}

function parseFrequency(value: string | null): KlineFrequency | undefined {
  if (value === 'daily' || value === 'weekly' || value === 'monthly') {
    return value;
  }
  return undefined;
}

/** GET /api/market/etf-kline?symbol=510300&exchange=SSE&start=20240101&end=20241231 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: '缺少 symbol 参数' },
      { status: 400 }
    );
  }

  const exchange =
    parseExchange(searchParams.get('exchange')) ?? inferExchange(symbol);

  const query: EtfKlineQuery = {
    symbol,
    exchange,
    start: searchParams.get('start') ?? undefined,
    end: searchParams.get('end') ?? undefined,
    frequency: parseFrequency(searchParams.get('frequency')),
  };

  const { response, httpStatus } = await fetchWithFallback(query, {
    cacheKey: buildEtfKlineCacheKey,
    cacheTtlMs: ETF_KLINE_CACHE_TTL_MS,
    providers: etfKlineProviders,
  });

  return NextResponse.json(response, { status: httpStatus });
}
