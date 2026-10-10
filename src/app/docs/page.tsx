import { readFile } from "node:fs/promises";
const files = [
  "functional-report-v2",
  "deployment-v2",
  "rag-fundamentals",
  "rag-vs-finetuning",
  "rag-vs-tools",
  "evaluation",
  "experiments",
  "architecture",
  "future-integration",
];
export default async function Page() {
  const notes = await Promise.all(
    files.map(async (name) => ({
      name,
      content: await readFile(`docs/${name}.md`, "utf8"),
    })),
  );
  return (
    <main>
      <span className="eyebrow">FIELD NOTES / LEARN BY INSPECTION</span>
      <h1>RAG field notes</h1>
      <p>Conceitos e limites do laboratório.</p>
      <div className="panel">
        {notes.map((n) => (
          <details key={n.name}>
            <summary>{n.name}</summary>
            <div className="doc-prose">{n.content}</div>
          </details>
        ))}
      </div>
    </main>
  );
}
