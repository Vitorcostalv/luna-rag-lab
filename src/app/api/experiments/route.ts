import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resultRows } from "@/db/rows";
import { apiError } from "@/lib/api";
import { guardOwner, publicReplay } from "@/core/security/session";
import { sharedLimit } from "@/core/security/shared-limit";
import { experimentConfig, runExperiment } from "@/core/experiments/runner";
import recorded from "@/demo/experiments.json";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (publicReplay(request))
    return Response.json({ ...recorded, canRun: false });
  try {
    const history = resultRows<{ result: unknown }>(
      await getDb().execute(
        sql`select result from experiment_runs where project_id='demo' and user_id='admin' and result <> '{}'::jsonb order by created_at desc limit 30`,
      ),
    );
    return Response.json({
      mode: "live",
      canRun: true,
      results: history.map((r) => r.result),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    guardOwner(request);
    await sharedLimit("owner:experiments", 3);
    const body = z
      .object({
        query: z.string().trim().min(1).max(4000),
        a: experimentConfig,
        b: experimentConfig,
      })
      .strict()
      .parse(await request.json());
    const a = await runExperiment(body.query, body.a),
      b = await runExperiment(body.query, body.b);
    return Response.json({ a, b, mode: "live" });
  } catch (e) {
    return apiError(e);
  }
}
