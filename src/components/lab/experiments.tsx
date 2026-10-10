"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "./use-lab";
import { download, csv } from "./download";
import type {
  ExperimentConfig,
  ExperimentResult,
} from "@/core/experiments/runner";
const defaults: ExperimentConfig = {
  chunkSize: 700,
  overlap: 120,
  topK: 6,
  threshold: 0.08,
  mode: "HYBRID_RERANK",
  contextBudget: 2800,
  embeddingModel: "mock-hash-256-v2",
};
type History = { mode: string; canRun: boolean; results: ExperimentResult[] };
function ConfigEditor({
  title,
  value,
  change,
  readOnly,
}: {
  title: string;
  value: ExperimentConfig;
  change: (value: ExperimentConfig) => void;
  readOnly: boolean;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="controls">
        {(
          [
            "chunkSize",
            "overlap",
            "topK",
            "threshold",
            "contextBudget",
          ] as const
        ).map((key) => (
          <label key={key}>
            {key}
            <input
              disabled={readOnly}
              type="number"
              step={key === "threshold" ? 0.01 : 1}
              min={key === "threshold" || key === "overlap" ? 0 : 1}
              max={
                key === "threshold"
                  ? 1
                  : key === "topK"
                    ? 20
                    : key === "contextBudget"
                      ? 8000
                      : 2000
              }
              value={value[key]}
              onChange={(e) =>
                change({ ...value, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <label>
          Retrieval strategy
          <select
            disabled={readOnly}
            value={value.mode}
            onChange={(e) =>
              change({
                ...value,
                mode: e.target.value as ExperimentConfig["mode"],
              })
            }
          >
            {["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Embedding model
          <input
            disabled={readOnly}
            value={value.embeddingModel}
            onChange={(e) =>
              change({ ...value, embeddingModel: e.target.value })
            }
          />
        </label>
      </div>
      <small>
        Rerank is heuristic when HYBRID_RERANK is selected. Each execution
        creates an isolated model-specific index.
      </small>
    </section>
  );
}
function Result({ result }: { result: ExperimentResult }) {
  return (
    <section className="panel">
      <h2>{result.config.mode}</h2>
      <p className="code">
        {result.latencyMs.toFixed(1)} ms · {result.contextTokens} context tokens
        · {result.index.chunks} chunks
      </p>
      <div className="score-grid">
        {Object.entries(result.metrics).map(([key, val]) => (
          <span key={key}>
            {key}
            <br />
            <b>{val?.toFixed(3) ?? "N/A"}</b>
          </span>
        ))}
      </div>
      <div className="metric-bars" aria-label="Recall, precision and MRR bars">
        {(["recall", "precision", "mrr"] as const).map((key) => (
          <div
            key={key}
            style={{
              height: `${Math.max(4, (result.metrics[key] || 0) * 100)}%`,
            }}
            title={`${key}: ${result.metrics[key] ?? "no ground truth"}`}
          />
        ))}
      </div>
      <p>
        <small>
          Recall · precision · MRR. Mock scores describe this synthetic fixture.
        </small>
      </p>
      <details>
        <summary>Final answer and sources</summary>
        <p style={{ whiteSpace: "pre-wrap" }}>{result.answer}</p>
        {result.sources.map((s) => (
          <details key={s.id}>
            <summary>
              [{s.sourceId}] {s.source}
            </summary>
            <pre className="code-block">{s.content}</pre>
          </details>
        ))}
      </details>
      <details>
        <summary>Index, tokens and trace</summary>
        <pre className="code-block">
          {JSON.stringify(
            { index: result.index, tokens: result.tokens, trace: result.trace },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
export function Experiments() {
  const [history, setHistory] = useState<History>(),
    [a, setA] = useState(defaults),
    [b, setB] = useState({
      ...defaults,
      chunkSize: 120,
      overlap: 20,
      topK: 3,
      contextBudget: 600,
    }),
    [pair, setPair] = useState<ExperimentResult[]>([]),
    [query, setQuery] = useState("O que significa OTS?"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetchJson<History>("/api/experiments")
      .then((h) => {
        setHistory(h);
        setPair(h.results.slice(0, 2));
        if (h.results[0]) setA(h.results[0].config);
        if (h.results[1]) setB(h.results[1].config);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function run() {
    setBusy(true);
    setError("");
    try {
      const r = await fetchJson<{ a: ExperimentResult; b: ExperimentResult }>(
        "/api/experiments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, a, b }),
        },
      );
      setPair([r.a, r.b]);
      setHistory(await fetchJson<History>("/api/experiments"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const recorded = history?.canRun === false;
  return (
    <main>
      <span className="eyebrow">EXPERIMENT 04 / CONTROLLED COMPARISON</span>
      <h1>A/B experiments</h1>
      <p>
        Compare configurações em índices isolados. Inspecione a resposta e a
        evidência.
      </p>
      <div className="notice">
        {recorded
          ? "PUBLIC REPLAY · choose recorded configurations below. Editing and persistent execution require owner authentication."
          : "LOCAL / OWNER · configurations create versioned indexes; the default corpus remains intact."}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!history && !error && <p className="loading">Loading experiments…</p>}
      <label>
        Knowledge question
        <input
          disabled={recorded}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={4000}
        />
      </label>
      <div className="experiment-grid">
        <ConfigEditor
          title="A / baseline"
          value={a}
          change={setA}
          readOnly={recorded}
        />
        <ConfigEditor
          title="B / challenger"
          value={b}
          change={setB}
          readOnly={recorded}
        />
      </div>
      <div className="controls">
        {!recorded && (
          <button className="primary" disabled={busy || !history} onClick={run}>
            {busy ? "Executing isolated indexes…" : "Run A/B experiment"}
          </button>
        )}
        <button
          disabled={!pair.length}
          onClick={() =>
            download(
              "luna-experiment.json",
              JSON.stringify({ mode: history?.mode, results: pair }, null, 2),
            )
          }
        >
          Export JSON
        </button>
        <button
          disabled={!pair.length}
          onClick={() =>
            download(
              "luna-experiment.csv",
              csv(
                pair.map((r) => ({
                  id: r.id,
                  query: r.query,
                  mode: r.config.mode,
                  chunkSize: r.config.chunkSize,
                  overlap: r.config.overlap,
                  topK: r.config.topK,
                  ...r.metrics,
                  latencyMs: r.latencyMs,
                  contextTokens: r.contextTokens,
                })),
              ),
              "text/csv",
            )
          }
        >
          Export CSV
        </button>
      </div>
      {recorded && (
        <div className="experiment-grid">
          {[0, 1].map((side) => (
            <label key={side}>
              Recorded configuration {side === 0 ? "A" : "B"}
              <select
                value={pair[side]?.id || ""}
                onChange={(e) => {
                  const r = history.results.find(
                    (r) => r.id === e.target.value,
                  )!;
                  setPair((p) => p.map((old, i) => (i === side ? r : old)));
                  (side === 0 ? setA : setB)(r.config);
                }}
              >
                {history.results.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.config.chunkSize}/{r.config.overlap} · {r.config.mode} ·
                    K{r.config.topK}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="experiment-grid">
        {pair.map((r, i) => (
          <Result key={`${r.id}-${i}`} result={r} />
        ))}
      </div>
      <h2>Versioned history</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Recorded</th>
              <th>Index</th>
              <th>Configuration</th>
              <th>MRR</th>
            </tr>
          </thead>
          <tbody>
            {history?.results.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                <td className="code">
                  {r.index.id.slice(0, 8)} · {r.index.model}
                </td>
                <td>
                  {r.config.chunkSize}/{r.config.overlap} · {r.config.mode}
                </td>
                <td>{r.metrics.mrr ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
