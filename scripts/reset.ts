import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { seed } from "./seed";
async function main() {
  if (
    process.env.DATABASE_MODE === "postgres" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Reset is restricted to the local development database.");
  await getDb().execute(sql`DROP SCHEMA public CASCADE`);
  await getDb().execute(sql`CREATE SCHEMA public`);
  await seed();
}
main()
  .then(closeDb)
  .catch(async (e) => {
    console.error(e.message);
    await closeDb();
    process.exitCode = 1;
  });
