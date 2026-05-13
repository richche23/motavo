/**
 * In-process TTL cache.
 *
 * Notes for production:
 *   - On Vercel, this cache is per-instance. Warm functions share it; cold
 *     starts get a fresh cache. With consistent traffic this is fine.
 *   - For multi-region or higher-volume use, swap the get/set functions for
 *     Vercel KV / Upstash Redis. The interface is identical.
 *   - All TTLs are in milliseconds.
 */

type CacheEntry<T> = {
  value: T;
  expires: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  cache.delete(key);
}

export function cacheClear(): void {
  cache.clear();
}

/**
 * Returns the timestamp at which a cached key was last written (ms since epoch),
 * or 0 if not in cache. Useful for reporting `refreshedAt` to clients.
 */
export function cacheWrittenAt(key: string, ttlMs: number): number {
  const entry = cache.get(key);
  if (!entry) return 0;
  return entry.expires - ttlMs;
}
