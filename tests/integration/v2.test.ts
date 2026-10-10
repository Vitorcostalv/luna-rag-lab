import { MockChatProvider } from "@/ai/mock-provider";
import { scryptSync } from "node:crypto";
import { POST as login } from "@/app/api/auth/route";
import { POST as upload, DELETE as remove } from "@/app/api/documents/route";
import { GET as health } from "@/app/api/health/route";
import * as databaseClient from "@/db/client";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { sql, eq, count } from "drizzle-orm";
import { seed } from "../../scripts/seed";
import { getDb, closeDb } from "@/db/client";
import { chunks } from "@/db/schema";
import { resultRows } from "@/db/rows";
import { runExperiment, defaultExperiment } from "@/core/experiments/runner";
import { safetySuite } from "@/core/security/safety-suite";
import { orchestrate } from "@/core/orchestrator";
process.env.PGLITE_PATH = "memory://";
process.env.AI_PROVIDER = "mock";
beforeAll(seed);
afterAll(closeDb);
it("authenticates the owner and authorizes same-origin writes while denying forged identity", async () => {
  const salt = "a".repeat(32),
    password = "synthetic-owner-test-only";
  vi.stubEnv("PUBLIC_DEMO_MODE", "true");
  vi.stubEnv("LAB_MODE", "live");
  vi.stubEnv("DATABASE_MODE", "postgres");
  vi.stubEnv("OWNER_AUTH_SECRET", "b".repeat(48));
  vi.stubEnv(
    "OWNER_PASSWORD_HASH",
    `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  );
  try {
    const auth = await login(
      new Request("https://demo.example/api/auth", {
        method: "POST",
        headers: {
          origin: "https://demo.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }),
    );
    expect(auth.status).toBe(200);
    const cookie = auth.headers.get("Set-Cookie")!;
    expect(cookie).toContain("HttpOnly; Secure; SameSite=Strict");
    const form = new FormData();
    form.set("userId", "admin");
    form.set("projectId", "demo");
    form.set(
      "file",
      new File(
        ["# Owner fixture\nSynthetic authorized upload."],
        "owner-test.md",
        { type: "text/markdown" },
      ),
    );
    const response = await upload(
      new Request("https://demo.example/api/documents", {
        method: "POST",
        headers: {
          origin: "https://demo.example",
          cookie: cookie.split(";")[0],
        },
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    const { id } = await response.json();
    const mutation = (origin: string, userId: string) =>
      new Request("https://demo.example/api/documents", {
        method: "DELETE",
        headers: {
          origin,
          cookie: cookie.split(";")[0],
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, userId, projectId: "demo" }),
      });
    expect(
      (await remove(mutation("https://demo.example", "viewer"))).status,
    ).toBe(403);
    expect(
      (await remove(mutation("https://evil.example", "admin"))).status,
    ).toBe(403);
    expect(
      (await remove(mutation("https://demo.example", "admin"))).status,
    ).toBe(200);
  } finally {
    vi.unstubAllEnvs();
  }
});
it("reports real database health failure without exposing provider diagnostics", async () => {
  const spy = vi.spyOn(databaseClient, "getDb").mockImplementationOnce(() => {
    throw new Error("postgres://secret@private-host");
  });
  try {
    const response = await health();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.database.available).toBe(false);
    expect(JSON.stringify(body)).not.toContain("secret");
  } finally {
    spy.mockRestore();
  }
});
it("creates isolated experiment indexes and preserves the default index", async () => {
  const before = (
    await getDb()
      .select({ n: count() })
      .from(chunks)
      .where(eq(chunks.projectId, "demo"))
  )[0].n;
  const a = await runExperiment("O que significa OTS?", {
      ...defaultExperiment,
      chunkSize: 80,
      overlap: 10,
    }),
    b = await runExperiment("O que significa OTS?", defaultExperiment);
  expect(a.index.id).not.toBe(b.index.id);
  expect(a.index.chunks).toBeGreaterThan(b.index.chunks);
  expect(
    (
      await getDb()
        .select({ n: count() })
        .from(chunks)
        .where(eq(chunks.projectId, "demo"))
    )[0].n,
  ).toBe(before);
  const ids = resultRows<{ id: string }>(
    await getDb().execute(
      sql`select id from experiment_chunks where experiment_id=${a.id}`,
    ),
  ).map((r) => r.id);
  expect(a.hits.every((h) => ids.includes(h.id))).toBe(true);
  expect(a.sources.every((h) => ids.includes(h.id))).toBe(true);
  expect(a.metrics.recall).not.toBeNull();
  await expect(
    runExperiment("OTS", {
      ...defaultExperiment,
      embeddingModel: "foreign-model",
    }),
  ).rejects.toThrow(/match/);
});
it("denies experiment creation for read-only users", async () => {
  await expect(
    runExperiment("OTS", defaultExperiment, "viewer", "demo"),
  ).rejects.toThrow(/permission/);
});
it.each([
  "injection",
  "conflict",
  "spoof",
  "citation",
  "missing",
  "scope",
  "project",
  "dataset",
])(
  "passes recorded safety case %s against actual implementations",
  async (id) => {
    const cases = await safetySuite();
    expect(cases.find((c) => c.id === id)?.passed).toBe(true);
  },
);
it("records typed planner decisions and observable inherited filters", async () => {
  const base = {
    userId: "admin",
    projectId: "demo",
    mode: "HYBRID_RERANK" as const,
    topK: 6,
    threshold: 0.08,
  };
  const first = await orchestrate({
    ...base,
    query:
      "Compare Loja Centro e Loja Norte com OTS entre 2026-04-10 e 2026-04-15",
  });
  const second = await orchestrate({
    ...base,
    query: "Agora considere somente o período da manhã.",
    conversationId: first.conversationId,
  });
  expect(
    second.decisions.find((d) => d.step === "memory")?.output
      .matchingPriorFilterKeys,
  ).toContain("sites");
  expect(
    second.decisions.find((d) => d.step === "intent")?.output.action,
  ).toHaveProperty("type", "ANALYTICS_TOOL");
  expect(
    second.trace.find((s) => s.stage === "Planner")?.output,
  ).toHaveProperty("type", "ANALYTICS_TOOL");
});

it("fails visibly when the configured response provider fails; no fabricated answer delta", async () => {
  const spy = vi
    .spyOn(MockChatProvider.prototype, "generate")
    .mockRejectedValueOnce(new Error("provider unavailable"));
  const events: { type: string; data: unknown }[] = [];
  try {
    await expect(
      orchestrate(
        {
          userId: "admin",
          projectId: "demo",
          query: "O que significa OTS?",
          mode: "HYBRID_RERANK",
          topK: 6,
          threshold: 0.08,
        },
        (e) => events.push(e),
      ),
    ).rejects.toThrow("provider unavailable");
    expect(events.filter((e) => e.type === "delta")).toHaveLength(0);
    expect(
      events.some(
        (e) =>
          e.type === "trace" &&
          (e.data as { stage: string; status: string }).stage ===
            "Generation" &&
          (e.data as { status: string }).status === "error",
      ),
    ).toBe(true);
  } finally {
    spy.mockRestore();
  }
});
