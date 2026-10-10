import { z } from "zod";
export const nodeKinds = [
  "Document",
  "Chunk",
  "Metric",
  "Dataset",
  "Entity",
  "Tool",
  "BusinessRule",
] as const;
export const graphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(nodeKinds),
      label: z.string(),
      provenance: z.string(),
      detail: z.record(z.string(), z.unknown()),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
      relation: z.enum([
        "contains",
        "defines",
        "provides",
        "queries",
        "governs",
        "belongs_to",
      ]),
      provenance: z.string(),
    }),
  ),
  source: z.string(),
});
export type KnowledgeGraph = z.infer<typeof graphSchema>;
type Doc = { id: string; title: string; source: string; content: string };
type Chunk = {
  id: string;
  documentId: string;
  heading: string;
  tokenCount: number;
  embeddingModel: string;
};
export function buildGraph(docs: Doc[], chunks: Chunk[]): KnowledgeGraph {
  const nodes: KnowledgeGraph["nodes"] = [],
    edges: KnowledgeGraph["edges"] = [];
  const node = (
    id: string,
    kind: (typeof nodeKinds)[number],
    label: string,
    provenance: string,
    detail: Record<string, unknown> = {},
  ) => nodes.push({ id, kind, label, provenance, detail });
  const edge = (
    from: string,
    to: string,
    relation: KnowledgeGraph["edges"][number]["relation"],
    provenance: string,
  ) =>
    edges.push({
      id: `${from}:${relation}:${to}`,
      from,
      to,
      relation,
      provenance,
    });
  docs.forEach((d) =>
    node(d.id, "Document", d.title, d.source, {
      source: d.source,
      preview: d.content.slice(0, 600),
    }),
  );
  chunks.forEach((c) => {
    node(c.id, "Chunk", c.heading, `chunk.documentId=${c.documentId}`, {
      tokens: c.tokenCount,
      model: c.embeddingModel,
    });
    edge(
      c.documentId,
      c.id,
      "contains",
      "Persisted document/chunk foreign key",
    );
  });
  [
    "ots",
    "observers",
    "attention_time",
    "dwell_time",
    "percent_v",
    "v",
    "vd",
  ].forEach((m) =>
    node(
      `metric:${m}`,
      "Metric",
      m,
      "core/tools/intent.ts · explicit metric enum",
    ),
  );
  [
    "devices",
    "ots_summary",
    "ots_daily",
    "ots_hourly",
    "ots_by_site",
    "demographics",
    "demographics_daily",
    "demographics_hourly",
  ].forEach((d) => {
    node(
      `dataset:${d}`,
      "Dataset",
      d,
      "core/tools/intent.ts · explicit dataset enum",
    );
    edge(
      "tool:analytics",
      `dataset:${d}`,
      "queries",
      "AnalyticsTool supported dataset contract",
    );
    if (d !== "devices")
      [
        "ots",
        "observers",
        "attention_time",
        "dwell_time",
        "percent_v",
        "v",
        "vd",
      ].forEach((m) =>
        edge(
          `dataset:${d}`,
          `metric:${m}`,
          "provides",
          "Shared analytics fact schema; logical dataset views",
        ),
      );
  });
  node(
    "tool:analytics",
    "Tool",
    "AnalyticsTool",
    "core/tools/analytics-tool.ts",
  );
  node("entity:demo", "Entity", "Synthetic demo project", "scripts/seed.ts", {
    synthetic: true,
  });
  docs.forEach((d) =>
    edge(
      d.id,
      "entity:demo",
      "belongs_to",
      "Snapshot export restricted to project=demo",
    ),
  );
  node(
    "rule:access",
    "BusinessRule",
    "Membership + dataset authorization",
    "core/agents/access-agent.ts",
  );
  edge(
    "rule:access",
    "tool:analytics",
    "governs",
    "requireAnalytics checks roles before execution",
  );
  // Only explicitly catalogued definitions; no inferred semantic relationships.
  const metricDoc = docs.find((d) => d.source === "metrics.md");
  if (metricDoc)
    ["ots", "v", "vd"].forEach((m) =>
      edge(
        metricDoc.id,
        `metric:${m}`,
        "defines",
        "Curated corpus mapping: metrics.md",
      ),
    );
  return graphSchema.parse({
    nodes,
    edges,
    source:
      "Explicit schema, corpus mapping and persisted metadata; no LLM-inferred edges",
  });
}
