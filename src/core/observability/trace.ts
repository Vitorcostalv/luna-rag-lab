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
          ? { keys: Object.keys(result) }
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
