import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { config } from "@/lib/config";
import { resultRows } from "@/db/rows";
export function withinQuota(
  used: number,
  reservation: number,
  limit = config.monthlyLimit,
) {
  return used + reservation <= limit;
}
export function cycleDates(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export async function reserveQuota(userId: string, amount: number) {
  const cycle = cycleDates(),
    db = getDb();
  await db.execute(
    sql`insert into token_cycles (user_id,cycle_start,cycle_end) values (${userId},${cycle.start},${cycle.end}) on conflict do nothing`,
  );
  const result = await db.execute(
    sql`update token_cycles set other_tokens = other_tokens + ${amount} where user_id = ${userId} and cycle_start = ${cycle.start} and blocked = false and input_tokens + output_tokens + cached_tokens + other_tokens + ${amount} <= ${config.monthlyLimit} returning user_id`,
  );
  if (resultRows(result).length === 0)
    throw new Error(
      "Monthly token quota exceeded. Retrieval inspection remains available.",
    );
  return cycle;
}
export async function recordOtherTokens(userId: string, tokens: number) {
  const cycle = cycleDates();
  await getDb().execute(
    sql`insert into token_cycles (user_id,cycle_start,cycle_end,other_tokens) values (${userId},${cycle.start},${cycle.end},${tokens}) on conflict (user_id,cycle_start) do update set other_tokens = token_cycles.other_tokens + ${tokens}`,
  );
}
export async function settleQuota(
  userId: string,
  reserved: number,
  usage: { inputTokens: number; outputTokens: number; cachedTokens: number },
) {
  const { start } = cycleDates();
  await getDb().execute(
    sql`update token_cycles set other_tokens = greatest(0,other_tokens - ${reserved}), input_tokens = input_tokens + ${usage.inputTokens}, output_tokens = output_tokens + ${usage.outputTokens}, cached_tokens = cached_tokens + ${usage.cachedTokens} where user_id = ${userId} and cycle_start = ${start}`,
  );
}
