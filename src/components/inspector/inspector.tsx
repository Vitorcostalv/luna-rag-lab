"use client";
import { useState, useRef, useEffect } from "react";
import type { RunResult } from "@/core/orchestrator";
import type { Source, Hit, TraceStage } from "@/core/rag/types";
export function SourceModal({
  source,
  close,
}: {
  source: Hit | Source;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-label="Source evidence"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="modal-header">
        <h2>{source.title}</h2>
        <button autoFocus onClick={close} aria-label="Close source">
          ×
        </button>
      </div>
      <p>
        {source.source} / {source.heading} · Rank {source.rank}
      </p>
      <Scores hit={source} />
      <pre className="code-block">{source.content}</pre>
    </dialog>
  );
}
function Scores({ hit }: { hit: Hit }) {
  return (
    <div className="score-grid">
      {[
        ["Semantic", hit.semanticScore],
        ["Lexical", hit.lexicalScore],
        ["RRF", hit.fusedScore],
        ["Rerank", hit.rerankScore],
        ["Final", hit.finalScore],
        ["Tokens", hit.tokenCount],
      ].map(([name, value]) => (
        <span key={name}>
          {name}
          <br />
          <b>
            {typeof value === "number"
              ? value.toFixed(name === "Tokens" ? 0 : 4)
              : value}
          </b>
        </span>
      ))}
    </div>
  );
}
export function RetrievalMap({
  hits,
  select,
}: {
  hits: Hit[];
  select: (hit: Hit) => void;
}) {
  const max = Math.max(...hits.map((h) => h.finalScore), 0.001);
  return (
    <svg
      className="map"
      viewBox="0 0 450 190"
      role="img"
      aria-label="Retrieval Map: query linked to chunks by score"
    >
      <text x="18" y="24" fill="#99a6ac">
        RETRIEVAL MAP
      </text>
      <circle cx="62" cy="100" r="19" fill="#1f363c" stroke="#80d8df" />
      <text x="48" y="104" fill="#80d8df">
        QRY
      </text>
      {hits.slice(0, 8).map((hit, i) => {
        const x = 190 + (1 - hit.finalScore / max) * 170,
          y = 28 + i * 19;
        return (
          <g
            key={hit.id}
            className="map-node"
            role="button"
            tabIndex={0}
            aria-label={`Open chunk ${i + 1}`}
            onClick={() => select(hit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select(hit);
              }
            }}
          >
            <title>
              {hit.title}: {hit.finalScore.toFixed(4)}
            </title>
            <line
              x1="81"
              y1="100"
              x2={x}
              y2={y}
              stroke="#80d8df"
              strokeWidth={1 + hit.finalScore / max}
              opacity={0.15 + (0.65 * hit.finalScore) / max}
            />
            <circle cx={x} cy={y} r="5" fill="#25434b" stroke="#80d8df" />
            <text x={x + 12} y={y + 4} fill="#bac5ca">
              {hit.sourceId || `C${i + 1}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function Inspector({
  result,
  stages,
  mobileOpen = false,
}: {
  result?: RunResult;
  stages?: TraceStage[];
  mobileOpen?: boolean;
}) {
  const [tab, setTab] = useState("Pipeline"),
    [source, setSource] = useState<Hit | Source>();
  const trace = stages?.length ? stages : result?.trace || [];
  return (
    <section
      className={`panel inspector-panel ${mobileOpen ? "mobile-open" : ""}`}
      aria-label="RAG Inspector"
    >
      <div className="panel-title">
        <h2>
          <span className="section-number">02</span>RAG Inspector
        </h2>
        <span className="tag">LIVE TRACE</span>
      </div>
      <div className="tabs" role="tablist" aria-label="Inspector tabs">
        {["Pipeline", "Retrieval", "Context", "Tokens", "Raw Trace"].map(
          (t) => (
            <button
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      {!trace.length && !result ? (
        <div className="empty-chat">
          <span className="eyebrow">AWAITING QUERY</span>
          <p>
            Execute uma pergunta para inspecionar decisões, fontes, scores e uso
            de tokens.
          </p>
          <RetrievalMap hits={[]} select={setSource} />
        </div>
      ) : (
        <>
          {tab === "Pipeline" && (
            <>
              <div className="eyebrow">EXECUTION PATH</div>
              {trace.map((s, i) => (
                <details key={`${s.stage}-${i}`}>
                  <summary className="trace-row">
                    <span className={`trace-status ${s.status}`}>
                      {s.status === "complete"
                        ? "✓"
                        : s.status === "error"
                          ? "×"
                          : "◌"}
                    </span>
                    <span>{s.stage}</span>
                    <span className="muted">{s.durationMs.toFixed(1)} ms</span>
                  </summary>
                  <pre className="code-block">
                    {JSON.stringify(
                      { input: s.input, output: s.output },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              ))}
              {result && (
                <div className="notice">
                  {result.action.type} · {result.durationMs.toFixed(0)} ms total
                </div>
              )}
            </>
          )}
          {tab === "Retrieval" && result && (
            <>
              <pre className="code-block">
                {JSON.stringify(
                  {
                    query: result.query,
                    normalizedQuery: result.normalizedQuery,
                    mode: result.mode,
                    topK: result.topK,
                    threshold: result.threshold,
                    latencyMs: result.durationMs,
                  },
                  null,
                  2,
                )}
              </pre>
              <RetrievalMap hits={result.hits} select={setSource} />
              {result.hits.map((h) => (
                <details key={h.id}>
                  <summary>
                    #{h.rank} {h.source} / {h.heading}
                  </summary>
                  <Scores hit={h} />
                  <pre className="code-block">{h.content}</pre>
                  <button onClick={() => setSource(h)}>Open source</button>
                </details>
              ))}
              {!result.hits.length && (
                <p>
                  No document hits.{" "}
                  {result.toolResult
                    ? "Answer uses authorized analytics data."
                    : "No evidence found."}
                </p>
              )}
              {result.toolResult && (
                <pre className="code-block">
                  {JSON.stringify(result.toolResult, null, 2)}
                </pre>
              )}
            </>
          )}
          {tab === "Context" && result && (
            <>
              {result.sources.map((s) => (
                <details key={s.id}>
                  <summary>
                    [{s.sourceId}] {s.title} · {s.tokenCount} tokens
                  </summary>
                  <pre className="code-block">{s.content}</pre>
                </details>
              ))}
              <p>
                {result.sources.reduce((sum, s) => sum + s.tokenCount, 0)}{" "}
                estimated context tokens
              </p>
            </>
          )}
          {tab === "Tokens" && result && (
            <>
              <pre className="code-block">
                {JSON.stringify(result.tokens, null, 2)}
              </pre>
              <p>
                {result.mock
                  ? "Mock usage is estimated (characters / 4)."
                  : "Generation usage reported by the provider."}{" "}
                Context and chunk token counts are estimates.
              </p>
            </>
          )}
          {tab === "Raw Trace" && result && (
            <pre className="code-block">
              {JSON.stringify(
                result.debugEnabled
                  ? result
                  : {
                      runId: result.runId,
                      action: result.action,
                      stages: result.trace,
                      durationMs: result.durationMs,
                    },
                null,
                2,
              )}
            </pre>
          )}
        </>
      )}
      {source && (
        <SourceModal source={source} close={() => setSource(undefined)} />
      )}
    </section>
  );
}
