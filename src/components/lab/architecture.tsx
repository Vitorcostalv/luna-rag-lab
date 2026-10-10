"use client";
import { useState } from "react";
const descriptions: Record<string, string> = {
  Question:
    "A pergunta é validada e limitada a 4.000 caracteres. A identidade demo é validada pelo backend.",
  Planner:
    "Módulo determinístico produz um PlannedAction validado com Zod. Herda métrica, entidades e filtros de follow-ups.",
  Access:
    "Membership do projeto e role são verificadas antes de retrieval e AnalyticsTool. Retail não acessa demografia.",
  RAG: "Embedding → semantic e lexical em paralelo → RRF → rerank opcional. Documentos são filtrados por projeto no banco.",
  Tool: "AnalyticsTool valida dataset, métrica, agregação, filtros e dimensões usando allowlist. Drizzle gera consultas parametrizadas.",
  Database:
    "PGlite + pgvector local; PostgreSQL Neon em produção. O domínio usa o mesmo schema Drizzle.",
  Context:
    "Remove duplicatas, preserva diversidade documental e atribui S1, S2… sob orçamento de tokens. ToolResult permanece separado.",
  LLM: "Adapter isolado usa AI SDK Responses. Mock reproduz o pipeline sem chamadas pagas. Documentos são dados não confiáveis.",
  Validation:
    "CitationValidator remove IDs inexistentes antes de emitir resposta. Quota e audit são persistidos.",
  Answer: "A resposta e o trace ficam armazenados e disponíveis no Inspector.",
};
export function Architecture() {
  const [path, setPath] = useState("Hybrid"),
    [selected, setSelected] = useState("Planner");
  const nodes =
    path === "Knowledge"
      ? [
          "Question",
          "Planner",
          "Access",
          "RAG",
          "Context",
          "LLM",
          "Validation",
          "Answer",
        ]
      : path === "Analytics"
        ? [
            "Question",
            "Planner",
            "Access",
            "Tool",
            "Database",
            "Context",
            "LLM",
            "Validation",
            "Answer",
          ]
        : [
            "Question",
            "Planner",
            "Access",
            "RAG",
            "Tool",
            "Context",
            "LLM",
            "Validation",
            "Answer",
          ];
  return (
    <main>
      <span className="eyebrow">SYSTEM DESIGN / FOLLOW THE PATH</span>
      <h1>Architecture observatory</h1>
      <p>
        Selecione uma trilha e inspecione a responsabilidade de cada módulo.
      </p>
      <div className="tabs">
        {["Knowledge", "Analytics", "Hybrid"].map((p) => (
          <button
            className={p === path ? "active" : ""}
            key={p}
            onClick={() => setPath(p)}
          >
            {p} question
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="flow">
          {nodes.map((node, i) => (
            <span key={node}>
              <button
                className={node === selected ? "selected" : ""}
                onClick={() => setSelected(node)}
              >
                {node}
              </button>
              {i < nodes.length - 1 && <span className="muted"> → </span>}
            </span>
          ))}
        </div>
        {path === "Hybrid" && (
          <div className="notice">
            RAG ∥ AnalyticsTool run in parallel after access validation; both
            results meet at ContextBuilder.
          </div>
        )}
        <h2>{selected}</h2>
        <p>{descriptions[selected]}</p>
      </section>
      <div className="grid" style={{ marginTop: 20 }}>
        <section className="panel">
          <h2>Local</h2>
          <p className="code">
            Next.js → Drizzle → PGlite → pgvector
            <br />
            .data/pglite · no Docker
          </p>
        </section>
        <section className="panel">
          <h2>Production</h2>
          <p className="code">
            Vercel Node → Drizzle → Neon → pgvector
            <br />
            No persistent local filesystem
          </p>
        </section>
      </div>
    </main>
  );
}
