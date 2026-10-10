import type { PipelineEvent, TraceStage } from "@/core/rag/types";
export class Trace {
  embeddingTokens = 0;
  readonly stages: TraceStage[] = [];
  constructor(private emit: (event: PipelineEvent) => void = () => {}) {}
  state(name: string) {
    this.emit({ type: "state", data: name });
  }
  async stage<T>(
    stage: string,
    input: unknown,
    fn: () => Promise<T>,
  ): Promise<T> {
    const started = performance.now();
    const record: TraceStage = {
      stage,
      status: "running",
      durationMs: 0,
      input,
    };
    this.stages.push(record);
    this.emit({ type: "trace", data: record });
    try {
      const result = await fn();
      record.status = "complete";
      record.durationMs = performance.now() - started;
      record.output = Array.isArray(result)
        ? { count: result.length }
        : typeof result === "object" && result !== null
          ? structuredOutput(stage, result as Record<string, unknown>)
          : result;
      this.emit({ type: "trace", data: record });
      return result;
    } catch (error) {
      record.status = "error";
      record.durationMs = performance.now() - started;
      this.emit({ type: "trace", data: record });
      throw error;
    }
  }
}

function structuredOutput(stage: string, result: Record<string, unknown>) {
  if (stage === "Planner") return result;
  if (stage === "Access")
    return {
      role: result.role,
      projectId: result.projectId,
      analytics: result.analytics,
      write: result.write,
    };
  if (stage === "Tool")
    return {
      tool: result.tool,
      dataset: result.dataset,
      rows: Array.isArray(result.rows) ? result.rows.length : undefined,
      aggregation: result.aggregation,
    };
  if (stage === "Citation Validation")
    return {
      invalid: result.invalid,
      answerCharacters:
        typeof result.text === "string" ? result.text.length : 0,
    };
  if (stage === "Generation")
    return {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedTokens: result.cachedTokens,
      answerCharacters:
        typeof result.text === "string" ? result.text.length : 0,
    };
  return { keys: Object.keys(result) };
}
