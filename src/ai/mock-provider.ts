import { createHash } from "node:crypto";
import {
  meaningfulWords,
  tokenCount,
  searchNormalize,
} from "@/core/rag/normalizer";
import { isSuspicious } from "@/core/security/prompt-injection";
import type {
  ChatModelProvider,
  EmbeddingProvider,
  GenerationInput,
} from "./provider";
export class MockEmbeddingProvider implements EmbeddingProvider {
  usageTokens = 0;
  readonly model = "mock-hash-256-v2";
  async embedMany(texts: string[]) {
    this.usageTokens = texts.reduce((sum, text) => sum + tokenCount(text), 0);
    return texts.map((text) => {
      const vector = Array<number>(256).fill(0);
      for (const word of meaningfulWords(text)) {
        const hash = createHash("sha256").update(word).digest();
        vector[hash.readUInt16LE(0) % 256] += 1;
      }
      const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
      return vector.map((v) => v / norm);
    });
  }
}
export class MockChatProvider implements ChatModelProvider {
  async generate(input: GenerationInput) {
    const safe = input.sources.filter((s) => !isSuspicious(s.content));
    const terms = meaningfulWords(input.query);
    const knowledge = safe
      .slice(0, 2)
      .map((s) => {
        const paragraphs = s.content
          .replace(/^#+ .*$/gm, "")
          .split(/\n\n/)
          .map((p) => p.trim())
          .filter(Boolean);
        const relevant = paragraphs.filter((p) =>
          terms.some((t) => searchNormalize(p).includes(t)),
        );
        return `${(relevant.length ? relevant : paragraphs).join("\n\n").slice(0, 1000)} [${s.sourceId}]`;
      })
      .join("\n\n");
    const tool = input.toolResult
      ? `Resultado da AnalyticsTool (dados sintéticos):\n${JSON.stringify(input.toolResult, null, 2)}`
      : "";
    const text =
      [tool, knowledge].filter(Boolean).join("\n\n") ||
      "Não encontrei evidência suficiente na base indexada para responder com segurança.";
    return {
      text,
      inputTokens: tokenCount(JSON.stringify(input)),
      outputTokens: tokenCount(text),
      cachedTokens: 0,
    };
  }
}
