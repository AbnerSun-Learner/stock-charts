import { clearMarketCache, readStaleCache, writeCache } from '@/lib/market/cache';
import { fetchWithFallback } from '@/lib/market/fetch-with-fallback';
import type { MarketDataProvider } from '@/types/market';

interface MockQuery {
  id: string;
}

interface MockData {
  value: string;
}

describe('fetchWithFallback', () => {
  beforeEach(() => {
    clearMarketCache();
  });

  it('TTL 内命中 fresh 缓存时不请求 provider', async () => {
    writeCache('mock:fresh', { value: 'cached-fresh' }, 60_000);

    const fetchSpy = jest.fn(async () => ({ value: 'from-provider' }));
    const provider: MarketDataProvider<MockQuery, MockData> = {
      name: 'primary',
      rank: 'primary',
      fetch: fetchSpy,
    };

    const { response, httpStatus } = await fetchWithFallback(
      { id: 'fresh' },
      {
        cacheKey: q => `mock:${q.id}`,
        cacheTtlMs: 60_000,
        providers: [provider],
      }
    );

    expect(httpStatus).toBe(200);
    expect(response.data.value).toBe('cached-fresh');
    expect(response.stale).toBe(false);
    expect(response.source).toBe('cache');
    expect(response.fallbackUsed).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('主源失败时降级备源且 fallbackUsed = true', async () => {
    const primary: MarketDataProvider<MockQuery, MockData> = {
      name: 'primary',
      rank: 'primary',
      fetch: async () => {
        throw new Error('primary down');
      },
    };
    const backup: MarketDataProvider<MockQuery, MockData> = {
      name: 'backup',
      rank: 'backup',
      fetch: async () => ({ value: 'from-backup' }),
    };

    const { response, httpStatus } = await fetchWithFallback(
      { id: 'test-1' },
      {
        cacheKey: q => `mock:${q.id}`,
        cacheTtlMs: 60_000,
        providers: [primary, backup],
      }
    );

    expect(httpStatus).toBe(200);
    expect(response.data.value).toBe('from-backup');
    expect(response.fallbackUsed).toBe(true);
    expect(response.source).toBe('backup');
    expect(response.stale).toBe(false);
    expect(response.warnings[0]).toContain('primary down');
  });

  it('所有源失败但有 stale 缓存时返回 stale = true', async () => {
    writeCache('mock:cached', { value: 'cached-data' }, -1000);

    const stale = readStaleCache<MockData>('mock:cached');
    expect(stale).not.toBeNull();

    const failing: MarketDataProvider<MockQuery, MockData> = {
      name: 'fail',
      rank: 'primary',
      fetch: async () => {
        throw new Error('all down');
      },
    };

    const { response, httpStatus } = await fetchWithFallback(
      { id: 'cached' },
      {
        cacheKey: q => `mock:${q.id}`,
        cacheTtlMs: 60_000,
        providers: [failing],
      }
    );

    expect(httpStatus).toBe(200);
    expect(response.data.value).toBe('cached-data');
    expect(response.stale).toBe(true);
    expect(response.source).toBe('cache');
  });

  it('所有源失败且无缓存时返回 503', async () => {
    const failing: MarketDataProvider<MockQuery, MockData> = {
      name: 'fail-a',
      rank: 'primary',
      fetch: async () => {
        throw new Error('a down');
      },
    };
    const failingB: MarketDataProvider<MockQuery, MockData> = {
      name: 'fail-b',
      rank: 'backup',
      fetch: async () => {
        throw new Error('b down');
      },
    };

    const { httpStatus, response } = await fetchWithFallback(
      { id: 'no-cache' },
      {
        cacheKey: q => `mock:${q.id}`,
        cacheTtlMs: 60_000,
        providers: [failing, failingB],
      }
    );

    expect(httpStatus).toBe(503);
    expect(response.data).toBeNull();
    expect(response.stale).toBe(true);
    expect(response.warnings.some(w => w.includes('所有数据源不可用'))).toBe(
      true
    );
  });
});
