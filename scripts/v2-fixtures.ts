import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { seed } from "./seed";
import { closeDb } from "../src/db/client";
import {
  runExperiment,
  defaultExperiment,
} from "../src/core/experiments/runner";
import { safetySuite } from "../src/core/security/safety-suite";
import { evaluate } from "../src/core/evaluation/evaluator";
async function main() {
  process.env.AI_PROVIDER = "mock";
  process.env.DATABASE_MODE = "pglite";
  await seed();
  const experiments = [];
  for (const changes of [
    {},
    { chunkSize: 120, overlap: 20, topK: 3, contextBudget: 600 },
    { chunkSize: 1000, overlap: 160, topK: 8, threshold: 0.15 },
    { mode: "LEXICAL" as const, chunkSize: 300, overlap: 40 },
  ])
    experiments.push(
      await runExperiment("O que significa OTS?", {
        ...defaultExperiment,
        ...changes,
      }),
    );
  const safety = await safetySuite();
  const evaluations = [];
  for (const mode of [
    "SEMANTIC",
    "LEXICAL",
    "HYBRID",
    "HYBRID_RERANK",
  ] as const)
    evaluations.push(await evaluate({ mode, topK: 6, threshold: 0.08 }));
  await writeFile(
    "src/demo/experiments.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "recorded mock",
        results: experiments,
      },
      null,
      2,
    ),
  );
  await writeFile(
    "src/demo/safety.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: "recorded deterministic checks",
        results: safety,
      },
      null,
      2,
    ),
  );
  await writeFile(
    "src/demo/evaluations.json",
    JSON.stringify(
      { generatedAt: new Date().toISOString(), results: evaluations },
      null,
      2,
    ),
  );
  console.log(
    `V2 fixtures: ${experiments.length} isolated experiments, ${safety.filter((s) => s.passed).length}/${safety.length} safety cases, ${evaluations.length} benchmarks`,
  );
}
main()
  .finally(closeDb)
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
