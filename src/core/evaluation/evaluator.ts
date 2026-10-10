import { evaluationCategory } from "./comparison";
import { providers } from "@/ai/provider";
import { createHash } from "node:crypto";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import questions from "../../../evals/questions.json";
import { getDb } from "@/db/client";
import { evaluationRuns } from "@/db/schema";
import { orchestrate } from "@/core/orchestrator";
import { retrievalMetrics } from "./retrieval-metrics";
import { searchNormalize } from "@/core/rag/normalizer";
import type { Mode } from "@/core/rag/types";
import { rateLimit } from "@/core/security/rate-limit";
export type EvalOptions = { mode: Mode; topK: number; threshold: number };
export async function evaluate(
  options: EvalOptions,
  userId = "admin",
  projectId = "demo",
) {
  rateLimit(`evaluation:${userId}`, 5);
  const results = [];
  for (const question of questions) {
    let conversationId: string | undefined;
    for (const prior of question.prior || [])
      conversationId = (
        await orchestrate({
          ...options,
          userId,
          projectId,
          query: prior,
          conversationId,
        })
      ).conversationId;
    const result = await orchestrate({
      ...options,
      userId,
      projectId,
      query: question.question,
      conversationId,
    });
    const metrics = retrievalMetrics(
      result.hits.map((h) => h.source),
      question.expectedSources || [],
      options.topK,
    );
    const filters =
      "analytics" in result.action ? result.action.analytics.filters : {};
    const filterPass = Object.entries(question.expectedFilters || {}).every(
      ([key, value]) =>
        JSON.stringify(filters[key as keyof typeof filters]) ===
        JSON.stringify(value),
    );
    const keywordPass = (question.expectedKeywords || []).every((k) =>
      searchNormalize(result.answer).includes(searchNormalize(k)),
    );
    const toolPass =
      !question.expectedTool ||
      result.toolResult?.tool === question.expectedTool;
    const citations = result.answer.match(/\[S\d+\]/g) || [];
    results.push({
      category: evaluationCategory(question),
      id: question.id,
      question: question.question,
      type: result.action.type,
      passed:
        result.action.type === question.type &&
        filterPass &&
        keywordPass &&
        toolPass,
      metrics,
      filterPass,
      keywordPass,
      toolPass,
      latencyMs: result.durationMs,
      contextTokens: result.sources.reduce((s, h) => s + h.tokenCount, 0),
      citationCoverage: result.sources.length
        ? new Set(citations).size / result.sources.length
        : null,
      citationCorrectness: result.invalidCitations.length === 0 ? 1 : 0,
      runId: result.runId,
    });
  }
  const mean = (values: (number | null)[]) => {
    const valid = values.filter((n): n is number => n !== null);
    return valid.length
      ? valid.reduce((s, n) => s + n, 0) / valid.length
      : null;
  };
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    meanLatencyMs: mean(results.map((r) => r.latencyMs)),
    hitRate: mean(results.map((r) => r.metrics.hitRate)),
    precision: mean(results.map((r) => r.metrics.precision)),
    recall: mean(results.map((r) => r.metrics.recall)),
    mrr: mean(results.map((r) => r.metrics.mrr)),
    citationCoverage: mean(results.map((r) => r.citationCoverage)),
    citationCorrectness: mean(results.map((r) => r.citationCorrectness)),
  };
  const corpus = await getDb()
    .select({ id: documents.id, content: documents.content })
    .from(documents)
    .where(eq(documents.projectId, projectId));
  const corpusHash = createHash("sha256")
    .update(
      corpus
        .map((d) => `${d.id}:${d.content}`)
        .sort()
        .join("\n"),
    )
    .digest("hex");
  const report = {
    benchmark: {
      questionSet: "v1-15",
      model: providers().embedding.model,
      corpusHash,
    },
    id: randomUUID(),
    config: options,
    results,
    summary,
    createdAt: new Date().toISOString(),
    evaluationKind: "deterministic checks; no LLM judge",
  };
  await getDb()
    .insert(evaluationRuns)
    .values({
      id: report.id,
      config: { ...options, benchmark: report.benchmark },
      results,
      summary,
    });
  return report;
}
