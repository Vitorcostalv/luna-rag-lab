"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "./use-lab";
import type { SafetyCase } from "@/core/security/safety-suite";
export function Safety() {
  const [data, setData] = useState<{
      generatedAt: string;
      results: SafetyCase[];
    }>(),
    [error, setError] = useState("");
  useEffect(() => {
    fetchJson<{ generatedAt: string; results: SafetyCase[] }>("/api/safety")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main>
      <span className="eyebrow">SECURITY / ADVERSARIAL FIXTURES</span>
      <h1>Safety laboratory</h1>
      <p>
        Resultados observáveis para ataques conhecidos e limites de autorização.
      </p>
      <div className="notice">
        Recorded deterministic checks · mock response provider + real local
        PostgreSQL authorization. Passing these cases does not guarantee
        resistance to unseen attacks or real model behavior.
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="loading">Loading safety cases…</p>}
      {data && (
        <>
          <h2>
            {data.results.filter((r) => r.passed).length}/{data.results.length}{" "}
            cases passed
          </h2>
          <p className="muted">
            Recorded {new Date(data.generatedAt).toLocaleString("pt-BR")}
          </p>
          <div className="experiment-grid">
            {data.results.map((r) => (
              <section className="panel" key={r.id}>
                <span className="tag">{r.passed ? "PASS" : "FAIL"}</span>
                <h2>{r.name}</h2>
                <p>
                  <strong>Input:</strong> {r.input}
                </p>
                <p>
                  <strong>Expected:</strong> {r.expected}
                </p>
                <p>
                  <strong>Actual:</strong> {r.actual}
                </p>
                <details>
                  <summary>Observable trace</summary>
                  <pre className="code-block">
                    {JSON.stringify(r.trace, null, 2)}
                  </pre>
                </details>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
