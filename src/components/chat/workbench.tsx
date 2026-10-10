"use client";
import { useState } from "react";
import { useLab, fetchJson } from "@/components/lab/use-lab";
import { Identity } from "@/components/lab/identity";
import { Inspector, SourceModal } from "@/components/inspector/inspector";
import type { RunResult } from "@/core/orchestrator";
import type {
  Hit,
  Source,
  Mode,
  TraceStage,
  PipelineEvent,
} from "@/core/rag/types";
type Turn = { role: string; content: string; result?: RunResult };
type Comparison = {
  mode: Mode;
  hits: Hit[];
  durationMs: number;
  contextTokens: number;
  metrics: { mrr: number | null };
};
const examples = [
  "O que significa OTS?",
  "Qual unidade teve maior OTS entre 10 e 15 de abril?",
  "Qual unidade teve maior OTS e o que essa métrica representa?",
];
export function Workbench() {
  const lab = useLab(),
    [query, setQuery] = useState(""),
    [mode, setMode] = useState<Mode>("HYBRID_RERANK"),
    [topK, setTopK] = useState(6),
    [threshold, setThreshold] = useState(0.08);
  const [turns, setTurns] = useState<Turn[]>([]),
    [result, setResult] = useState<RunResult>(),
    [stages, setStages] = useState<TraceStage[]>([]),
    [status, setStatus] = useState("IDLE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [source, setSource] = useState<Source>(),
    [comparison, setComparison] = useState<Comparison[]>(),
    [mobile, setMobile] = useState(false);
  const identityKey = `${lab.userId}:${lab.projectId}`;
  const [conversation, setConversation] = useState<{
    identity: string;
    id: string;
  }>();
  const payload = (question: string) => ({
    ...lab.identity,
    query: question,
    mode,
    topK,
    threshold,
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    const question = query.trim();
    setBusy(true);
    setError("");
    setQuery("");
    setStages([]);
    setResult(undefined);
    setComparison(undefined);
    setStatus("RECEIVED");
    setTurns((t) => [
      ...t,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload(question),
          ...(conversation?.identity === identityKey
            ? { conversationId: conversation.id }
            : {}),
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      function consume(line: string) {
        if (!line.trim()) return;
        const event = JSON.parse(line) as PipelineEvent;
        if (event.type === "state") setStatus(event.data as string);
        if (event.type === "trace") {
          const stage = event.data as TraceStage;
          setStages((t) => {
            const i = t.findIndex((s) => s.stage === stage.stage);
            return i < 0
              ? [...t, stage]
              : t.map((s, j) => (j === i ? stage : s));
          });
        }
        if (event.type === "delta")
          setTurns((t) =>
            t.map((turn, i) =>
              i === t.length - 1
                ? { ...turn, content: turn.content + String(event.data) }
                : turn,
            ),
          );
        if (event.type === "result") {
          const run = event.data as RunResult;
          setResult(run);
          setConversation({ identity: identityKey, id: run.conversationId });
          setTurns((t) =>
            t.map((turn, i) =>
              i === t.length - 1
                ? { ...turn, content: run.answer, result: run }
                : turn,
            ),
          );
        }
        if (event.type === "error") throw new Error(String(event.data));
      }
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        lines.forEach(consume);
      }
      consume(buffer);
      await lab.reload();
    } catch (e) {
      setError((e as Error).message);
      setStatus("ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    const question = query.trim() || result?.query;
    if (!question) {
      setError("Enter a question to compare strategies.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setComparison(
        await fetchJson<Comparison[]>("/api/lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "compare",
            payload: payload(question),
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function answer(turn: Turn) {
    return turn.content.split(/(\[S\d+\])/g).map((part, i) => {
      const id = part.slice(1, -1),
        evidence = turn.result?.sources.find((s) => s.sourceId === id);
      return evidence ? (
        <button
          key={i}
          className="citation"
          onClick={() => setSource(evidence)}
          aria-label={`Open citation ${id}`}
        >
          {part}
        </button>
      ) : (
        <span key={i}>{part}</span>
      );
    });
  }
  return (
    <main>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXPERIMENT 01 / QUERY EXECUTION</span>
          <h1>RAG Workbench</h1>
          <p>Uma pergunta. Todas as etapas à vista.</p>
        </div>
        <span className="tag">{status}</span>
      </div>
      <Identity lab={lab} />
      <div className="controls">
        <label>
          Retrieval strategy
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            {["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Top K
          <input
            type="number"
            min="1"
            max="20"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </label>
        <label>
          Similarity threshold
          <input
            type="number"
            min="0"
            max="1"
            step=".01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <button disabled={busy} onClick={compare}>
          Compare retrieval strategies
        </button>
        <button
          onClick={() => {
            setTurns([]);
            setConversation(undefined);
            setResult(undefined);
            setStages([]);
          }}
        >
          New conversation
        </button>
        <button className="mobile-inspector" onClick={() => setMobile(!mobile)}>
          Inspector
        </button>
      </div>
      {(error || lab.error) && (
        <div role="alert" className="error">
          {error || lab.error}
        </div>
      )}
      {lab.data?.provider === "mock" && (
        <div className="notice">
          MOCK MODE · deterministic excerpts and hash embeddings. Configure
          OpenAI for real semantic embeddings and generation.
        </div>
      )}
      <div className="workbench">
        <section className="panel chat-panel">
          <div className="panel-title">
            <h2>
              <span className="section-number">01</span>Conversation
            </h2>
            <span className="tag">SYNTHETIC / PT-BR</span>
          </div>
          <div className="chat-log" aria-live="polite">
            {!turns.length && (
              <div className="empty-chat">
                <span className="eyebrow">FOLLOW THE EVIDENCE</span>
                <h2>
                  Conhecimento, dados
                  <br />
                  ou os dois?
                </h2>
                <p>
                  Explore a diferença entre recuperar uma definição e consultar
                  um valor. O planner escolhe a trilha; você acompanha cada
                  decisão.
                </p>
                <div className="query-examples">
                  {examples.map((q) => (
                    <button key={q} onClick={() => setQuery(q)}>
                      {q}
                      <span>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <article className={`turn ${t.role}`} key={i}>
                <div className="turn-label">
                  {t.role === "user" ? "QUERY" : "RESPONSE"}{" "}
                  {t.result && (
                    <span className="muted">
                      {" "}
                      / {t.result.mode} · {t.result.durationMs.toFixed(0)} ms
                    </span>
                  )}
                </div>
                {answer(t)}
              </article>
            ))}
          </div>
          <form className="composer" onSubmit={submit}>
            <label htmlFor="query">
              Question
              <textarea
                id="query"
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pergunte sobre OTS, unidades ou conceitos de RAG…"
                maxLength={4000}
              />
            </label>
            <div className="composer-row">
              <span className="muted code">
                {query.length}/4000 · {status}
              </span>
              <button
                className="primary"
                disabled={busy || !query.trim()}
                type="submit"
              >
                {busy ? "Executing…" : "Run query →"}
              </button>
            </div>
          </form>
        </section>
        <Inspector result={result} stages={stages} mobileOpen={mobile} />
      </div>
      {comparison && (
        <section aria-label="Retrieval comparison">
          <h2 style={{ marginTop: 28 }}>Same query. Four retrieval paths.</h2>
          <div className="compare-grid">
            {comparison.map((c) => (
              <div className="panel" key={c.mode}>
                <h3>{c.mode}</h3>
                <p className="code">
                  {c.durationMs.toFixed(0)} ms · {c.contextTokens} tokens
                  <br />
                  MRR: {c.metrics.mrr?.toFixed(3) ?? "N/A — no ground truth"}
                </p>
                {c.hits.map((h) => (
                  <details key={h.id}>
                    <summary>
                      #{h.rank} {h.source}
                    </summary>
                    <pre>{h.content}</pre>
                    <p>Final {h.finalScore.toFixed(4)}</p>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {source && (
        <SourceModal source={source} close={() => setSource(undefined)} />
      )}
    </main>
  );
}
