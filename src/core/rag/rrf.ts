import type { Hit } from "./types";
export function rrf(lists: Hit[][], k = 60): Hit[] {
  if (k <= 0) throw new Error("RRF k must be positive");
  const merged = new Map<string, Hit>();
  for (const list of lists)
    list.forEach((hit, i) => {
      const old = merged.get(hit.id);
      const score = (old?.fusedScore || 0) + 1 / (k + i + 1);
      merged.set(hit.id, {
        ...hit,
        semanticScore: Math.max(old?.semanticScore || 0, hit.semanticScore),
        lexicalScore: Math.max(old?.lexicalScore || 0, hit.lexicalScore),
        fusedScore: score,
        finalScore: score,
      });
    });
  return [...merged.values()]
    .sort((a, b) => b.finalScore - a.finalScore || a.id.localeCompare(b.id))
    .map((h, i) => ({ ...h, rank: i + 1 }));
}
