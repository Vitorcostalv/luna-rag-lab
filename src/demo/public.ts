import raw from "./snapshot.json";
import type { RunResult } from "@/core/orchestrator";
import type { Hit, Mode } from "@/core/rag/types";
import { searchNormalize } from "@/core/rag/normalizer";
import { chunkText } from "@/core/rag/chunker";
import { z } from "zod";

export const snapshot = raw as unknown as Omit<typeof raw, "runs"> & {
  runs: {
    id: string;
    query: string;
    mode: Mode;
    durationMs: number;
    createdAt: string;
    result: RunResult;
  }[];
};
export function publicLab() {
  return {
    users: [{ id: "viewer", name: "Public visitor", role: "viewer" }],
    projects: [{ id: "demo", name: "Synthetic Retail Observatory" }],
    documents: snapshot.documents.map((d) => ({
      ...d,
      content: undefined,
      chunkCount: snapshot.chunks.filter((c) => c.documentId === d.id).length,
      tokens: snapshot.chunks
        .filter((c) => c.documentId === d.id)
        .reduce((s, c) => s + c.tokenCount, 0),
    })),
    chunkTotal: snapshot.chunks.length,
    runs: snapshot.runs.map((r) => ({
      ...r,
      result: { ...r.result, executionMode: "snapshot" as const },
    })),
    evaluations: snapshot.evaluations,
    quota: [],
    provider: "recorded mock",
    accessMode: "public",
    executionMode: "snapshot",
    generatedAt: snapshot.generatedAt,
    canWrite: false,
    examples: [...new Set(snapshot.runs.map((r) => r.query))],
  };
}
export function publicDocument(id: string) {
  const document = snapshot.documents.find((d) => d.id === id);
  if (!document)
    return Response.json({ error: "Document access denied" }, { status: 403 });
  return Response.json({
    document,
    chunks: snapshot.chunks.filter((c) => c.documentId === id),
  });
}
export function replay(query: string, mode: Mode) {
  return snapshot.runs.find(
    (r) =>
      searchNormalize(r.query) === searchNormalize(query) && r.mode === mode,
  )?.result;
}
export function replayStream(query: string, mode: Mode) {
  const result = replay(query, mode);
  if (!result)
    return Response.json(
      {
        error:
          "Public demo replays recorded questions. Choose a guided example; no live AI call was made.",
      },
      { status: 422 },
    );
  const events = [
    { type: "state", data: "REPLAYING" },
    ...result.trace.map((s) => ({ type: "trace", data: s })),
    { type: "delta", data: result.answer },
    { type: "state", data: "DONE" },
    {
      type: "result",
      data: {
        ...result,
        executionMode: "snapshot",
        recordedAt: snapshot.generatedAt,
      },
    },
  ];
  return new Response(events.map((e) => JSON.stringify(e)).join("\n") + "\n", {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Lab-Mode": "snapshot",
    },
  });
}
export function publicOperation(raw: unknown) {
  const body = z
    .object({
      operation: z.enum(["compare", "chunk"]),
      payload: z.record(z.string(), z.unknown()),
    })
    .parse(raw);
  if (body.operation === "compare") {
    const query = z.string().max(4000).parse(body.payload.query);
    const comparisons = Object.entries(snapshot.comparisons).find(
      ([q]) => searchNormalize(q) === searchNormalize(query),
    )?.[1];
    if (!comparisons)
      return Response.json(
        { error: "Choose a recorded question to compare strategies." },
        { status: 422 },
      );
    return Response.json(comparisons, {
      headers: {
        "X-Lab-Mode": "snapshot",
        "X-Recorded-Config": "topK=6;threshold=0.08",
      },
    });
  }
  const input = z
    .object({
      documentId: z.string(),
      size: z.number().int().min(20).max(2000),
      overlap: z.number().int().min(0).max(500),
    })
    .parse(body.payload);
  if (input.overlap >= input.size)
    throw new Error("Overlap must be smaller than chunk size");
  const doc = snapshot.documents.find((d) => d.id === input.documentId);
  if (!doc) throw new Error("Document access denied");
  return Response.json({
    content: doc.content,
    chunks: chunkText(doc.content, input.size, input.overlap),
    executionMode: "deterministic preview; no indexing or persistence",
  });
}
export type PublicHit = Hit;
