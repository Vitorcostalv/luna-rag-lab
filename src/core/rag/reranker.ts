import { words, meaningfulWords } from "./normalizer";
import type { Hit } from "./types";
export interface Reranker {
  rerank(query: string, hits: Hit[]): Promise<Hit[]>;
}
export class HeuristicReranker implements Reranker {
  async rerank(query: string, hits: Hit[]) {
    const terms = [...new Set(meaningfulWords(query))];
    return hits
      .map((h) => {
        const tokens = new Set(words(`${h.heading} ${h.title} ${h.content}`));
        const score = terms.length
          ? terms.filter((t) => tokens.has(t)).length / terms.length
          : 0;
        return { ...h, rerankScore: score, finalScore: score + h.fusedScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((h, i) => ({ ...h, rank: i + 1 }));
  }
}
