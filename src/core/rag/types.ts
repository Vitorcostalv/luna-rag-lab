export type Mode = "SEMANTIC" | "LEXICAL" | "HYBRID" | "HYBRID_RERANK";
export type Hit = {
  id: string;
  documentId: string;
  content: string;
  title: string;
  source: string;
  heading: string;
  tokenCount: number;
  semanticScore: number;
  lexicalScore: number;
  fusedScore: number;
  rerankScore: number;
  finalScore: number;
  rank: number;
  sourceId?: string;
};
export type Source = Hit & { sourceId: string };
export type TraceStage = {
  stage: string;
  status: "running" | "complete" | "error";
  durationMs: number;
  input: unknown;
  output?: unknown;
};
export type PipelineEvent = {
  type: "state" | "trace" | "delta" | "result" | "error";
  data: unknown;
};
