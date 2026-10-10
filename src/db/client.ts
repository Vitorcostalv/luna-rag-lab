import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { createPglite } from "./providers/pglite";
import { createNeon } from "./providers/neon";
type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
const globalDb = globalThis as unknown as {
  lunaDb?: { db: Database; close: () => Promise<void> };
};
export function getDb(): Database {
  if (!globalDb.lunaDb) {
    if (process.env.DATABASE_MODE === "postgres") {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URL is required");
      globalDb.lunaDb = createNeon(process.env.DATABASE_URL);
    } else {
      if (process.env.VERCEL)
        throw new Error("Vercel requires DATABASE_MODE=postgres");
      globalDb.lunaDb = createPglite();
    }
  }
  return globalDb.lunaDb.db;
}
export async function closeDb() {
  await globalDb.lunaDb?.close();
  delete globalDb.lunaDb;
}
