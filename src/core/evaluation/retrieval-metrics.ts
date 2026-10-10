export function retrievalMetrics(
  actual: string[],
  expected: string[],
  k: number,
) {
  if (!expected.length)
    return { hitRate: null, precision: null, recall: null, mrr: null };
  const ranked = actual.slice(0, k),
    expectedSet = new Set(expected),
    hits = ranked.filter((s) => expectedSet.has(s)),
    first = ranked.findIndex((s) => expectedSet.has(s));
  return {
    hitRate: hits.length ? 1 : 0,
    precision: hits.length / Math.max(ranked.length, 1),
    recall: new Set(hits).size / expectedSet.size,
    mrr: first < 0 ? 0 : 1 / (first + 1),
  };
}
