import { retrievalSchema, apiError } from "@/lib/api";
import { rateLimit } from "@/core/security/rate-limit";
import { orchestrate } from "@/core/orchestrator";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = retrievalSchema.parse(await request.json());
    rateLimit(`chat:${body.userId}`);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          await orchestrate(body, send);
        } catch (error) {
          send({ type: "state", data: "ERROR" });
          send({
            type: "error",
            data:
              process.env.NODE_ENV === "production"
                ? "Unable to complete request. Check access and provider configuration."
                : (error as Error).message,
          });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
