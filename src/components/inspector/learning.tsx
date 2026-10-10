"use client";
import { useState } from "react";
import type { RunResult } from "@/core/orchestrator";
import { buildContext } from "@/core/rag/context-builder";
export function Learning({ result }: { result?: RunResult }) {
  const [budget, setBudget] = useState(1000),
    [rank, setRank] = useState(1),
    [rrfK, setRrfK] = useState(60);
  if (!result)
    return (
      <div className="notice">
        Run a question first. Learning mode explains the stages observed in that
        execution.
      </div>
    );
  const embedding = result.trace.find((s) => s.stage === "Embedding"),
    fusion = result.trace.find((s) => s.stage === "Fusion"),
    preview = buildContext(result.hits, budget);
  return (
    <section className="panel" aria-label="Learning mode">
      <span className="eyebrow">LEARNING / THIS EXECUTION</span>
      <h2>{result.action.type}</h2>
      <p>
        {embedding
          ? `Embedding executed with ${JSON.stringify(embedding.input)}. The indexed vectors have 256 dimensions. Cosine compares vector directions; mock hash features do not measure real semantic quality.`
          : "This execution did not embed a question. Inspect whether it used lexical retrieval, a tool or clarification."}
      </p>
      <p>
        Top K: {result.topK}. Returned {result.hits.length} candidates;{" "}
        {result.sources.length} sources entered the original context.
      </p>
      {result.hits.length > 0 && (
        <>
          <label>
            Inspect ranked candidate
            <input
              type="range"
              min="1"
              max={result.hits.length}
              value={Math.min(rank, result.hits.length)}
              onChange={(e) => setRank(Number(e.target.value))}
            />
          </label>
          <pre className="code-block">
            {JSON.stringify(
              result.hits[Math.min(rank, result.hits.length) - 1],
              null,
              2,
            )}
          </pre>
          <label>
            Context budget preview: {budget} estimated tokens
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>
          <p>
            {preview.length} sources fit with diversity and exact-content
            deduplication. This browser preview does not regenerate the answer.
          </p>
        </>
      )}
      {fusion && (
        <>
          <p>
            RRF was observed in this run. It adds rank contributions from the
            semantic and lexical lists. Scores are rank-based, not
            probabilities.
          </p>
          <label>
            Illustrative RRF constant: {rrfK}
            <input
              type="range"
              min="1"
              max="100"
              value={rrfK}
              onChange={(e) => setRrfK(Number(e.target.value))}
            />
          </label>
          <p className="code">
            Example ranks 1 and 2: 1/({rrfK}+1) + 1/({rrfK}+2) ={" "}
            {(1 / (rrfK + 1) + 1 / (rrfK + 2)).toFixed(5)}
          </p>
          <small>
            The ranks in this illustration are examples. Actual fused scores are
            available in the candidate details above.
          </small>
        </>
      )}
      <p>
        Generation{" "}
        {result.mock
          ? "used the deterministic mock response"
          : "used the configured response provider"}
        . Citation validation checks source identifiers; it does not verify
        semantic entailment.
      </p>
    </section>
  );
}
