// Tiny in-memory cache with a time-to-live, used in front of Salesforce to save API calls
// (the org has a daily API request limit). It is per server instance: on Vercel each
// serverless instance has its own, which is fine for short TTLs.

const store = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;

  const value = load();
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
  value.catch(() => store.delete(key)); // never cache a failure; concurrent callers share one request
  return value;
}

/** Drops cached entries whose key starts with `prefix`, e.g. after a write so the next read is fresh. */
export function invalidate(prefix: string): void {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
