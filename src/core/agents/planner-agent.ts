import { z } from "zod";
import { intentSchema, type AnalyticsIntent } from "@/core/tools/intent";
import type { ConversationState } from "@/core/conversation/conversation-state";
import { searchNormalize } from "@/core/rag/normalizer";
export const plannedSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("KNOWLEDGE_RAG"), query: z.string() }),
  z.object({ type: z.literal("ANALYTICS_TOOL"), analytics: intentSchema }),
  z.object({
    type: z.literal("HYBRID"),
    knowledgeQuery: z.string(),
    analytics: intentSchema,
  }),
  z.object({
    type: z.literal("CLARIFICATION"),
    reason: z.string(),
    options: z.array(z.string()).optional(),
    pending: intentSchema.optional(),
  }),
]);
export type PlannedAction = z.infer<typeof plannedSchema>;
export function plan(
  query: string,
  state: ConversationState,
  now = new Date(),
): PlannedAction {
  const q = searchNormalize(query),
    prev = state.lastAnalyticalIntent;
  if (state.pendingDisambiguation) {
    const pending = state.pendingDisambiguation;
    const selection = /^\d+$/.test(q.trim())
      ? pending.options[Number(q.trim()) - 1]
      : pending.options.find(
          (o) =>
            q.includes(searchNormalize(o)) ||
            (q.includes("rj") && o.endsWith("RJ")) ||
            (q.includes("sp") && o.endsWith("SP")),
        );
    if (!selection)
      return {
        type: "CLARIFICATION",
        reason: "Escolha uma unidade.",
        options: pending.options,
        pending: pending.intent,
      };
    return plannedSchema.parse({
      type: "ANALYTICS_TOOL",
      analytics: {
        ...pending.intent,
        filters: { ...pending.intent.filters, sites: [selection] },
      },
    });
  }
  const follow = /segunda|segundo|agora|e a |e o /.test(q) && !!prev;
  const knowledge =
    /o que|significa|diferenca|explique|representa|quais datasets/.test(q);
  const analytical =
    /maior|mais ots|menos ots|compare|comparar|volume ontem|atencao ontem|quantos|soma|media|listar|detalhe|por hora|por dia|por genero|por idade/.test(
      q,
    ) || follow;
  if (!analytical || (knowledge && !/maior|compare|qual unidade/.test(q)))
    return plannedSchema.parse({ type: "KNOWLEDGE_RAG", query });
  const metric = /\bvd\b|atencao/.test(q)
    ? "vd"
    : /\bpercent_v\b/.test(q)
      ? "percent_v"
      : /dwell/.test(q)
        ? "dwell_time"
        : /attention_time/.test(q)
          ? "attention_time"
          : /observador/.test(q)
            ? "observers"
            : /volume|\bv\b/.test(q)
              ? "v"
              : /ots/.test(q)
                ? "ots"
                : prev?.metric;
  if (!metric)
    return {
      type: "CLARIFICATION",
      reason: "Qual métrica deseja analisar?",
      options: ["ots", "v", "vd"],
    };
  const intent: AnalyticsIntent = follow
    ? structuredClone(prev!)
    : {
        dataset: /genero|\bidade\b|faixa/.test(q)
          ? "demographics"
          : "ots_by_site",
        metric,
        aggregation: "TOP",
        dimensions: ["site"],
        limit: 10,
        offset: 0,
        filters: {},
      };
  intent.metric = metric;
  if (/compare/.test(q)) intent.aggregation = "COMPARE";
  else if (/quantos|contagem/.test(q)) intent.aggregation = "COUNT";
  else if (/media/.test(q)) intent.aggregation = "AVG";
  else if (/soma|total/.test(q)) intent.aggregation = "SUM";
  else if (/listar/.test(q)) intent.aggregation = "LIST";
  else if (/detalhe/.test(q)) intent.aggregation = "DETAIL";
  if (/genero/.test(q)) {
    intent.dimensions = ["gender"];
    intent.dataset = "demographics";
  }
  if (/faixa|\bidade\b/.test(q)) {
    intent.dimensions = ["age"];
    intent.dataset = "demographics";
  }
  if (/por hora/.test(q)) {
    intent.dimensions = ["hour"];
    intent.dataset = intent.dataset.startsWith("demographics")
      ? "demographics_hourly"
      : "ots_hourly";
  }
  if (/por dia/.test(q)) {
    intent.dimensions = ["day"];
    intent.dataset = intent.dataset.startsWith("demographics")
      ? "demographics_daily"
      : "ots_daily";
  }
  const units = [
    "Loja Centro",
    "Loja Norte",
    "Loja Sul",
    "Loja Oeste",
    "Loja Central SP",
    "Loja Central RJ",
  ].filter((s) => q.includes(searchNormalize(s)));
  if (units.length) intent.filters.sites = units;
  if (/manha/.test(q)) {
    intent.filters.hourStart = 6;
    intent.filters.hourEnd = 11;
  }
  if (/segunda|segundo/.test(q)) {
    intent.offset = 1;
    intent.limit = 1;
  }
  if (/ontem|hoje/.test(q)) {
    const date = new Date(now);
    if (/ontem/.test(q)) date.setDate(date.getDate() - 1);
    intent.filters.start = date.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    intent.filters.end = intent.filters.start;
  }
  const dates = [...q.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
  if (dates.length) {
    intent.filters.start = dates[0];
    intent.filters.end = dates[1] || dates[0];
  }
  const april = q.match(/(\d{1,2})\s*(?:e|a|ate)\s*(\d{1,2})\s+de abril/);
  if (april) {
    intent.filters.start = `${now.getFullYear()}-04-${april[1].padStart(2, "0")}`;
    intent.filters.end = `${now.getFullYear()}-04-${april[2].padStart(2, "0")}`;
  }
  if (/loja central/.test(q) && !units.length)
    return {
      type: "CLARIFICATION",
      reason: "Qual Loja Central?",
      options: ["Loja Central SP", "Loja Central RJ"],
      pending: intent,
    };
  return plannedSchema.parse(
    knowledge
      ? {
          type: "HYBRID",
          knowledgeQuery: `Definição da métrica ${metric}`,
          analytics: intent,
        }
      : { type: "ANALYTICS_TOOL", analytics: intent },
  );
}
