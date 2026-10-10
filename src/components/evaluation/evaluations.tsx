"use client";
import { useState, useEffect } from "react";
import { useLab, fetchJson } from "@/components/lab/use-lab";
import { Identity } from "@/components/lab/identity";
import type { Mode } from "@/core/rag/types";
import { categories, percentDelta } from "@/core/evaluation/comparison";
import { download } from "@/components/lab/download";
import type { SafetyCase } from "@/core/security/safety-suite";
type Report = {
  id?: string;
  config?: Record<string, unknown>;
  benchmark?: { questionSet: string; model: string; corpusHash: string };
  summary: Record<string, number | null>;
  results: {
    category?: string;
    id: string;
    question: string;
    passed: boolean;
    metrics: { mrr: number | null };
    filterPass: boolean;
    keywordPass: boolean;
    toolPass: boolean;
  }[];
};
export function Evaluations() {
  const lab = useLab(),
    [mode, setMode] = useState<Mode>("HYBRID_RERANK"),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<Report>(),
    [error, setError] = useState(""),
    [history, setHistory] = useState<Report[]>([]),
    [safety, setSafety] = useState<SafetyCase[]>([]),
    [category, setCategory] = useState("all"),
    [baselineId, setBaselineId] = useState("");
  useEffect(() => {
    fetchJson<{ results: Report[]; safety: SafetyCase[] }>("/api/benchmarks")
      .then((h) => {
        setHistory(h.results);
        setSafety(h.safety);
        setBaselineId(h.results[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  async function run() {
    setBusy(true);
    setError("");
    try {
      setReport(
        await fetchJson<Report>("/api/evaluation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...lab.identity,
            mode,
            topK: 6,
            threshold: 0.08,
          }),
        }),
      );
      await lab.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current =
    report || history[history.length - 1] || lab.data?.evaluations[0];
  const baseline = history.find((r) => r.id === baselineId);
  const signature = (r: Report | undefined) =>
    JSON.stringify(r?.benchmark || r?.config?.benchmark || null);
  const comparable =
    !!baseline &&
    !!current &&
    signature(baseline) !== "null" &&
    signature(baseline) === signature(current as Report);
  return (
    <main>
      <span className="eyebrow">EXPERIMENT 03 / RETRIEVAL BENCHMARK</span>
      <h1>Evaluations</h1>
      <p>Ground truth sintético. Métricas reproduzíveis. Falhas visíveis.</p>
      <Identity lab={lab} />
      <div className="notice">
        Deterministic evaluation · routing, filters, keywords and retrieval
        metrics. No model-based judge. Keyword checks do not prove groundedness.
      </div>
      <div className="controls">
        <label>
          Strategy
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            {["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <button
          disabled={
            busy || lab.userId !== "admin" || lab.data?.canWrite === false
          }
          className="primary"
          onClick={run}
        >
          {busy ? "Evaluating…" : "Run evaluation"}
        </button>
      </div>
      {(error || lab.error) && (
        <div role="alert" className="error">
          {error || lab.error}
        </div>
      )}
      <div className="controls">
        <label htmlFor="evaluation-category">Category</label>
        <select
          id="evaluation-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label>
          Baseline
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value)}
          >
            {history.map((r, i) => (
              <option key={r.id || i} value={r.id}>
                Benchmark {i + 1} · {String(r.config?.mode || "recorded")}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!current}
          onClick={() =>
            download(
              "luna-evaluation.md",
              `# Luna evaluation\n\nMode: ${lab.data?.provider}\n\n${JSON.stringify(current, null, 2)}\n\nSafety: ${JSON.stringify(safety, null, 2)}`,
              "text/markdown",
            )
          }
        >
          Export Markdown
        </button>
      </div>
      {current && baseline && (
        <div className="panel">
          <h2>Baseline / current</h2>
          <p>
            {comparable
              ? "Compatible question set, corpus checksum and embedding model. Retrieval configurations can differ; latency is environment-dependent."
              : "Incompatible or missing benchmark signature: percentage deltas are unavailable."}
          </p>
          {["mrr", "recall", "precision", "meanLatencyMs"].map((key) => (
            <p className="code" key={key}>
              {key}: {baseline.summary[key] ?? "N/A"} →{" "}
              {current.summary[key] ?? "N/A"} · Δ{" "}
              {comparable
                ? (percentDelta(
                    baseline.summary[key],
                    current.summary[key],
                  )?.toFixed(1) ?? "N/A")
                : "N/A"}
              %
            </p>
          ))}
        </div>
      )}
      {(category === "Safety" || category === "Permissions") && (
        <section className="panel">
          <h2>{category} checks · recorded</h2>
          {safety
            .filter((s) =>
              category === "Permissions"
                ? ["project", "dataset"].includes(s.id)
                : !["project", "dataset"].includes(s.id),
            )
            .map((s) => (
              <details key={s.id}>
                <summary>
                  {s.passed ? "PASS" : "FAIL"} · {s.name}
                </summary>
                <pre className="code-block">{JSON.stringify(s, null, 2)}</pre>
              </details>
            ))}
        </section>
      )}
      {current ? (
        <section className="panel">
          <h2>Latest benchmark</h2>
          <pre className="code-block">
            {JSON.stringify(current.summary, null, 2)}
          </pre>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Result</th>
                  <th>MRR</th>
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {current.results
                  .filter(
                    (r) =>
                      category === "all" ||
                      (r as Report["results"][number]).category === category,
                  )
                  .map((r) => (
                    <tr key={r.id}>
                      <td>{r.question}</td>
                      <td
                        style={{
                          color: r.passed ? "var(--cyan)" : "var(--amber)",
                        }}
                      >
                        {r.passed ? "PASS" : "FAIL"}
                      </td>
                      <td>{r.metrics.mrr?.toFixed(3) ?? "N/A"}</td>
                      <td>
                        <details>
                          <summary>Inspect</summary>
                          <pre>{JSON.stringify(r, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <p>
            No evaluation has been executed. Run the seeded question set to
            produce measured results.
          </p>
        </section>
      )}
    </main>
  );
}
