import recorded from "@/demo/evaluations.json";
import safety from "@/demo/safety.json";
import { publicReplay } from "@/core/security/session";
import { getDb } from "@/db/client";
import { evaluationRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { apiError } from "@/lib/api";
export async function GET(request: Request) {
  if (publicReplay(request))
    return Response.json({
      ...recorded,
      safety: safety.results,
      mode: "recorded mock",
    });
  try {
    return Response.json({
      results: await getDb()
        .select()
        .from(evaluationRuns)
        .orderBy(desc(evaluationRuns.createdAt))
        .limit(20),
      safety: safety.results,
      mode: "live history; recorded safety",
    });
  } catch (e) {
    return apiError(e);
  }
}
