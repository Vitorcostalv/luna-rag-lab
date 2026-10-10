import { z } from "zod";
import { and, eq, desc, count, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  projects,
  users,
  memberships,
  documents,
  chunks,
  conversations,
  retrievalRuns,
  evaluationRuns,
  tokenCycles,
} from "@/db/schema";
import { checkAccess } from "@/core/agents/access-agent";
import { identitySchema, retrievalSchema, apiError } from "@/lib/api";
import { retrieve } from "@/core/rag/search";
import { chunkText } from "@/core/rag/chunker";
import { buildContext } from "@/core/rag/context-builder";
import questions from "../../../../evals/questions.json";
import { retrievalMetrics } from "@/core/evaluation/retrieval-metrics";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams),
      identity = identitySchema.parse(params),
      access = await checkAccess(identity.userId, identity.projectId),
      db = getDb();
    const [people, projectList, docs, chunkTotal, runs, evals, quota] =
      await Promise.all([
        db
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users)
          .innerJoin(memberships, eq(memberships.userId, users.id))
          .where(eq(memberships.projectId, identity.projectId)),
        db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .innerJoin(memberships, eq(memberships.projectId, projects.id))
          .where(eq(memberships.userId, identity.userId)),
        db
          .select({
            id: documents.id,
            title: documents.title,
            source: documents.source,
            status: documents.status,
            createdAt: documents.createdAt,
            metadata: documents.metadata,
            chunkCount: sql<number>`(select count(*) from chunks where document_id = ${documents.id})::int`,
            tokens: sql<number>`coalesce((select sum(token_count) from chunks where document_id = ${documents.id}),0)::int`,
          })
          .from(documents)
          .where(eq(documents.projectId, identity.projectId)),
        db
          .select({ count: count() })
          .from(chunks)
          .where(eq(chunks.projectId, identity.projectId)),
        db
          .select({
            id: retrievalRuns.id,
            query: retrievalRuns.query,
            mode: retrievalRuns.retrievalMode,
            durationMs: retrievalRuns.durationMs,
            createdAt: retrievalRuns.createdAt,
            result: retrievalRuns.result,
          })
          .from(retrievalRuns)
          .innerJoin(
            conversations,
            eq(conversations.id, retrievalRuns.conversationId),
          )
          .where(
            and(
              eq(conversations.projectId, identity.projectId),
              eq(conversations.userId, identity.userId),
            ),
          )
          .orderBy(desc(retrievalRuns.createdAt))
          .limit(30),
        access.role === "admin"
          ? db
              .select()
              .from(evaluationRuns)
              .orderBy(desc(evaluationRuns.createdAt))
              .limit(10)
          : Promise.resolve([]),
        db
          .select()
          .from(tokenCycles)
          .where(eq(tokenCycles.userId, identity.userId)),
      ]);
    return Response.json({
      users: people,
      projects: projectList,
      documents: docs,
      chunkTotal: chunkTotal[0].count,
      runs,
      evaluations: evals,
      quota,
      provider: process.env.AI_PROVIDER || "mock",
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const raw = await request.json(),
      operation = z.enum(["compare", "chunk"]).parse(raw.operation);
    if (operation === "compare") {
      const body = retrievalSchema.parse(raw.payload),
        access = await checkAccess(body.userId, body.projectId);
      const truth =
        questions.find((q) => q.question === body.query)?.expectedSources || [];
      const result = await Promise.all(
        (["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"] as const).map(
          async (mode) => {
            const start = performance.now(),
              hits = await retrieve(
                body.query,
                access,
                mode,
                body.topK,
                body.threshold,
              );
            return {
              mode,
              hits,
              durationMs: performance.now() - start,
              contextTokens: buildContext(hits).reduce(
                (s, h) => s + h.tokenCount,
                0,
              ),
              metrics: retrievalMetrics(
                hits.map((h) => h.source),
                truth,
                body.topK,
              ),
            };
          },
        ),
      );
      return Response.json(result);
    }
    const body = identitySchema
      .extend({
        documentId: z.string(),
        size: z.number().int().min(20).max(2000),
        overlap: z.number().int().min(0).max(500),
      })
      .strict()
      .parse(raw.payload);
    await checkAccess(body.userId, body.projectId);
    const [doc] = await getDb()
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, body.documentId),
          eq(documents.projectId, body.projectId),
        ),
      );
    if (!doc) throw new Error("Document access denied");
    return Response.json({
      content: doc.content,
      chunks: chunkText(doc.content, body.size, body.overlap),
    });
  } catch (error) {
    return apiError(error);
  }
}
