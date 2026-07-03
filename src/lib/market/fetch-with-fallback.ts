import type {
  FallbackConfig,
  MarketApiResponseError,
  MarketApiResponseOk,
  ProviderContext,
} from '@/types/market';
import { readCache, readStaleCache, writeCache } from './cache';

export type FetchWithFallbackResult<T> =
  | { httpStatus: 200; response: MarketApiResponseOk<T> }
  | { httpStatus: 503; response: MarketApiResponseError };

/**
 * 主备降级 + 缓存：TTL 内命中缓存直接返回；否则主源失败尝试备源；全失败则返回过期缓存或 503。
 */
export async function fetchWithFallback<TQuery, TData>(
  query: TQuery,
  config: FallbackConfig<TQuery, TData>,
  context?: ProviderContext
): Promise<FetchWithFallbackResult<TData>> {
  const cacheKey = config.cacheKey(query);
  const warnings: string[] = [];

  const cached = readCache<TData>(cacheKey);
  if (cached) {
    return {
      httpStatus: 200,
      response: {
        data: cached.data,
        source: 'cache',
        sourceRank: 'backup',
        timestamp: cached.cachedAt,
        stale: false,
        fallbackUsed: false,
        warnings,
      },
    };
  }

  let fallbackUsed = false;
  let source = 'none';
  let sourceRank: 'primary' | 'backup' = 'primary';
  let data: TData | null = null;

  for (let i = 0; i < config.providers.length; i += 1) {
    const provider = config.providers[i];
    try {
      data = await provider.fetch(query, context);
      source = provider.name;
      sourceRank = provider.rank;
      fallbackUsed = i > 0;
      writeCache(cacheKey, data, config.cacheTtlMs);
      break;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown provider error';
      warnings.push(`${provider.name}: ${message}`);
    }
  }

  const timestamp = new Date().toISOString();

  if (data !== null) {
    return {
      httpStatus: 200,
      response: {
        data,
        source,
        sourceRank,
        timestamp,
        stale: false,
        fallbackUsed,
        warnings,
      },
    };
  }

  const staleEntry = readStaleCache<TData>(cacheKey);
  if (staleEntry) {
    warnings.push(`使用过期缓存，缓存时间 ${staleEntry.cachedAt}`);
    return {
      httpStatus: 200,
      response: {
        data: staleEntry.data,
        source: 'cache',
        sourceRank: 'backup',
        timestamp: staleEntry.cachedAt,
        stale: true,
        fallbackUsed: true,
        warnings,
      },
    };
  }

  return {
    httpStatus: 503,
    response: {
      data: null,
      source: 'none',
      sourceRank: 'backup',
      timestamp,
      stale: true,
      fallbackUsed: warnings.length > 1,
      warnings: [...warnings, '所有数据源不可用且无缓存'],
    },
  };
}
