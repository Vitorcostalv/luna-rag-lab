import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { evaluate } from "../src/core/evaluation/evaluator";
import { closeDb } from "../src/db/client";
async function main() {
  const result = await evaluate({
    mode: "HYBRID_RERANK",
    topK: 6,
    threshold: 0.08,
  });
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/latest-evaluation.json",
    JSON.stringify(result, null, 2),
  );
  await writeFile(
    "reports/latest-evaluation.md",
    `# Evaluation\n\nDeterministic checks, not model-based evaluation.\n\n${JSON.stringify(result.summary, null, 2)}\n\n| Question | Passed | MRR |\n|---|---|---|\n${result.results.map((r) => `| ${r.question} | ${r.passed} | ${r.metrics.mrr ?? "N/A"} |`).join("\n")}\n`,
  );
  console.log(result.summary);
}
main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exitCode = 1;
  });
