import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { documents, chunks } from "../src/db/schema";
import { seed } from "./seed";
import { orchestrate } from "../src/core/orchestrator";
import { evaluate } from "../src/core/evaluation/evaluator";
import { retrievalMetrics } from "../src/core/evaluation/retrieval-metrics";
import questions from "../evals/questions.json";

async function main() {
  process.env.AI_PROVIDER = "mock";
  process.env.DATABASE_MODE = "pglite";
  await seed();
  const db = getDb(),
    docs = (
      await db.select().from(documents).where(eq(documents.projectId, "demo"))
    ).filter((d) => !d.source.startsWith("upload:"));
  const ids = new Set(docs.map((d) => d.id));
  const parts = (
    await db.select().from(chunks).where(eq(chunks.projectId, "demo"))
  )
    .filter((c) => ids.has(c.documentId))
    .map((c) => ({
      id: c.id,
      documentId: c.documentId,
      projectId: c.projectId,
      content: c.content,
      heading: c.heading,
      tokenCount: c.tokenCount,
      chunkIndex: c.chunkIndex,
      embeddingModel: c.embeddingModel,
      metadata: c.metadata,
    }));
  const queries = [
    ...new Set([
      "O que significa OTS?",
      "Qual unidade teve maior OTS entre 10 e 15 de abril?",
      "Qual unidade teve maior OTS e o que essa métrica representa?",
      ...questions.map((q) => q.question),
    ]),
  ];
  const runs = [],
    comparisons: Record<string, unknown> = {};
  for (const query of queries) {
    const results = [];
    for (const mode of [
      "SEMANTIC",
      "LEXICAL",
      "HYBRID",
      "HYBRID_RERANK",
    ] as const) {
      let conversationId: string | undefined;
      for (const prior of questions.find((q) => q.question === query)?.prior ||
        [])
        conversationId = (
          await orchestrate({
            userId: "admin",
            projectId: "demo",
            query: prior,
            mode,
            topK: 6,
            threshold: 0.08,
            conversationId,
          })
        ).conversationId;
      const result = await orchestrate({
        userId: "admin",
        projectId: "demo",
        query,
        mode,
        topK: 6,
        threshold: 0.08,
        conversationId,
      });
      if (result.hits.some((h) => !ids.has(h.documentId)))
        throw new Error("Snapshot contains non-public sources");
      runs.push({
        id: result.runId,
        query,
        mode,
        durationMs: result.durationMs,
        createdAt: new Date().toISOString(),
        result: { ...result, debugEnabled: false },
      });
      results.push({
        mode,
        hits: result.hits,
        durationMs: result.durationMs,
        contextTokens: result.sources.reduce((s, h) => s + h.tokenCount, 0),
        metrics: retrievalMetrics(
          result.hits.map((h) => h.source),
          questions.find((q) => q.question === query)?.expectedSources || [],
          6,
        ),
      });
    }
    comparisons[query] = results;
  }
  const evaluation = await evaluate({
    mode: "HYBRID_RERANK",
    topK: 6,
    threshold: 0.08,
  });
  const snapshot = {
    version: 2,
    generatedAt: new Date().toISOString(),
    label: "Recorded mock execution · synthetic data · no live model calls",
    documents: docs,
    chunks: parts,
    runs,
    comparisons,
    evaluations: [evaluation],
  };
  await mkdir("src/demo", { recursive: true });
  await writeFile("src/demo/snapshot.json", JSON.stringify(snapshot, null, 2));
  console.log(
    `Public snapshot: ${docs.length} documents, ${runs.length} recorded runs, ${evaluation.summary.passed}/${evaluation.summary.total} evaluation cases`,
  );
}
main()
  .finally(closeDb)
  .catch(() => {
    console.error("Snapshot generation failed");
    process.exitCode = 1;
  });
