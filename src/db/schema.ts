import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  real,
  vector,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
const created = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const projects = pgTable("projects", {
  id: text().primaryKey(),
  name: text().notNull(),
  slug: text().unique().notNull(),
  description: text().notNull(),
  createdAt: created(),
});
export const users = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  role: text().notNull(),
  createdAt: created(),
});
export const memberships = pgTable(
  "project_memberships",
  {
    projectId: text("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    permission: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);
export const documents = pgTable("documents", {
  id: text().primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id)
    .notNull(),
  title: text().notNull(),
  source: text().notNull(),
  mimeType: text("mime_type").notNull(),
  checksum: text().notNull(),
  status: text().notNull(),
  content: text().notNull(),
  metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const chunks = pgTable(
  "chunks",
  {
    id: text().primaryKey(),
    documentId: text("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    projectId: text("project_id")
      .references(() => projects.id)
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text().notNull(),
    tokenCount: integer("token_count").notNull(),
    heading: text().notNull(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull(),
    embedding: vector({ dimensions: 256 }).notNull(),
    embeddingModel: text("embedding_model").notNull(),
    createdAt: created(),
  },
  (t) => [index("chunks_project_idx").on(t.projectId)],
);
export const embeddingCache = pgTable("embedding_cache", {
  checksum: text().primaryKey(),
  embedding: vector({ dimensions: 256 }).notNull(),
  createdAt: created(),
});
export const conversations = pgTable("conversations", {
  id: text().primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  state: jsonb().notNull().default({}),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const messages = pgTable("messages", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text().notNull(),
  content: text().notNull(),
  metadata: jsonb().notNull().default({}),
  tokenInput: integer("token_input").notNull().default(0),
  tokenOutput: integer("token_output").notNull().default(0),
  createdAt: created(),
});
export const retrievalRuns = pgTable("retrieval_runs", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  messageId: text("message_id")
    .references(() => messages.id)
    .notNull(),
  query: text().notNull(),
  normalizedQuery: text("normalized_query").notNull(),
  retrievalMode: text("retrieval_mode").notNull(),
  topK: integer("top_k").notNull(),
  threshold: real().notNull(),
  rerankingEnabled: boolean("reranking_enabled").notNull(),
  durationMs: real("duration_ms").notNull(),
  trace: jsonb().notNull(),
  result: jsonb().notNull(),
  createdAt: created(),
});
export const retrievalHits = pgTable(
  "retrieval_hits",
  {
    retrievalRunId: text("retrieval_run_id")
      .references(() => retrievalRuns.id, { onDelete: "cascade" })
      .notNull(),
    chunkId: text("chunk_id")
      .references(() => chunks.id, { onDelete: "cascade" })
      .notNull(),
    semanticScore: real("semantic_score").notNull(),
    lexicalScore: real("lexical_score").notNull(),
    fusedScore: real("fused_score").notNull(),
    rerankScore: real("rerank_score").notNull(),
    finalPosition: integer("final_position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.retrievalRunId, t.chunkId] })],
);
export const auditLogs = pgTable("audit_logs", {
  id: text().primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  projectId: text("project_id")
    .references(() => projects.id)
    .notNull(),
  action: text().notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb().notNull().default({}),
  createdAt: created(),
});
export const tokenCycles = pgTable(
  "token_cycles",
  {
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    cycleStart: text("cycle_start").notNull(),
    cycleEnd: text("cycle_end").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    otherTokens: integer("other_tokens").notNull().default(0),
    blocked: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cycleStart] })],
);
export const sites = pgTable("sites", {
  id: text().primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text().notNull(),
});
export const devices = pgTable("devices", {
  id: text().primaryKey(),
  projectId: text("project_id")
    .references(() => projects.id)
    .notNull(),
  siteId: text("site_id")
    .references(() => sites.id)
    .notNull(),
  name: text().notNull(),
  asset: text().notNull(),
  media: text().notNull(),
  campaign: text().notNull(),
});
export const analytics = pgTable(
  "analytics",
  {
    id: text().primaryKey(),
    projectId: text("project_id")
      .references(() => projects.id)
      .notNull(),
    siteId: text("site_id")
      .references(() => sites.id)
      .notNull(),
    deviceId: text("device_id")
      .references(() => devices.id)
      .notNull(),
    day: text().notNull(),
    hour: integer().notNull(),
    gender: text().notNull(),
    age: text().notNull(),
    ots: integer().notNull(),
    observers: integer().notNull(),
    attention_time: real().notNull(),
    dwell_time: real().notNull(),
    percent_v: real().notNull(),
    v: integer().notNull(),
    vd: integer().notNull(),
  },
  (t) => [index("analytics_project_day_idx").on(t.projectId, t.day)],
);
export const evaluationRuns = pgTable("evaluation_runs", {
  id: text().primaryKey(),
  config: jsonb().notNull(),
  results: jsonb().notNull(),
  summary: jsonb().notNull(),
  createdAt: created(),
});
