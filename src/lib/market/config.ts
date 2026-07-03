import type {
  EtfKlineData,
  EtfKlineQuery,
  IndexValuationData,
  IndexValuationQuery,
  MarketDataProvider,
} from '@/types/market';
import {
  fetchEtfKlineEastMoney,
  fetchEtfKlineSina,
  fetchIndexValuationEastMoney,
} from './providers';

const DAY_MS = 24 * 60 * 60 * 1000;

export const etfKlineProviders: MarketDataProvider<
  EtfKlineQuery,
  EtfKlineData
>[] = [
  {
    name: 'eastmoney',
    rank: 'primary',
    fetch: fetchEtfKlineEastMoney,
  },
  {
    name: 'sina',
    rank: 'backup',
    fetch: fetchEtfKlineSina,
  },
];

/** 指数估值：仅东方财富单源；Spike 未找到独立备源，降级依赖 24h 缓存 + stale 兜底 */
export const indexValuationProviders: MarketDataProvider<
  IndexValuationQuery,
  IndexValuationData
>[] = [
  {
    name: 'eastmoney-valuation',
    rank: 'primary',
    fetch: fetchIndexValuationEastMoney,
  },
];

export function buildEtfKlineCacheKey(query: EtfKlineQuery): string {
  const freq = query.frequency ?? 'daily';
  return `etf-kline:${query.symbol}:${query.exchange}:${freq}:${query.start ?? ''}:${query.end ?? ''}`;
}

export function buildIndexValuationCacheKey(
  query: IndexValuationQuery
): string {
  return `index-valuation:${query.indexCode}:${query.start ?? ''}:${query.end ?? ''}`;
}

export const ETF_KLINE_CACHE_TTL_MS = DAY_MS;
export const INDEX_VALUATION_CACHE_TTL_MS = DAY_MS;
