import type { PlannedAction } from "@/core/agents/planner-agent";
import type { ConversationState } from "@/core/conversation/conversation-state";
import type { Access } from "@/core/agents/access-agent";
export type Decision = {
  step:
    | "normalize"
    | "memory"
    | "intent"
    | "route"
    | "permission"
    | "context"
    | "validation";
  status: "complete" | "blocked";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reason: string;
};
export function decisions(
  query: string,
  normalized: string,
  state: ConversationState,
  action: PlannedAction,
  access: Access,
): Decision[] {
  const intent = "analytics" in action ? action.analytics : undefined;
  const inherited =
    intent && state.lastAnalyticalIntent
      ? Object.keys(intent.filters).filter(
          (k) =>
            JSON.stringify(intent.filters[k as keyof typeof intent.filters]) ===
            JSON.stringify(
              state.lastAnalyticalIntent?.filters[
                k as keyof typeof intent.filters
              ],
            ),
        )
      : [];
  return [
    {
      step: "normalize",
      status: "complete",
      input: { query },
      output: { normalized },
      reason:
        "Case, accents and whitespace are normalized for search; the original question is preserved.",
    },
    {
      step: "memory",
      status: "complete",
      input: {
        turns: state.recentTurns.length,
        pending: !!state.pendingDisambiguation,
      },
      output: {
        previousIntent: state.lastAnalyticalIntent ?? null,
        matchingPriorFilterKeys: inherited,
      },
      reason:
        "Only the authorized conversation is read. Matching filters are observable; they are not proof of model reasoning.",
    },
    {
      step: "intent",
      status: "complete",
      input: { query },
      output: { action },
      reason:
        "The deterministic Portuguese planner applies documented patterns to produce a validated typed action.",
    },
    {
      step: "route",
      status: "complete",
      input: { action: action.type },
      output: {
        retrieval: action.type === "KNOWLEDGE_RAG" || action.type === "HYBRID",
        tool: !!intent,
      },
      reason:
        action.type === "HYBRID"
          ? "The matched request contains an analytical question and a definition request."
          : action.type === "ANALYTICS_TOOL"
            ? "The matched request needs authorized numerical aggregation."
            : action.type === "CLARIFICATION"
              ? "Required information is missing or an entity is ambiguous."
              : "The matched question requests document evidence.",
    },
    {
      step: "permission",
      status: "complete",
      input: { project: access.projectId, role: access.role },
      output: { dataset: intent?.dataset ?? null, write: access.write },
      reason:
        "Membership and dataset permissions are checked on the server before tool execution.",
    },
  ];
}
