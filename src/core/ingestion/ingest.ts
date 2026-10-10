import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, chunks, auditLogs } from "@/db/schema";
import { chunkText } from "@/core/rag/chunker";
import { EmbeddingService, checksum } from "@/core/rag/embedder";
import { config } from "@/lib/config";
import { providers } from "@/ai/provider";
import { requireWrite, type Access } from "@/core/agents/access-agent";
export async function ingestDocument(
  input: {
    title: string;
    source: string;
    content: string;
    mimeType: string;
    size?: number;
    overlap?: number;
  },
  access: Access,
) {
  requireWrite(access);
  const db = getDb(),
    hash = checksum(input.content),
    model = providers().embedding.model;
  const [existing] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, access.projectId),
        eq(documents.source, input.source),
      ),
    );
  const options = {
    size: input.size || config.chunkSize,
    overlap: input.overlap ?? config.overlap,
    model,
  };
  const previous = existing?.metadata.ingestion as typeof options | undefined;
  if (
    existing?.checksum === hash &&
    existing.status === "indexed" &&
    previous?.size === options.size &&
    previous.overlap === options.overlap &&
    previous.model === options.model
  )
    return { id: existing.id, unchanged: true };
  const id = existing?.id || randomUUID();
  await db
    .insert(documents)
    .values({
      id,
      projectId: access.projectId,
      title: input.title,
      source: input.source,
      content: input.content,
      checksum: hash,
      status: "processing",
      mimeType: input.mimeType,
      metadata: { ingestion: options },
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        content: input.content,
        checksum: hash,
        status: "processing",
        metadata: { ingestion: options },
        updatedAt: new Date(),
      },
    });
  try {
    const split = chunkText(input.content, options.size, options.overlap),
      vectors = await new EmbeddingService(access.userId).embedMany(
        split.map((c) => c.content),
      );
    await db.delete(chunks).where(eq(chunks.documentId, id));
    if (split.length)
      await db.insert(chunks).values(
        split.map((c, i) => ({
          id: randomUUID(),
          documentId: id,
          projectId: access.projectId,
          chunkIndex: i,
          content: c.content,
          heading: c.heading,
          tokenCount: c.tokenCount,
          metadata: {
            title: input.title,
            heading: c.heading,
            source: input.source,
            start: c.start,
            end: c.end,
            documentId: id,
            chunkIndex: i,
          },
          embedding: vectors[i],
          embeddingModel: model,
        })),
      );
    await db
      .update(documents)
      .set({ status: "indexed", updatedAt: new Date() })
      .where(eq(documents.id, id));
    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: access.userId,
      projectId: access.projectId,
      action: "INGEST",
      entityType: "document",
      entityId: id,
      metadata: { chunks: split.length, model },
    });
    return { id, chunks: split.length, unchanged: false };
  } catch (error) {
    await db
      .update(documents)
      .set({ status: "error" })
      .where(eq(documents.id, id));
    throw error;
  }
}
