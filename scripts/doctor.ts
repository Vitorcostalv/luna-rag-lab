import "dotenv/config";
import { sql, count } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { documents, chunks } from "../src/db/schema";
async function main() {
  console.log({
    node: process.version,
    nodeSupported: Number(process.versions.node.split(".")[0]) >= 22,
    databaseMode: process.env.DATABASE_MODE || "pglite",
    provider: process.env.AI_PROVIDER || "mock",
    openaiKeyConfigured: !!process.env.OPENAI_API_KEY,
    chatModelConfigured: !!process.env.OPENAI_CHAT_MODEL,
  });
  const db = getDb();
  console.log(
    "Vector extension:",
    await db.execute(
      sql`select extversion from pg_extension where extname = 'vector'`,
    ),
  );
  console.log(
    "Migrations:",
    await db.execute(sql`select name from luna_migrations`),
  );
  console.log(
    "Documents:",
    await db.select({ count: count() }).from(documents),
  );
  console.log("Chunks:", await db.select({ count: count() }).from(chunks));
}
main()
  .then(closeDb)
  .catch(async (e) => {
    console.error("Doctor:", e.message, "Run pnpm db:seed.");
    await closeDb();
    process.exitCode = 1;
  });
