import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";
import { resultRows } from "@/db/rows";
import { chunkText } from "@/core/rag/chunker";
import { EmbeddingService } from "@/core/rag/embedder";
import { providers } from "@/ai/provider";
import { rrf } from "@/core/rag/rrf";
import { HeuristicReranker } from "@/core/rag/reranker";
import { buildContext } from "@/core/rag/context-builder";
import { retrievalMetrics } from "@/core/evaluation/retrieval-metrics";
import { validateCitations } from "@/core/rag/citations";
import { generateAnswer } from "@/core/agents/generation";
import { Trace } from "@/core/observability/trace";
import { checkAccess, requireWrite } from "@/core/agents/access-agent";
import type { Hit } from "@/core/rag/types";
import questions from "../../../evals/questions.json";

export const experimentConfig = z
  .object({
    chunkSize: z.number().int().min(30).max(2000),
    overlap: z.number().int().min(0).max(500),
    topK: z.number().int().min(1).max(20),
    threshold: z.number().min(0).max(1),
    mode: z.enum(["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"]),
    contextBudget: z.number().int().min(100).max(8000),
    embeddingModel: z.string().min(1).max(100),
  })
  .strict()
  .refine((c) => c.overlap < c.chunkSize, {
    message: "Overlap must be smaller than chunk size",
  });
export type ExperimentConfig = z.infer<typeof experimentConfig>;
export const defaultExperiment: ExperimentConfig = {
  chunkSize: 700,
  overlap: 120,
  topK: 6,
  threshold: 0.08,
  mode: "HYBRID_RERANK",
  contextBudget: 2800,
  embeddingModel: "mock-hash-256-v2",
};
export type ExperimentResult = {
  id: string;
  query: string;
  config: ExperimentConfig;
  index: {
    id: string;
    chunks: number;
    model: string;
    dimensions: number;
    corpusHash: string;
  };
  metrics: ReturnType<typeof retrievalMetrics>;
  latencyMs: number;
  contextTokens: number;
  tokens: { input: number; output: number; cached: number; other: number };
  sources: ReturnType<typeof buildContext>;
  hits: Hit[];
  answer: string;
  trace: Trace["stages"];
  createdAt: string;
  mock: boolean;
};
export async function runExperiment(
  query: string,
  raw: ExperimentConfig,
  userId = "admin",
  projectId = "demo",
): Promise<ExperimentResult> {
  const config = experimentConfig.parse(raw),
    access = await checkAccess(userId, projectId);
  requireWrite(access);
  if (config.embeddingModel !== providers().embedding.model)
    throw new Error(
      "Embedding model must match the configured provider. Indexes never mix models.",
    );
  const start = performance.now(),
    db = getDb(),
    id = randomUUID(),
    trace = new Trace(),
    embedder = new EmbeddingService(userId);
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId));
  const { createHash } = await import("node:crypto");
  const corpusHash = createHash("sha256")
    .update(
      docs
        .map((d) => `${d.id}:${d.content}`)
        .sort()
        .join("\n"),
    )
    .digest("hex");
  await db.execute(
    sql`insert into experiment_runs(id,project_id,user_id,config,result) values(${id},${projectId},${userId},${JSON.stringify(config)}::jsonb,'{}'::jsonb)`,
  );
  try {
    const parts = docs.flatMap((doc) =>
      chunkText(doc.content, config.chunkSize, config.overlap).map((c) => ({
        ...c,
        id: randomUUID(),
        documentId: doc.id,
        title: doc.title,
        source: doc.source,
      })),
    );
    const vectors = await trace.stage(
      "Index Embedding",
      { chunks: parts.length, model: config.embeddingModel },
      () => embedder.embedMany(parts.map((c) => c.content)),
    );
    let embeddingTokens = embedder.lastUsageTokens;
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i];
      await db.execute(
        sql`insert into experiment_chunks values(${c.id},${id},${c.documentId},${c.content},${c.heading},${c.tokenCount},${config.embeddingModel},${JSON.stringify(vectors[i])}::vector)`,
      );
    }
    const vector = await embedder.embedText(query);
    embeddingTokens += embedder.lastUsageTokens;
    const sem = resultRows<{ id: string; score: number }>(
      await db.execute(
        sql`select id,1-(embedding <=> ${JSON.stringify(vector)}::vector) as score from experiment_chunks where experiment_id=${id} and model=${config.embeddingModel} and 1-(embedding <=> ${JSON.stringify(vector)}::vector)>=${config.threshold} order by score desc limit ${config.topK * 3}`,
      ),
    );
    const lex = resultRows<{ id: string; score: number }>(
      await db.execute(
        sql`select id,ts_rank_cd(to_tsvector('portuguese',content),plainto_tsquery('portuguese',${query})) as score from experiment_chunks where experiment_id=${id} and model=${config.embeddingModel} and to_tsvector('portuguese',content)@@plainto_tsquery('portuguese',${query}) order by score desc limit ${config.topK * 3}`,
      ),
    );
    const hits = (rows: typeof sem, kind: "semantic" | "lexical"): Hit[] =>
      rows.map((row, i) => {
        const part = parts.find((c) => c.id === row.id)!;
        return {
          ...part,
          rank: i + 1,
          semanticScore: kind === "semantic" ? Number(row.score) : 0,
          lexicalScore: kind === "lexical" ? Number(row.score) : 0,
          fusedScore: 0,
          rerankScore: 0,
          finalScore: Number(row.score),
        };
      });
    let ranked =
      config.mode === "SEMANTIC"
        ? hits(sem, "semantic")
        : config.mode === "LEXICAL"
          ? hits(lex, "lexical")
          : rrf([hits(sem, "semantic"), hits(lex, "lexical")], 60);
    if (config.mode === "HYBRID_RERANK")
      ranked = await new HeuristicReranker().rerank(query, ranked);
    ranked = ranked.slice(0, config.topK);
    const sources = buildContext(ranked, config.contextBudget),
      usage = await generateAnswer(
        { type: "KNOWLEDGE_RAG", query },
        userId,
        { query, sources, history: [] },
        trace,
      );
    const result: ExperimentResult = {
      id,
      query,
      config,
      index: {
        id,
        chunks: parts.length,
        model: config.embeddingModel,
        dimensions: 256,
        corpusHash,
      },
      metrics: retrievalMetrics(
        ranked.map((h) => h.source),
        questions.find((q) => q.question === query)?.expectedSources || [],
        config.topK,
      ),
      latencyMs: performance.now() - start,
      contextTokens: sources.reduce((s, c) => s + c.tokenCount, 0),
      tokens: {
        input: usage.inputTokens,
        output: usage.outputTokens,
        cached: usage.cachedTokens,
        other: embeddingTokens,
      },
      sources,
      hits: ranked,
      answer: validateCitations(usage.text, sources).text,
      trace: trace.stages,
      createdAt: new Date().toISOString(),
      mock: providers().mock,
    };
    await db.execute(
      sql`update experiment_runs set result=${JSON.stringify(result)}::jsonb where id=${id}`,
    );
    return result;
  } catch (error) {
    await db.execute(sql`delete from experiment_runs where id=${id}`);
    throw error;
  }
}
