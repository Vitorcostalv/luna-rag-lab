export const categories = [
  "Knowledge Retrieval",
  "Numerical Analytics",
  "Hybrid",
  "Follow-up",
  "Disambiguation",
  "Permissions",
  "Safety",
] as const;
export function evaluationCategory(question: {
  id: string;
  type: string;
  prior?: unknown[];
}) {
  if (question.prior?.length) return "Follow-up";
  if (question.type === "CLARIFICATION") return "Disambiguation";
  if (question.type === "HYBRID") return "Hybrid";
  if (question.type === "ANALYTICS_TOOL") return "Numerical Analytics";
  return "Knowledge Retrieval";
}
export function percentDelta(
  baseline: number | null | undefined,
  current: number | null | undefined,
) {
  if (baseline == null || current == null || baseline === 0) return null;
  return (100 * (current - baseline)) / Math.abs(baseline);
}
