"use client";
import { useEffect, useRef, useState } from "react";
import { fetchJson } from "./use-lab";
import { nodeKinds, type KnowledgeGraph } from "@/core/knowledge/graph";
export function Graph() {
  const [graph, setGraph] = useState<KnowledgeGraph>(),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [selected, setSelected] = useState<string>(),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<
    { x: number; y: number; px: number; py: number } | undefined
  >(undefined);
  useEffect(() => {
    fetchJson<KnowledgeGraph>("/api/graph")
      .then(setGraph)
      .catch((e) => setError(e.message));
  }, []);
  const filtered =
    graph?.nodes.filter(
      (n) =>
        (kind === "all" || n.kind === kind) &&
        n.label.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  const positions = new Map(
    filtered.map((n, i) => [
      n.id,
      { x: (i % 2) * 245 + 15, y: Math.floor(i / 2) * 90 + 20 },
    ]),
  );
  const active = graph?.nodes.find((n) => n.id === selected);
  return (
    <main>
      <span className="eyebrow">CORPUS / PROVENANCE NETWORK</span>
      <h1>Knowledge graph</h1>
      <p>
        Explore relações explícitas entre documentos, chunks, métricas, datasets
        e regras.
      </p>
      <div className="notice">
        Versioned synthetic corpus · every edge has provenance · no inferred LLM
        relationships.
      </div>
      <div className="controls">
        <label>
          Search nodes
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Node type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All types</option>
            {nodeKinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
        >
          Zoom +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
        >
          Zoom −
        </button>
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
        >
          Reset view
        </button>
        <label>
          Pan horizontally
          <input
            type="range"
            min="-1000"
            max="0"
            value={pan.x}
            onChange={(e) =>
              setPan((p) => ({ ...p, x: Number(e.target.value) }))
            }
          />
        </label>
        <label>
          Pan vertically
          <input
            type="range"
            min="-3000"
            max="0"
            value={pan.y}
            onChange={(e) =>
              setPan((p) => ({ ...p, y: Number(e.target.value) }))
            }
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {!graph && !error && <p className="loading">Loading graph…</p>}
      {graph && (
        <div className="experiment-grid">
          <section className="panel">
            <p className="muted">
              Drag to pan. Use sliders or node list with a keyboard.{" "}
              {filtered.length} nodes visible.
            </p>
            <svg
              className="graph-canvas"
              viewBox="0 0 500 520"
              aria-label="Knowledge provenance graph"
              onPointerDown={(e) => {
                if ((e.target as SVGElement).closest('[role="button"]')) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  px: pan.x,
                  py: pan.y,
                };
              }}
              onPointerMove={(e) => {
                if (drag.current) {
                  const factor =
                    500 / e.currentTarget.getBoundingClientRect().width;
                  setPan({
                    x: drag.current.px + (e.clientX - drag.current.x) * factor,
                    y: drag.current.py + (e.clientY - drag.current.y) * factor,
                  });
                }
              }}
              onPointerUp={() => {
                drag.current = undefined;
              }}
            >
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {graph.edges.map((edge) => {
                  const a = positions.get(edge.from),
                    b = positions.get(edge.to);
                  return a && b ? (
                    <line
                      key={edge.id}
                      x1={a.x + 105}
                      y1={a.y + 28}
                      x2={b.x + 105}
                      y2={b.y + 28}
                      stroke="#54727a"
                      opacity=".5"
                    >
                      <title>
                        {edge.relation}: {edge.provenance}
                      </title>
                    </line>
                  ) : null;
                })}
                {filtered.map((n) => {
                  const p = positions.get(n.id)!;
                  return (
                    <g
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${n.kind} ${n.label}`}
                      onClick={() => setSelected(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(n.id);
                        }
                      }}
                    >
                      <rect
                        x={p.x}
                        y={p.y}
                        width="215"
                        height="58"
                        rx="3"
                        fill="#17252b"
                        stroke={n.id === selected ? "#e4b675" : "#6ba9b3"}
                      />
                      <text x={p.x + 10} y={p.y + 18} fill="#e4b675">
                        {n.kind.toUpperCase()}
                      </text>
                      <text x={p.x + 10} y={p.y + 40}>
                        {n.label.slice(0, 27)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            <details>
              <summary>Accessible node list</summary>
              {filtered.map((n) => (
                <button key={n.id} onClick={() => setSelected(n.id)}>
                  {n.kind}: {n.label}
                </button>
              ))}
            </details>
          </section>
          <section className="panel" aria-live="polite">
            <h2>{active?.label || "Select a node"}</h2>
            {active ? (
              <>
                <span className="tag">{active.kind}</span>
                <p>Provenance: {active.provenance}</p>
                <pre className="code-block">
                  {JSON.stringify(active.detail, null, 2)}
                </pre>
                <h3>Relationships</h3>
                {graph.edges
                  .filter((e) => e.from === active.id || e.to === active.id)
                  .map((e) => (
                    <div className="step-evidence" key={e.id}>
                      <strong>{e.relation}</strong>
                      <p>
                        {
                          graph.nodes.find(
                            (n) =>
                              n.id === (e.from === active.id ? e.to : e.from),
                          )?.label
                        }
                      </p>
                      <small>{e.provenance}</small>
                    </div>
                  ))}
              </>
            ) : (
              <p>Node details and documented relationships appear here.</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
