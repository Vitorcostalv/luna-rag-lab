import type { Source } from "@/core/rag/types";
import { MockChatProvider, MockEmbeddingProvider } from "./mock-provider";
import { OpenAIAdapter } from "./openai-provider";
export type GenerationInput = {
  query: string;
  sources: Source[];
  toolResult?: unknown;
  history: { role: string; content: string }[];
};
export type GenerationResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
};
export interface ChatModelProvider {
  generate(input: GenerationInput): Promise<GenerationResult>;
}
export interface EmbeddingProvider {
  readonly model: string;
  usageTokens: number;
  embedMany(texts: string[]): Promise<number[][]>;
}
export function providers(): {
  chat: ChatModelProvider;
  embedding: EmbeddingProvider;
  mock: boolean;
} {
  const kind = process.env.AI_PROVIDER || "mock";
  if (kind === "mock")
    return {
      chat: new MockChatProvider(),
      embedding: new MockEmbeddingProvider(),
      mock: true,
    };
  if (kind !== "openai" && kind !== "gateway")
    throw new Error("Unknown AI_PROVIDER");
  const adapter = new OpenAIAdapter(kind);
  return { chat: adapter, embedding: adapter, mock: false };
}
