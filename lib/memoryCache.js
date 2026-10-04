const entries = new Map();

export function getCachedData(key, load, ttlMs = 30000) {
  const existing = entries.get(key);
  if (existing?.promise) return existing.promise;
  if (existing && existing.expiresAt > Date.now()) return Promise.resolve(existing.value);

  const entry = {};
  const promise = Promise.resolve()
    .then(load)
    .then((value) => {
      if (entries.get(key) === entry) {
        entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .catch((error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });

  entry.promise = promise;
  entries.set(key, entry);
  return promise;
}

export function invalidateCachedData(prefix) {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}
