import {
  providers,
  type GenerationInput,
  type GenerationResult,
} from "@/ai/provider";
import { respond } from "./response-agent";
import type { PlannedAction } from "./planner-agent";
import type { Trace } from "@/core/observability/trace";
import {
  reserveQuota,
  settleQuota,
  recordOtherTokens,
} from "@/core/security/quota";
import { tokenCount } from "@/core/rag/normalizer";
import { SYSTEM_PROMPT } from "@/core/security/prompt-injection";
export async function generateAnswer(
  action: PlannedAction,
  userId: string,
  input: GenerationInput,
  trace: Trace,
): Promise<GenerationResult> {
  if (action.type === "CLARIFICATION")
    return {
      text: `${action.reason}${action.options ? "\n" + action.options.map((o, i) => `${i + 1}. ${o}`).join("\n") : ""}`,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    };
  const reserved =
    tokenCount(JSON.stringify(input)) + tokenCount(SYSTEM_PROMPT) + 1800;
  const mock = providers().mock;
  let usage: GenerationResult = {
      text: "",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    },
    reservation = false;
  try {
    if (!mock && (input.sources.length || input.toolResult)) {
      await reserveQuota(userId, reserved);
      reservation = true;
    }
    usage = await trace.stage(
      "Generation",
      {
        provider: mock ? "mock" : "paid",
        sourceCount: input.sources.length,
        hasTool: !!input.toolResult,
      },
      () => respond(input),
    );
  } finally {
    if (reservation) await settleQuota(userId, reserved, usage);
  }
  if (mock) {
    await recordOtherTokens(userId, 0);
    await settleQuota(userId, 0, usage);
  }
  return usage;
}
