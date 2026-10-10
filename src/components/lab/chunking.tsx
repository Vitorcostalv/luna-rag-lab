"use client";
import { useState } from "react";
import { useLab, fetchJson } from "./use-lab";
import { Identity } from "./identity";
import type { TextChunk } from "@/core/rag/chunker";
export function Chunking() {
  const lab = useLab(),
    [documentId, setDocumentId] = useState(""),
    [size, setSize] = useState(700),
    [overlap, setOverlap] = useState(120),
    [result, setResult] = useState<{ content: string; chunks: TextChunk[] }>(),
    [error, setError] = useState("");
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!lab.data?.documents.length) return;
    try {
      setResult(
        await fetchJson("/api/lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "chunk",
            payload: {
              ...lab.identity,
              documentId: documentId || lab.data.documents[0].id,
              size,
              overlap,
            },
          }),
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main>
      <span className="eyebrow">EXPERIMENT 02 / DOCUMENT SEGMENTATION</span>
      <h1>Chunking playground</h1>
      <p>
        Observe limites, headings e overlap. Esta prévia não altera o índice.
      </p>
      <Identity lab={lab} />
      <section className="panel">
        <form className="controls" onSubmit={run}>
          <label>
            Document
            <select
              value={documentId || lab.data?.documents[0]?.id || ""}
              onChange={(e) => setDocumentId(e.target.value)}
            >
              {lab.data?.documents.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chunk size (estimated tokens)
            <input
              type="number"
              min="20"
              max="2000"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label>
            Overlap
            <input
              type="number"
              min="0"
              max="500"
              value={overlap}
              onChange={(e) => setOverlap(Number(e.target.value))}
            />
          </label>
          <button disabled={!lab.data?.documents.length} className="primary">
            Preview chunks →
          </button>
        </form>
      </section>
      {(error || lab.error) && (
        <div className="error">{error || lab.error}</div>
      )}
      {result && (
        <>
          <div className="notice">
            {result.chunks.length} chunks ·{" "}
            {result.chunks.reduce((s, c) => s + c.tokenCount, 0)} estimated
            tokens · {overlap} token overlap
          </div>
          <div className="grid">
            {result.chunks.map((c) => (
              <section className="panel" key={c.chunkIndex}>
                <h3>
                  CHUNK {c.chunkIndex + 1} / {c.heading}
                </h3>
                <div className="chunk-bar">
                  <div
                    className="chunk-range"
                    style={{
                      left: `${(100 * c.start) / result.content.length}%`,
                      width: `${(100 * (c.end - c.start)) / result.content.length}%`,
                    }}
                  />
                </div>
                <p className="code">
                  Offsets {c.start}–{c.end} · {c.tokenCount} tokens
                </p>
                <pre className="code-block">{c.content}</pre>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
