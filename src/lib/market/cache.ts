interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: string;
}

const store = new Map<string, CacheEntry<unknown>>();

/** 读取缓存，过期返回 null */
export function readCache<T>(key: string): { data: T; cachedAt: string } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return { data: entry.data, cachedAt: entry.cachedAt };
}

/** 读取过期缓存（降级用），TTL 内返回 null */
export function readStaleCache<T>(
  key: string
): { data: T; cachedAt: string } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() <= entry.expiresAt) return null;
  return { data: entry.data, cachedAt: entry.cachedAt };
}

/** 写入缓存 */
export function writeCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    cachedAt: new Date().toISOString(),
  });
}

/** 测试专用：清空缓存 */
export function clearMarketCache(): void {
  store.clear();
}
