import type { Hit, Source } from "@/core/rag/types";
export function analyzeQuality(
  chunks: { id: string; content: string; tokenCount: number }[],
  hits: Hit[] = [],
  sources: Source[] = [],
) {
  const duplicates = chunks
    .filter((c, i) => chunks.findIndex((x) => x.content === c.content) < i)
    .map((c) => c.id);
  const small = chunks.filter((c) => c.tokenCount < 30).map((c) => c.id),
    large = chunks.filter((c) => c.tokenCount > 1000).map((c) => c.id);
  const redundant = sources.filter(
    (s, i) => sources.findIndex((x) => x.content === s.content) < i,
  ).length;
  const weak = hits.filter(
    (h) => h.semanticScore < 0.1 && h.lexicalScore === 0,
  ).length;
  const disagreement = hits.filter(
    (h) => h.semanticScore > 0 !== h.lexicalScore > 0,
  ).length;
  return {
    measurements: {
      chunks: chunks.length,
      smallChunks: small.length,
      largeChunks: large.length,
      duplicateChunks: duplicates.length,
      redundantContext: redundant,
      weakCandidates: weak,
      lexicalSemanticDisagreement: disagreement,
      noEvidence: !sources.length,
    },
    details: { small, large, duplicates },
    suggestions: [
      ...(small.length
        ? [
            "Inspect short chunks for lost context; compare larger chunks in an isolated experiment.",
          ]
        : []),
      ...(large.length
        ? ["Inspect long chunks for topic mixing; compare smaller chunks."]
        : []),
      ...(duplicates.length || redundant
        ? ["Deduplicate repeated content and inspect source diversity."]
        : []),
      ...(weak
        ? [
            "Inspect weak candidate scores before lowering the retrieval threshold.",
          ]
        : []),
      ...(!sources.length
        ? [
            "No document context in this run. Inspect tool routing or evidence availability before answering.",
          ]
        : []),
      ...(disagreement
        ? [
            "Lexical and semantic scores disagree for some candidates; compare both ranked lists. Zero scores can also mean absence from a candidate list.",
          ]
        : []),
    ],
    note: "Thresholds are inspection heuristics, not semantic quality judgments. Counts describe these exact chunks and this run.",
  };
}
