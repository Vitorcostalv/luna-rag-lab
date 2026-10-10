"use client";
import { useState } from "react";
import { useLab, fetchJson } from "@/components/lab/use-lab";
import { Identity } from "@/components/lab/identity";
import type { Mode } from "@/core/rag/types";
type Report = {
  summary: Record<string, number | null>;
  results: {
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
    [error, setError] = useState("");
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
  const current = report || lab.data?.evaluations[0];
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
          disabled={busy || lab.userId !== "admin"}
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
                {current.results.map((r) => (
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
