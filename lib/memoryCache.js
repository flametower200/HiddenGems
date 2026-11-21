const entries = new Map();
const MAX_CACHE_ENTRIES = 200;

function markRecentlyUsed(key, entry) {
  entries.delete(key);
  entries.set(key, entry);
}

function trimToLimit() {
  while (entries.size > MAX_CACHE_ENTRIES) {
    const oldestResolved = [...entries].find(([, entry]) => !entry.promise);
    if (!oldestResolved) return;
    entries.delete(oldestResolved[0]);
  }
}

function makeRoom() {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (!entry.promise && entry.expiresAt <= now) entries.delete(key);
  }

  while (entries.size >= MAX_CACHE_ENTRIES) {
    const oldestResolved = [...entries].find(([, entry]) => !entry.promise);
    if (!oldestResolved) return;
    entries.delete(oldestResolved[0]);
  }
}

export function getCachedData(key, load, ttlMs = 30000) {
  const existing = entries.get(key);
  if (existing?.promise) {
    markRecentlyUsed(key, existing);
    return existing.promise;
  }
  if (existing && existing.expiresAt > Date.now()) {
    markRecentlyUsed(key, existing);
    return Promise.resolve(existing.value);
  }
  if (existing) entries.delete(key);

  const entry = {};
  const promise = Promise.resolve()
    .then(load)
    .then((value) => {
      if (entries.get(key) === entry) {
        markRecentlyUsed(key, { value, expiresAt: Date.now() + ttlMs });
        trimToLimit();
      }
      return value;
    })
    .catch((error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });

  entry.promise = promise;
  makeRoom();
  entries.set(key, entry);
  return promise;
}

export function invalidateCachedData(prefix) {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
