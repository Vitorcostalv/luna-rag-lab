import { sharedLimit } from "@/core/security/shared-limit";
import { guardOwner } from "@/core/security/session";

import { z } from "zod";
import { identitySchema, apiError } from "@/lib/api";
import { checkAccess, requireWrite } from "@/core/agents/access-agent";
import { evaluate } from "@/core/evaluation/evaluator";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    guardOwner(request);
    await sharedLimit("owner:evaluation", 3);
    const body = identitySchema
      .extend({
        mode: z.enum(["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"]),
        topK: z.number().int().min(1).max(20),
        threshold: z.number().min(0).max(1),
      })
      .strict()
      .parse(await request.json());
    guardOwner(request, body);
    requireWrite(await checkAccess(body.userId, body.projectId));
    return Response.json(await evaluate(body, body.userId, body.projectId));
  } catch (error) {
    return apiError(error);
  }
}
