# Arquitetura

App Router fornece páginas e rotas Node. Componentes interativos são client components; SDKs, banco e providers são módulos server-side. Nenhuma chave é exposta em NEXT_PUBLIC.

PlannerAgent é determinístico e valida PlannedAction com Zod. AccessAgent carrega membership e role do banco. Orchestrator verifica acesso e propriedade da conversa, preserva estado e executa RAG e AnalyticsTool em paralelo quando ambos são necessários.

Retrieval executa embeddings cacheados por checksum+modelo, cosine search por projeto, full-text search e RRF explícito. ContextBuilder e CitationValidator são puros. ResponseAgent usa um adapter de AI SDK v7/OpenAI Responses, gateway ou mock. Eventos NDJSON mostram estados e conclusão de estágios em tempo real. Deltas da resposta são enviados após geração e validação de citações, não durante a chamada paga: isso impede IDs inválidos no frontend.

Drizzle compartilha schema entre PGlite e Neon. Migrations SQL são aplicadas explicitamente; não executam no build. Scripts devem rodar sem um servidor local concorrente porque PGlite possui um único processo proprietário por diretório. Para testes, use banco em memória; para uma segunda instância, use PGLITE_PATH distinto.

Trace, mensagens, hits, auditoria e quotas são persistidos. The original local rate limiter is per instance. V2 protected live endpoints also use shared PostgreSQL counters. The identity selector is local demo impersonation; production uses verified owner sessions.


## V2 public and owner boundaries

Anonymous production requests use only versioned public snapshots. Verified owner sessions can execute live operations when PostgreSQL and authentication secrets are configured. Server guards run before write body parsing and database/provider access. Signed owner identity is admin/demo; client role selection cannot grant authority. Same-origin checks and Strict cookies protect owner writes. Login, chat, comparison, ingestion, evaluations and experiments use shared PostgreSQL counters in protected live deployments; anonymous paid access is disabled.

Experiments persist a separate index ID, corpus checksum, model identity and config, and query only that index. Their tables are maintained by the explicit SQL migration runner alongside the Drizzle domain schema. Knowledge graph relationships come from explicit metadata/schema mappings. Typed decisions expose normalized questions, previous intent, matching prior filters and planner routing; they do not expose private model reasoning.
