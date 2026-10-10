import { z } from "zod";
export const identitySchema = z.object({
  userId: z.string().min(1).max(100),
  projectId: z.string().min(1).max(100),
});
export const retrievalSchema = identitySchema
  .extend({
    query: z.string().trim().min(1).max(4000),
    mode: z
      .enum(["SEMANTIC", "LEXICAL", "HYBRID", "HYBRID_RERANK"])
      .default("HYBRID"),
    topK: z.number().int().min(1).max(20).default(6),
    threshold: z.number().min(0).max(1).default(0.08),
    conversationId: z.string().uuid().optional(),
  })
  .strict();
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = /access|permission/i.test(message)
    ? 403
    : /quota|rate limit/i.test(message)
      ? 429
      : 400;
  return Response.json(
    {
      error:
        process.env.NODE_ENV === "production" && status === 400
          ? "Invalid request or unavailable service"
          : message,
    },
    { status },
  );
}
