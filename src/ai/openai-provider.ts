import { createOpenAI } from "@ai-sdk/openai";
import { generateText, embedMany, gateway } from "ai";
import { SYSTEM_PROMPT } from "@/core/security/prompt-injection";
import type {
  ChatModelProvider,
  EmbeddingProvider,
  GenerationInput,
} from "./provider";
export class OpenAIAdapter implements ChatModelProvider, EmbeddingProvider {
  usageTokens = 0;
  readonly model: string;
  constructor(private kind: "openai" | "gateway") {
    this.model =
      kind === "openai"
        ? process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
        : process.env.GATEWAY_EMBEDDING_MODEL || "";
  }
  private openai() {
    if (!process.env.OPENAI_API_KEY)
      throw new Error("Configure OPENAI_API_KEY for real AI.");
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  async embedMany(texts: string[]) {
    const model =
      this.kind === "openai"
        ? this.openai().embedding(this.model)
        : gateway.embeddingModel(this.model);
    const result = await embedMany({
      model,
      values: texts,
      providerOptions: { openai: { dimensions: 256 } },
    });
    this.usageTokens = result.usage.tokens;
    if (result.embeddings.some((e) => e.length !== 256))
      throw new Error("Embedding model must support 256 dimensions");
    return result.embeddings;
  }
  async generate(input: GenerationInput) {
    const name =
      this.kind === "openai"
        ? process.env.OPENAI_CHAT_MODEL
        : process.env.GATEWAY_CHAT_MODEL;
    if (!name)
      throw new Error("Configure a chat model for the selected AI provider.");
    const model =
      this.kind === "openai" ? this.openai().responses(name) : gateway(name);
    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(input),
      maxOutputTokens: 1200,
    });
    const cachedTokens = result.usage.inputTokenDetails.cacheReadTokens || 0;
    return {
      text: result.text,
      inputTokens: Math.max(0, (result.usage.inputTokens || 0) - cachedTokens),
      outputTokens: result.usage.outputTokens || 0,
      cachedTokens,
    };
  }
}
