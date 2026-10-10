export const config = {
  topK: Number(process.env.RAG_TOP_K || 6),
  threshold: Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.08),
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 700),
  overlap: Number(process.env.RAG_CHUNK_OVERLAP || 120),
  rrfK: Number(process.env.RAG_RRF_K || 60),
  contextBudget: Number(process.env.RAG_CONTEXT_BUDGET || 2800),
  monthlyLimit: Number(process.env.MONTHLY_TOKEN_LIMIT || 3000000),
  dimensions: 256,
};
