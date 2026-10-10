"use client";
import type { Lab } from "./use-lab";
export function Identity({ lab }: { lab: Lab }) {
  if (lab.data?.accessMode === "owner")
    return (
      <div className="identity">
        <strong>VERIFIED OWNER · SYNTHETIC PROJECT</strong>
        <span className="tag">{lab.data.provider}</span>
        <a href="/owner">Manage session</a>
      </div>
    );
  const current = lab.data?.quota.filter(
    (q) => q.cycleStart === new Date().toISOString().slice(0, 7) + "-01",
  )[0];
  const used = current
    ? current.inputTokens +
      current.outputTokens +
      current.cachedTokens +
      current.otherTokens
    : 0;
  if (lab.data?.executionMode === "snapshot")
    return (
      <div className="identity notice">
        <strong>PUBLIC DEMO · RECORDED MOCK</strong>
        <span>Synthetic data · read only · no live AI or database writes</span>
        <small>
          Recorded {new Date(lab.data.generatedAt!).toLocaleDateString("pt-BR")}
          . Owner access requires a verified server session.
        </small>
      </div>
    );
  return (
    <div className="identity">
      <label>
        Demo user
        <select
          value={lab.userId}
          onChange={(e) => {
            lab.setUserId(e.target.value);
            lab.setProjectId("demo");
          }}
        >
          {(lab.data?.users || [{ id: "admin", name: "Admin Demo" }]).map(
            (u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ),
          )}
        </select>
      </label>
      <label>
        Project
        <select
          value={lab.projectId}
          onChange={(e) => lab.setProjectId(e.target.value)}
        >
          {(
            lab.data?.projects || [
              { id: "demo", name: "Synthetic Retail Observatory" },
            ]
          ).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <span className="tag">{lab.data?.provider || "mock"} provider</span>
      <span className="muted code">
        Cycle usage: {used.toLocaleString("pt-BR")} tokens
      </span>
      <small>Demo identity — not production authentication</small>
    </div>
  );
}
