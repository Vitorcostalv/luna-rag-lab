"use client";
import { useState } from "react";
import { useLab } from "./use-lab";
import { Identity } from "./identity";
import { Inspector } from "@/components/inspector/inspector";
import type { RunResult } from "@/core/orchestrator";
export function Runs() {
  const lab = useLab(),
    [run, setRun] = useState<RunResult>();
  return (
    <main>
      <span className="eyebrow">AUDIT / EXECUTION HISTORY</span>
      <h1>Recorded runs</h1>
      <p>Persisted traces for the selected demonstration identity.</p>
      <Identity lab={lab} />
      {lab.error && <div className="error">{lab.error}</div>}
      <div className="grid">
        <section className="panel">
          {lab.data?.runs.map((r) => (
            <div
              key={r.id}
              style={{
                borderBottom: "1px solid var(--line)",
                padding: "14px 0",
              }}
            >
              <h3>{r.query}</h3>
              <p className="code">
                {r.mode} · {r.durationMs.toFixed(0)} ms ·{" "}
                {new Date(r.createdAt).toLocaleString("pt-BR")}
              </p>
              <button onClick={() => setRun(r.result)}>Inspect run</button>
            </div>
          ))}
          {!lab.data?.runs.length && <p>No recorded runs.</p>}
        </section>
        <Inspector result={run} mobileOpen />
      </div>
    </main>
  );
}
