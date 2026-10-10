const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 20, now = Date.now()) {
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const entry = buckets.get(key) || { count: 0, reset: now + 60000 };
  if (++entry.count > max)
    throw new Error("Rate limit reached. Try again in one minute.");
  buckets.set(key, entry);
}
