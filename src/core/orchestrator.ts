import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { conversations, messages } from "@/db/schema";
import { plan } from "./agents/planner-agent";
import { checkAccess, requireAnalytics } from "./agents/access-agent";
import { generateAnswer } from "./agents/generation";
import { persistRun } from "@/db/queries/run-storage";
import { executeAnalytics } from "./tools/analytics-tool";
import { retrieve } from "./rag/search";
import { buildContext } from "./rag/context-builder";
import { validateCitations } from "./rag/citations";
import { searchNormalize } from "./rag/normalizer";
import {
  emptyState,
  remember,
  type ConversationState,
} from "./conversation/conversation-state";
import { Trace } from "./observability/trace";
import { providers } from "@/ai/provider";
import type { PipelineEvent, Mode } from "./rag/types";
export type ChatRequest = {
  userId: string;
  projectId: string;
  query: string;
  conversationId?: string;
  mode: Mode;
  topK: number;
  threshold: number;
};
export async function orchestrate(
  request: ChatRequest,
  emit: (event: PipelineEvent) => void = () => {},
) {
  const start = performance.now(),
    db = getDb(),
    trace = new Trace(emit);
  trace.state("RECEIVED");
  trace.state("CHECKING_ACCESS");
  const access = await trace.stage(
    "Access",
    { userId: request.userId, projectId: request.projectId },
    () => checkAccess(request.userId, request.projectId),
  );
  let state = emptyState(),
    conversationId = request.conversationId;
  if (conversationId) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, request.userId),
          eq(conversations.projectId, request.projectId),
        ),
      );
    if (!conversation) throw new Error("Conversation access denied");
    state = conversation.state as ConversationState;
  } else {
    conversationId = randomUUID();
    await db.insert(conversations).values({
      id: conversationId,
      userId: request.userId,
      projectId: request.projectId,
      state,
    });
  }
  trace.state("UNDERSTANDING");
  const action = await trace.stage(
    "Planner",
    { query: request.query },
    async () => plan(request.query, state),
  );
  const messageId = randomUUID();
  await db.insert(messages).values({
    id: messageId,
    conversationId,
    role: "user",
    content: request.query,
  });
  const intent = "analytics" in action ? action.analytics : undefined;
  if (intent) requireAnalytics(access, intent.dataset);
  const retrievalQuery =
    action.type === "HYBRID" ? action.knowledgeQuery : request.query;
  if (action.type === "KNOWLEDGE_RAG" || action.type === "HYBRID")
    trace.state("RETRIEVING");
  if (intent) trace.state("CONSULTING");
  const [hits, toolResult] = await Promise.all([
    action.type === "KNOWLEDGE_RAG" || action.type === "HYBRID"
      ? retrieve(
          retrievalQuery,
          access,
          request.mode,
          request.topK,
          request.threshold,
          trace,
        )
      : Promise.resolve([]),
    intent
      ? trace.stage("Tool", { tool: "AnalyticsTool", intent }, () =>
          executeAnalytics(intent, access),
        )
      : Promise.resolve(undefined),
  ]);
  trace.state("ORGANIZING");
  const sources = await trace.stage(
    "Context",
    { candidates: hits.length },
    async () => buildContext(hits),
  );
  trace.state("FINALIZING");
  const usage = await generateAnswer(
    action,
    request.userId,
    { query: request.query, sources, toolResult, history: state.recentTurns },
    trace,
  );
  const validated = await trace.stage(
    "Citation Validation",
    { sourceIds: sources.map((s) => s.sourceId) },
    async () => validateCitations(usage.text, sources),
  );
  state = remember(state, request.query, validated.text, intent);
  state.lastAction = action.type;
  state.pendingDisambiguation =
    action.type === "CLARIFICATION" && action.pending
      ? { intent: action.pending, options: action.options || [] }
      : undefined;
  const runId = randomUUID();
  const result = {
    runId,
    conversationId,
    answer: validated.text,
    action,
    toolResult,
    hits,
    sources,
    trace: trace.stages,
    tokens: {
      input: usage.inputTokens,
      output: usage.outputTokens,
      cached: usage.cachedTokens,
      other: trace.embeddingTokens,
    },
    query: request.query,
    normalizedQuery: searchNormalize(retrievalQuery),
    mode: request.mode,
    topK: request.topK,
    threshold: request.threshold,
    durationMs: performance.now() - start,
    mock: providers().mock,
    invalidCitations: validated.invalid,
    debugEnabled:
      process.env.NODE_ENV === "development" &&
      process.env.RAG_DEBUG === "true",
  };
  await persistRun(result, messageId, state, request.userId, request.projectId);
  for (const part of validated.text.match(/.{1,80}(?:\s|$)|.{1,80}/gs) || [])
    emit({ type: "delta", data: part });
  trace.state("DONE");
  console.log(
    JSON.stringify({
      requestId: runId,
      conversationId,
      userId: request.userId,
      projectId: request.projectId,
      stage: "DONE",
      duration: result.durationMs,
      result: action.type,
    }),
  );
  emit({ type: "result", data: result });
  return result;
}
export type RunResult = Awaited<ReturnType<typeof orchestrate>>;
