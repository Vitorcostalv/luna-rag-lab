import type { Hit, Source } from "./types";
export function buildContext(hits: Hit[], budget = 2800): Source[] {
  const seen = new Set<string>(),
    docs = new Set<string>();
  let tokens = 0;
  const diverse = hits.filter((h) => {
    if (docs.has(h.documentId)) return false;
    docs.add(h.documentId);
    return true;
  });
  const remaining = hits.filter((h) => !diverse.some((d) => d.id === h.id));
  const sources: Source[] = [];
  for (const hit of [...diverse, ...remaining]) {
    if (seen.has(hit.content) || tokens + hit.tokenCount + 20 > budget)
      continue;
    seen.add(hit.content);
    tokens += hit.tokenCount + 20;
    sources.push({ ...hit, sourceId: `S${sources.length + 1}` });
  }
  return sources;
}
