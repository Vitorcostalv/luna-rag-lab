import { sharedLimit } from "@/core/security/shared-limit";
import {
  publicReplay,
  guardOwner,
  protectedDeployment,
} from "@/core/security/session";
import { publicDocument } from "@/demo/public";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, chunks, auditLogs } from "@/db/schema";
import { checkAccess, requireWrite } from "@/core/agents/access-agent";
import { identitySchema, apiError } from "@/lib/api";
import { parseDocument } from "@/core/ingestion/parser";
import { ingestDocument } from "@/core/ingestion/ingest";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (publicReplay(request))
    return publicDocument(new URL(request.url).searchParams.get("id") || "");
  if (protectedDeployment()) {
    const p = new URL(request.url).searchParams;
    if (p.get("userId") !== "admin" || p.get("projectId") !== "demo")
      return Response.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const body = identitySchema
      .extend({ id: z.string() })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    await checkAccess(body.userId, body.projectId);
    const [doc] = await getDb()
      .select()
      .from(documents)
      .where(
        and(eq(documents.id, body.id), eq(documents.projectId, body.projectId)),
      );
    if (!doc) throw new Error("Document access denied");
    const parts = await getDb()
      .select({
        id: chunks.id,
        content: chunks.content,
        heading: chunks.heading,
        tokenCount: chunks.tokenCount,
        chunkIndex: chunks.chunkIndex,
        embeddingModel: chunks.embeddingModel,
        metadata: chunks.metadata,
      })
      .from(chunks)
      .where(eq(chunks.documentId, doc.id))
      .orderBy(chunks.chunkIndex);
    return Response.json({ document: doc, chunks: parts });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    guardOwner(request);
    await sharedLimit("owner:documents", 5);
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new Error("Upload too large");
    const form = await request.formData(),
      identity = identitySchema.parse({
        userId: form.get("userId"),
        projectId: form.get("projectId"),
      }),
      access = await checkAccess(identity.userId, identity.projectId);
    guardOwner(request, { userId: access.userId, projectId: access.projectId });
    requireWrite(access);
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("A file is required");
    if (file.size > 5 * 1024 * 1024) throw new Error("Upload too large");
    const title = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 150);
    const content = await parseDocument(
      title,
      file.type,
      new Uint8Array(await file.arrayBuffer()),
    );
    return Response.json(
      await ingestDocument(
        { title, source: `upload:${title}`, content, mimeType: file.type },
        access,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    guardOwner(request);
    await sharedLimit("owner:documents", 5);
    const body = identitySchema
        .extend({ id: z.string() })
        .strict()
        .parse(await request.json()),
      access = await checkAccess(body.userId, body.projectId);
    guardOwner(request, { userId: access.userId, projectId: access.projectId });
    requireWrite(access);
    const [doc] = await getDb()
      .select()
      .from(documents)
      .where(
        and(eq(documents.id, body.id), eq(documents.projectId, body.projectId)),
      );
    if (!doc) throw new Error("Document access denied");
    await getDb()
      .update(documents)
      .set({ status: "pending" })
      .where(eq(documents.id, doc.id));
    return Response.json(await ingestDocument(doc, access));
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    guardOwner(request);
    await sharedLimit("owner:documents", 5);
    const body = identitySchema
        .extend({ id: z.string() })
        .strict()
        .parse(await request.json()),
      access = await checkAccess(body.userId, body.projectId);
    guardOwner(request, { userId: access.userId, projectId: access.projectId });
    requireWrite(access);
    const rows = await getDb()
      .delete(documents)
      .where(
        and(eq(documents.id, body.id), eq(documents.projectId, body.projectId)),
      )
      .returning({ id: documents.id });
    if (!rows.length) throw new Error("Document access denied");
    await getDb().insert(auditLogs).values({
      id: randomUUID(),
      userId: body.userId,
      projectId: body.projectId,
      action: "DELETE",
      entityType: "document",
      entityId: body.id,
      metadata: {},
    });
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
