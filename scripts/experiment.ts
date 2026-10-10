import "dotenv/config";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { checkAccess } from "../src/core/agents/access-agent";
import { ingestDocument } from "../src/core/ingestion/ingest";
import { evaluate } from "../src/core/evaluation/evaluator";
import { closeDb } from "../src/db/client";
import type { Mode } from "../src/core/rag/types";
async function main() {
  const access = await checkAccess("admin", "demo"),
    reports = [];
  const configurations = [
    { size: 300, overlap: 0, topK: 3, threshold: 0.08, mode: "SEMANTIC" },
    { size: 600, overlap: 100, topK: 5, threshold: 0.08, mode: "HYBRID" },
    {
      size: 900,
      overlap: 150,
      topK: 10,
      threshold: 0.3,
      mode: "HYBRID_RERANK",
    },
  ];
  const docs = await Promise.all(
    (await readdir("knowledge"))
      .filter((f) => f.endsWith(".md"))
      .map(async (source) => ({
        source,
        title: source,
        content: await readFile(`knowledge/${source}`, "utf8"),
        mimeType: "text/markdown",
      })),
  );
  try {
    for (const c of configurations) {
      for (const doc of docs)
        await ingestDocument(
          { ...doc, size: c.size, overlap: c.overlap },
          access,
        );
      reports.push({
        ...c,
        report: await evaluate({
          mode: c.mode as Mode,
          topK: c.topK,
          threshold: c.threshold,
        }),
      });
    }
    await mkdir("reports", { recursive: true });
    await writeFile(
      "reports/latest-experiment.json",
      JSON.stringify(reports, null, 2),
    );
    console.log(
      reports.map((r) => ({ config: r.mode, summary: r.report.summary })),
    );
  } finally {
    for (const doc of docs) await ingestDocument(doc, access);
  }
}
main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e.message);
    await closeDb();
    process.exitCode = 1;
  });
