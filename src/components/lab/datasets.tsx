"use client";
import { useState } from "react";
import { datasets, metrics } from "@/core/tools/intent";
import { plan } from "@/core/agents/planner-agent";
import { emptyState } from "@/core/conversation/conversation-state";
import Link from "next/link";
export function Datasets() {
  const [query, setQuery] = useState(
    "Qual unidade teve maior OTS entre 10 e 15 de abril?",
  );
  const action = plan(
    query,
    emptyState(),
    new Date("2026-10-09T12:00:00-03:00"),
  );
  return (
    <main>
      <span className="eyebrow">TOOLS / STRUCTURED ANALYTICS</span>
      <h1>Dataset explorer</h1>
      <p>
        Veja como uma pergunta vira um intent validado e uma consulta
        autorizada.
      </p>
      <div className="notice">
        Synthetic facts: April and October 2026 · 6 sites · 12 devices · 8,064
        hourly rows. Logical datasets share one fact table. This intent preview
        does not execute a database query or authorize access.
      </div>
      <div className="experiment-grid">
        <section className="panel">
          <h2>Natural language → typed intent</h2>
          <label htmlFor="dataset-question">Question</label>
          <textarea
            id="dataset-question"
            value={query}
            maxLength={4000}
            onChange={(e) => setQuery(e.target.value)}
          />
          <pre className="code-block">{JSON.stringify(action, null, 2)}</pre>
          <p>
            The deterministic planner recognizes metric, aggregation, dimensions
            and filters. The server checks project membership and dataset
            permissions before execution.
          </p>
          <Link
            className="button primary"
            href={`/chat?q=${encodeURIComponent("Qual unidade teve maior OTS entre 10 e 15 de abril?")}`}
          >
            Inspect recorded authorized query →
          </Link>
        </section>
        <section className="panel">
          <h2>Analytical schema</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["project_id", "text", "Server-enforced scope"],
                  ["site_id / device_id", "text", "Synthetic entities"],
                  ["day", "date", "Period filter"],
                  ["hour", "integer", "6–17 fixture range"],
                  [
                    "gender / age",
                    "enum-like text",
                    "Synthetic demographic groups",
                  ],
                  ...metrics.map((m) => [
                    m,
                    ["ots", "observers", "v", "vd"].includes(m)
                      ? "integer"
                      : "real",
                    ["attention_time", "dwell_time", "percent_v"].includes(m)
                      ? "AVG (simple row mean)"
                      : "SUM by default",
                  ]),
                ].map(([col, type, meaning]) => (
                  <tr key={col}>
                    <td className="code">{col}</td>
                    <td>{type}</td>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <h2>Logical datasets and permissions</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Dimensions / filters</th>
              <th>Authorized roles</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((d) => (
              <tr key={d}>
                <td className="code">{d}</td>
                <td>
                  {d === "devices"
                    ? "site, device, asset, media, campaign"
                    : "site, device, start/end, hourStart/hourEnd, gender, age"}
                </td>
                <td>
                  {d.startsWith("demographics")
                    ? "admin, analytics"
                    : "admin, analytics, retail"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Operations: SUM, COUNT, AVG, LIST, DETAIL, TOP, GROUP_BY, COMPARE.
        Public visitors inspect recorded results; they cannot request live
        analytics. Owner mode is limited to the synthetic demo project.
      </p>
    </main>
  );
}
