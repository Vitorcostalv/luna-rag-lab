import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  conversations,
  messages,
  retrievalRuns,
  retrievalHits,
  auditLogs,
} from "@/db/schema";
import type { RunResult } from "@/core/orchestrator";
import type { ConversationState } from "@/core/conversation/conversation-state";
export async function persistRun(
  result: RunResult,
  messageId: string,
  state: ConversationState,
  userId: string,
  projectId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(conversations)
    .set({ state, updatedAt: new Date() })
    .where(eq(conversations.id, result.conversationId));
  await db
    .insert(messages)
    .values({
      id: randomUUID(),
      conversationId: result.conversationId,
      role: "assistant",
      content: result.answer,
      tokenInput: result.tokens.input,
      tokenOutput: result.tokens.output,
      metadata: {
        sources: result.sources,
        toolResult: result.toolResult,
        mock: result.mock,
      },
    });
  await db
    .insert(retrievalRuns)
    .values({
      id: result.runId,
      conversationId: result.conversationId,
      messageId,
      query: result.query,
      normalizedQuery: result.normalizedQuery,
      retrievalMode: result.mode,
      topK: result.topK,
      threshold: result.threshold,
      rerankingEnabled: result.mode === "HYBRID_RERANK",
      durationMs: result.durationMs,
      trace: result.trace,
      result,
    });
  if (result.hits.length)
    await db
      .insert(retrievalHits)
      .values(
        result.hits.map((h) => ({
          retrievalRunId: result.runId,
          chunkId: h.id,
          semanticScore: h.semanticScore,
          lexicalScore: h.lexicalScore,
          fusedScore: h.fusedScore,
          rerankScore: h.rerankScore,
          finalPosition: h.rank,
        })),
      );
  await db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      userId,
      projectId,
      action: result.action.type,
      entityType: "retrieval_run",
      entityId: result.runId,
      metadata: {
        requestId: result.runId,
        conversationId: result.conversationId,
        durationMs: result.durationMs,
        result: "complete",
      },
    });
}
