import { afterEach, it, expect, vi } from "vitest";
import {
  guardOwner,
  signSession,
  verifySession,
  ownerSession,
} from "@/core/security/session";
import {
  snapshot,
  publicDocument,
  replayStream,
  publicOperation,
} from "@/demo/public";
import { graphSchema, buildGraph } from "@/core/knowledge/graph";
import { experimentConfig, defaultExperiment } from "@/core/experiments/runner";
import { analyzeQuality } from "@/core/knowledge/quality";
import { percentDelta } from "@/core/evaluation/comparison";
import { POST as chat } from "@/app/api/chat/route";
import { POST as evaluate } from "@/app/api/evaluation/route";
import { POST as experiment } from "@/app/api/experiments/route";
import {
  POST as upload,
  PATCH as reindex,
  DELETE as remove,
} from "@/app/api/documents/route";
afterEach(() => vi.unstubAllEnvs());
function publicEnv() {
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  vi.stubEnv("LAB_MODE", "snapshot");
  vi.stubEnv("OWNER_AUTH_SECRET", "");
}
it.each([upload, reindex, remove, evaluate, experiment])(
  "blocks anonymous writes before reading body or opening database",
  async (handler) => {
    publicEnv();
    const response = await handler(
      new Request("https://demo.example/api/write", {
        method: "POST",
        body: JSON.stringify({ userId: "admin", projectId: "demo" }),
      }),
    );
    expect(response.status).toBe(403);
  },
);
it("serves recorded chat without a provider or database", async () => {
  publicEnv();
  const r = await chat(
    new Request("https://demo.example/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "admin",
        projectId: "restricted",
        query: "O que significa OTS?",
        mode: "HYBRID_RERANK",
        topK: 6,
        threshold: 0.08,
      }),
    }),
  );
  expect(r.status).toBe(200);
  expect(r.headers.get("X-Lab-Mode")).toBe("snapshot");
  const data = await r.text();
  expect(data).toContain("snapshot");
  expect(data).not.toContain("ORANGE-ISOLATED");
});
it("does not fabricate an answer for an unrecorded question", () => {
  expect(replayStream("Unknown question", "HYBRID").status).toBe(422);
});
it("public documents are restricted to the exported corpus", async () => {
  expect(publicDocument("restricted").status).toBe(403);
  expect(publicDocument(snapshot.documents[0].id).status).toBe(200);
  expect(snapshot.documents).toHaveLength(9);
  expect(JSON.stringify(snapshot)).not.toContain("ORANGE-ISOLATED");
});
it("rejects chunk preview overlap and unknown documents", () => {
  expect(() =>
    publicOperation({
      operation: "chunk",
      payload: { documentId: snapshot.documents[0].id, size: 20, overlap: 20 },
    }),
  ).toThrow(/Overlap/);
  expect(() =>
    publicOperation({
      operation: "chunk",
      payload: { documentId: "foreign", size: 100, overlap: 20 },
    }),
  ).toThrow(/access/);
});
it("verifies signed expiring owner sessions and same-origin writes", () => {
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  vi.stubEnv("LAB_MODE", "live");
  vi.stubEnv("DATABASE_MODE", "postgres");
  vi.stubEnv("OWNER_AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("OWNER_PASSWORD_HASH", "a".repeat(32) + ":" + "b".repeat(128));
  const token = signSession();
  expect(verifySession(token)).toBe(true);
  expect(verifySession(token + "x")).toBe(false);
  expect(verifySession(signSession(Date.now() - 1))).toBe(false);
  const req = new Request("https://demo.example/api/write", {
    headers: { cookie: `luna_owner=${token}`, origin: "https://demo.example" },
  });
  expect(ownerSession(req)).toBe(true);
  expect(() =>
    guardOwner(req, { userId: "admin", projectId: "demo" }),
  ).not.toThrow();
  expect(() =>
    guardOwner(req, { userId: "viewer", projectId: "demo" }),
  ).toThrow(/identity/);
  expect(() =>
    guardOwner(
      new Request(req, {
        headers: {
          cookie: `luna_owner=${token}`,
          origin: "https://evil.example",
        },
      }),
    ),
  ).toThrow(/cross-origin/);
});
it("graph has typed nodes, valid endpoints and documented provenance", () => {
  const graph = graphSchema.parse(
    buildGraph(snapshot.documents, snapshot.chunks),
  );
  expect(new Set(graph.nodes.map((n) => n.kind)).size).toBe(7);
  const ids = new Set(graph.nodes.map((n) => n.id));
  expect(
    graph.edges.every(
      (e) => ids.has(e.from) && ids.has(e.to) && e.provenance.length > 0,
    ),
  ).toBe(true);
});
it("experiment configurations reject incompatible chunk bounds", () => {
  expect(
    experimentConfig.safeParse({ ...defaultExperiment, overlap: 700 }).success,
  ).toBe(false);
  expect(
    experimentConfig.safeParse({ ...defaultExperiment, topK: 21 }).success,
  ).toBe(false);
});
it("quality analysis measures actual duplicate and short content", () => {
  const report = analyzeQuality([
    { id: "1", content: "same", tokenCount: 2 },
    { id: "2", content: "same", tokenCount: 2 },
  ]);
  expect(report.measurements.duplicateChunks).toBe(1);
  expect(report.measurements.smallChunks).toBe(2);
  expect(report.measurements.noEvidence).toBe(true);
});
it("does not invent percentage changes from absent or zero baselines", () => {
  expect(percentDelta(null, 1)).toBeNull();
  expect(percentDelta(0, 1)).toBeNull();
  expect(percentDelta(0.5, 0.75)).toBe(50);
});
