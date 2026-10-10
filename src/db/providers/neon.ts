import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
export function createNeon(url: string) {
  return { db: drizzle(neon(url), { schema }), close: async () => {} };
}
