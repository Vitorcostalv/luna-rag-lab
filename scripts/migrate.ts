import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { resultRows } from "../src/db/rows";
export async function migrate() {
  const db = getDb();
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS luna_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const files = (await readdir("src/db/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const applied = await db.execute(
      sql`SELECT name FROM luna_migrations WHERE name=${file}`,
    );
    if (resultRows(applied).length) continue;
    const source = await readFile(`src/db/migrations/${file}`, "utf8");
    for (const statement of source
      .split("--> statement-breakpoint")
      .filter((s) => s.trim()))
      await db.execute(sql.raw(statement));
    await db.execute(sql`INSERT INTO luna_migrations (name) VALUES (${file})`);
    console.log(`Applied ${file}`);
  }
}
if (process.argv[1]?.endsWith("migrate.ts"))
  migrate()
    .then(closeDb)
    .catch(async (error) => {
      console.error(error.message);
      await closeDb();
      process.exitCode = 1;
    });
