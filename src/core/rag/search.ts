import { and, eq, sql, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { providers } from "@/ai/provider";
import { config } from "@/lib/config";
import { EmbeddingService } from "./embedder";
import { searchNormalize, meaningfulWords } from "./normalizer";
import { rrf } from "./rrf";
import { HeuristicReranker } from "./reranker";
import type { Hit, Mode } from "./types";
import type { Trace } from "@/core/observability/trace";
import type { Access } from "@/core/agents/access-agent";
const selection = {
  id: chunks.id,
  documentId: chunks.documentId,
  content: chunks.content,
  title: documents.title,
  source: documents.source,
  heading: chunks.heading,
  tokenCount: chunks.tokenCount,
};
function asHit(
  row: typeof selection extends never
    ? never
    : {
        id: string;
        documentId: string;
        content: string;
        title: string;
        source: string;
        heading: string;
        tokenCount: number;
      },
  score: number,
  kind: "semantic" | "lexical",
): Hit {
  return {
    ...row,
    semanticScore: kind === "semantic" ? score : 0,
    lexicalScore: kind === "lexical" ? score : 0,
    fusedScore: 0,
    rerankScore: 0,
    finalScore: score,
    rank: 0,
  };
}
export async function semanticSearch(
  vector: number[],
  access: Access,
  topK: number,
  threshold: number,
) {
  const score = sql<number>`1 - (${chunks.embedding} <=> ${JSON.stringify(vector)}::vector)`;
  const rows = await getDb()
    .select({ ...selection, score })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .where(
      and(
        eq(chunks.projectId, access.projectId),
        eq(documents.projectId, access.projectId),
        eq(documents.status, "indexed"),
        eq(chunks.embeddingModel, providers().embedding.model),
        sql`${score} >= ${threshold}`,
      ),
    )
    .orderBy(desc(score))
    .limit(topK);
  return rows.map((row, i) => ({
    ...asHit(row, Number(row.score), "semantic"),
    rank: i + 1,
  }));
}
export async function lexicalSearch(
  query: string,
  access: Access,
  topK: number,
) {
  const vector = sql`to_tsvector('portuguese', ${chunks.content} || ' ' || ${documents.title} || ' ' || ${chunks.heading})`;
  const terms = sql`plainto_tsquery('portuguese', ${query})`;
  const score = sql<number>`ts_rank_cd(${vector}, ${terms})`;
  const rows = await getDb()
    .select({ ...selection, score })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .where(
      and(
        eq(chunks.projectId, access.projectId),
        eq(documents.projectId, access.projectId),
        eq(documents.status, "indexed"),
        sql`${vector} @@ ${terms}`,
      ),
    )
    .orderBy(desc(score))
    .limit(topK);
  return rows.map((row, i) => ({
    ...asHit(row, Number(row.score), "lexical"),
    rank: i + 1,
  }));
}
export async function retrieve(
  query: string,
  access: Access,
  mode: Mode,
  topK = config.topK,
  threshold = config.threshold,
  trace?: Trace,
) {
  const run = <T>(name: string, input: unknown, fn: () => Promise<T>) =>
    trace ? trace.stage(name, input, fn) : fn();
  const normalized = searchNormalize(query);
  if (mode === "LEXICAL")
    return run("Lexical Search", { query: normalized, topK }, () =>
      lexicalSearch(normalized, access, topK),
    );
  const embedder = new EmbeddingService(access.userId);
  const vector = await run(
    "Embedding",
    { model: providers().embedding.model },
    () => embedder.embedText(normalized),
  );
  if (trace) trace.embeddingTokens += embedder.lastUsageTokens;
  const semantic = () =>
    run("Semantic Search", { topK, threshold }, () =>
      semanticSearch(vector, access, topK * 3, threshold),
    );
  if (mode === "SEMANTIC") return (await semantic()).slice(0, topK);
  const [sem, lex] = await Promise.all([
    semantic(),
    run("Lexical Search", { query: normalized }, () =>
      lexicalSearch(normalized, access, topK * 3),
    ),
  ]);
  let hits = await run("Fusion", { k: config.rrfK }, async () =>
    rrf([sem, lex], config.rrfK),
  );
  if (mode === "HYBRID_RERANK")
    hits = await run("Rerank", { implementation: "heuristic" }, () =>
      new HeuristicReranker().rerank(query, hits),
    );
  if (providers().mock) {
    const terms = meaningfulWords(query);
    hits = hits.filter((h) =>
      terms.some((t) => searchNormalize(h.content).includes(t)),
    );
  }
  return hits.slice(0, topK);
}
