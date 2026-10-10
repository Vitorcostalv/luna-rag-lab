import { providers } from "@/ai/provider";
import type { GenerationInput } from "@/ai/provider";
import { isSuspicious } from "@/core/security/prompt-injection";
export async function respond(input: GenerationInput) {
  const safe = {
    ...input,
    sources: input.sources.filter((s) => !isSuspicious(s.content)),
  };
  if (!safe.sources.length && !safe.toolResult)
    return {
      text: "Não encontrei evidência suficiente na base indexada para responder com segurança.",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    };
  return providers().chat.generate(safe);
}
