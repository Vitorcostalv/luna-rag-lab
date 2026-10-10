import type { AnalyticsIntent } from "@/core/tools/intent";
export type ConversationState = {
  recentTurns: { role: string; content: string }[];
  lastAction?: string;
  lastAnalyticalIntent?: AnalyticsIntent;
  dataset?: string;
  entity?: string[];
  aggregation?: string;
  filters?: AnalyticsIntent["filters"];
  pendingDisambiguation?: { intent: AnalyticsIntent; options: string[] };
};
export function emptyState(): ConversationState {
  return { recentTurns: [] };
}
export function remember(
  state: ConversationState,
  question: string,
  answer: string,
  intent?: AnalyticsIntent,
): ConversationState {
  return {
    ...state,
    recentTurns: [
      ...state.recentTurns,
      { role: "user", content: question },
      { role: "assistant", content: answer },
    ].slice(-8),
    ...(intent
      ? {
          lastAnalyticalIntent: intent,
          dataset: intent.dataset,
          entity: intent.filters.sites,
          aggregation: intent.aggregation,
          filters: intent.filters,
        }
      : {}),
  };
}
