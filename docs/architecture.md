# Arquitetura

App Router fornece páginas e rotas Node. Componentes interativos são client components; SDKs, banco e providers são módulos server-side. Nenhuma chave é exposta em NEXT_PUBLIC.

PlannerAgent é determinístico e valida PlannedAction com Zod. AccessAgent carrega membership e role do banco. Orchestrator verifica acesso e propriedade da conversa, preserva estado e executa RAG e AnalyticsTool em paralelo quando ambos são necessários.

Retrieval executa embeddings cacheados por checksum+modelo, cosine search por projeto, full-text search e RRF explícito. ContextBuilder e CitationValidator são puros. ResponseAgent usa um adapter de AI SDK v7/OpenAI Responses, gateway ou mock. Eventos NDJSON mostram estados e conclusão de estágios em tempo real. Deltas da resposta são enviados após geração e validação de citações, não durante a chamada paga: isso impede IDs inválidos no frontend.

Drizzle compartilha schema entre PGlite e Neon. Migrations SQL são aplicadas explicitamente; não executam no build. Scripts devem rodar sem um servidor local concorrente porque PGlite possui um único processo proprietário por diretório. Para testes, use banco em memória; para uma segunda instância, use PGLITE_PATH distinto.

Trace, mensagens, hits, auditoria e quotas são persistidos. O rate limiter é por instância e não substitui rate limiting distribuído em produção. O seletor de identidade é propositalmente de demonstração, não autenticação segura.
