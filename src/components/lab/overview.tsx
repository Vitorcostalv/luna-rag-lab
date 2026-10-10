"use client";
import Link from "next/link";
import { useLab } from "./use-lab";
import { Identity } from "./identity";
export function Overview() {
  const lab = useLab(),
    data = lab.data,
    summary = data?.evaluations[0]?.summary;
  const mean = data?.runs.length
    ? data.runs.reduce((s, r) => s + r.durationMs, 0) / data.runs.length
    : null;
  const retrievalMean = data?.runs.length
    ? data.runs
        .flatMap((r) =>
          r.result.trace.filter((s) =>
            ["Semantic Search", "Lexical Search"].includes(s.stage),
          ),
        )
        .reduce((s, t) => s + t.durationMs, 0) /
      Math.max(
        data.runs.flatMap((r) =>
          r.result.trace.filter((s) =>
            ["Semantic Search", "Lexical Search"].includes(s.stage),
          ),
        ).length,
        1,
      )
    : null;
  const stats = [
    [
      "Documents indexed",
      data?.documents.filter((d) => d.status === "indexed").length,
    ],
    ["Chunks", data?.chunkTotal],
    ["Queries evaluated", summary?.total],
    [
      "Retrieval latency",
      retrievalMean === null ? undefined : `${retrievalMean.toFixed(0)} ms`,
    ],
    [
      "Citation coverage",
      summary?.citationCoverage === undefined
        ? undefined
        : `${(summary.citationCoverage * 100).toFixed(0)}%`,
    ],
  ];
  return (
    <main>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SYSTEM OVERVIEW / RESEARCH TERMINAL</span>
          <h1>Explore a real RAG pipeline</h1>
          <p>Retrieval-Augmented Generation Workbench</p>
        </div>
        <Link href="/chat" className="button primary">
          Open workbench ↗
        </Link>
      </div>
      <Identity lab={lab} />
      {lab.error && (
        <div className="error">
          {lab.error} · Run pnpm db:seed before starting the app.
        </div>
      )}
      <section className="guided-grid" aria-label="Guided examples">
        {[
          ["01 / KNOWLEDGE", "O que significa OTS?"],
          [
            "02 / ANALYTICS",
            "Qual unidade teve maior OTS entre 10 e 15 de abril?",
          ],
          [
            "03 / HYBRID",
            "Qual unidade teve maior OTS e o que essa métrica representa?",
          ],
        ].map(([label, q]) => (
          <Link
            className="panel guided-card"
            href={`/chat?q=${encodeURIComponent(q)}&run=1`}
            key={label}
          >
            <span className="eyebrow">{label}</span>
            <h2>{q}</h2>
            <span className="code">Inspect evidence →</span>
          </Link>
        ))}
      </section>
      <p className="muted">
        All data is synthetic. Public executions are recorded mock traces.{" "}
        <a href="https://github.com/Vitorcostalv/luna-rag-lab">
          Source on GitHub ↗
        </a>{" "}
        · <Link href="/architecture">Architecture ↗</Link>
      </p>
      <div className="stats">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <small>{label}</small>
            <strong>{value ?? "—"}</strong>
            <span>
              {value === undefined
                ? "awaiting measurements"
                : data?.executionMode === "snapshot"
                  ? "recorded / mock"
                  : "database / observed"}
            </span>
          </div>
        ))}
      </div>
      <div className="grid">
        <section className="panel">
          <div className="panel-title">
            <h2>
              <span className="section-number">01</span>Recent executions
            </h2>
            <Link href="/runs" className="tag">
              ALL RUNS ↗
            </Link>
          </div>
          {data?.runs.length ? (
            data.runs.slice(0, 5).map((r) => (
              <div className="trace-row" key={r.id}>
                <span className="trace-status">✓</span>
                <span>
                  {r.query}
                  <small className="muted" style={{ display: "block" }}>
                    {r.mode}
                  </small>
                </span>
                <span>{r.durationMs.toFixed(0)} ms</span>
              </div>
            ))
          ) : (
            <p>No runs yet. Ask a question in the workbench.</p>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>
              <span className="section-number">02</span>Evaluation summary
            </h2>
            <Link href="/evaluations" className="tag">
              BENCHMARK ↗
            </Link>
          </div>
          {summary ? (
            <>
              <pre className="code-block">
                {JSON.stringify(summary, null, 2)}
              </pre>
              <p>
                Deterministic checks. {summary.passed}/{summary.total} passed.
              </p>
            </>
          ) : (
            <>
              <p>
                Compare retrieval quality against synthetic ground truth. Track
                Hit Rate, Recall and MRR with reproducible questions.
              </p>
              <Link href="/evaluations" className="button">
                Run first evaluation →
              </Link>
            </>
          )}
          <p className="code muted">
            Mean end-to-end run: {mean === null ? "—" : `${mean.toFixed(0)} ms`}
          </p>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-title">
          <h2>
            <span className="section-number">03</span>Two sources. One grounded
            answer.
          </h2>
          <Link href="/architecture" className="tag">
            EXPLORE ARCHITECTURE ↗
          </Link>
        </div>
        <div className="grid">
          <div>
            <h3 style={{ color: "var(--cyan)" }}>KNOWLEDGE PATH</h3>
            <p className="code">
              Question → Planner → Access → Retrieval
              <br />→ Context → Response → Citations
            </p>
            <p>
              Definitions, business rules and documented concepts. Sources carry
              evidence identifiers.
            </p>
          </div>
          <div>
            <h3 style={{ color: "var(--amber)" }}>ANALYTICS PATH</h3>
            <p className="code">
              Question → Planner → Access → AnalyticsTool
              <br />→ Structured data → Response
            </p>
            <p>
              Values, sums and rankings come from authorized queries on
              synthetic database records.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
