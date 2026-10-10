import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../schema";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function createPglite() {
  const path = process.env.PGLITE_PATH || ".data/pglite";
  if (path !== "memory://") mkdirSync(dirname(path), { recursive: true });
  const client = new PGlite(path, { extensions: { vector } });
  return { db: drizzle(client, { schema }), close: () => client.close() };
}
