import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { resultRows } from "../src/db/rows";
import { seed } from "./seed";
async function main() {
  if (process.env.DATABASE_MODE !== "postgres" || !process.env.DATABASE_URL)
    throw new Error("DATABASE_MODE=postgres and DATABASE_URL are required");
  const url = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid PostgreSQL URL");
  // Never print connection strings or provider errors containing credentials.
  await getDb().execute(sql`select 1`);
  process.env.AI_PROVIDER = "mock";
  await seed();
  const rows = resultRows<{
    documents: number;
    chunks: number;
    facts: number;
    vector: string;
  }>(
    await getDb().execute(
      sql`select (select count(*) from documents where project_id='demo')::int as documents,(select count(*) from chunks where project_id='demo')::int as chunks,(select count(*) from analytics where project_id='demo')::int as facts,(select extversion from pg_extension where extname='vector') as vector`,
    ),
  );
  const integrity = rows[0];
  if (
    !integrity?.vector ||
    integrity.documents < 9 ||
    integrity.chunks < 9 ||
    integrity.facts !== 8064
  )
    throw new Error("Synthetic integrity check failed");
  console.log(
    JSON.stringify({
      available: true,
      migrations: "applied",
      seed: "idempotent synthetic",
      embeddingProvider: "mock; reindex for real provider",
      integrity,
    }),
  );
}
main()
  .finally(closeDb)
  .catch(() => {
    console.error(
      "Production bootstrap failed. Check DATABASE_MODE, DATABASE_URL, database connectivity and pgvector support. No credentials were logged.",
    );
    process.exitCode = 1;
  });
