"use client";
import { useState } from "react";
import { useLab, fetchJson } from "@/components/lab/use-lab";
import { Identity } from "@/components/lab/identity";
type Detail = {
  document: { title: string; content: string };
  chunks: {
    id: string;
    content: string;
    heading: string;
    tokenCount: number;
    chunkIndex: number;
    embeddingModel: string;
  }[];
};
export function Knowledge() {
  const lab = useLab(),
    [detail, setDetail] = useState<Detail>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function inspect(id: string) {
    try {
      setDetail(
        await fetchJson<Detail>(
          `/api/documents?${new URLSearchParams({ ...lab.identity, id })}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function mutate(method: "PATCH" | "DELETE", id: string) {
    setBusy(true);
    setError("");
    try {
      await fetchJson("/api/documents", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lab.identity, id }),
      });
      await lab.reload();
      setDetail(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("userId", lab.userId);
    form.set("projectId", lab.projectId);
    setBusy(true);
    setError("");
    try {
      await fetchJson("/api/documents", { method: "POST", body: form });
      await lab.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <span className="eyebrow">CORPUS / SOURCE MANAGEMENT</span>
      <h1>Knowledge base</h1>
      <p>
        Documentos sintéticos, chunks inspecionáveis e embeddings persistidos.
      </p>
      <Identity lab={lab} />
      {(error || lab.error) && (
        <div role="alert" className="error">
          {error || lab.error}
        </div>
      )}
      <section className="panel">
        <form onSubmit={upload} className="controls">
          <label>
            Upload document · max 5 MB
            <input
              name="file"
              type="file"
              accept=".md,.txt,.json,.csv,.pdf"
              required
            />
          </label>
          <button
            disabled={
              busy || lab.userId !== "admin" || lab.data?.canWrite === false
            }
            className="primary"
          >
            Upload & index
          </button>
        </form>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Source / document</th>
                <th>Status</th>
                <th>Chunks / tokens</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lab.data?.documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong>
                    <br />
                    <span className="muted code">{d.source}</span>
                  </td>
                  <td>
                    <span className="tag">{d.status}</span>
                    <br />
                    Embedding:{" "}
                    {(d.metadata.ingestion as { model?: string })?.model || "—"}
                  </td>
                  <td>
                    {d.chunkCount} / {d.tokens}
                  </td>
                  <td>{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div className="controls">
                      <button onClick={() => inspect(d.id)}>Inspect</button>
                      <button
                        disabled={
                          busy ||
                          lab.userId !== "admin" ||
                          lab.data?.canWrite === false
                        }
                        onClick={() => mutate("PATCH", d.id)}
                      >
                        Reindex
                      </button>
                      <button
                        disabled={
                          busy ||
                          lab.userId !== "admin" ||
                          lab.data?.canWrite === false
                        }
                        className="danger"
                        onClick={() => mutate("DELETE", d.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {detail && (
        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel-title">
            <h2>{detail.document.title}</h2>
            <button onClick={() => setDetail(undefined)}>Close</button>
          </div>
          {detail.chunks.map((c) => (
            <details key={c.id} open>
              <summary>
                Chunk {c.chunkIndex + 1} / {c.heading} / {c.tokenCount} tokens /{" "}
                {c.embeddingModel}
              </summary>
              <pre className="code-block">{c.content}</pre>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
