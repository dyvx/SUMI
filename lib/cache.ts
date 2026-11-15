type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs = 10 * 60 * 1000) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheKey(...parts: (string | number | undefined)[]) {
  return parts.filter(Boolean).join("|");
}
