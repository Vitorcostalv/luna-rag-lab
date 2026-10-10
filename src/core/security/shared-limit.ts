import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resultRows } from "@/db/rows";
import { protectedDeployment } from "./session";
export async function sharedLimit(key: string, max = 10, windowMs = 60000) {
  if (!protectedDeployment()) return;
  const window = `${key}:${Math.floor(Date.now() / windowMs)}`;
  const result = await getDb().execute(
    sql`insert into luna_auth_limits(window_key,attempts) values(${window},1) on conflict(window_key) do update set attempts=luna_auth_limits.attempts+1 returning attempts`,
  );
  if ((resultRows<{ attempts: number }>(result)[0]?.attempts || 0) > max)
    throw new Error("Rate limit exceeded");
}
