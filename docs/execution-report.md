# Execution report

Implementation date: 2026-10-09 (America/Sao_Paulo).

## Implemented

Eight application pages: overview, workbench, knowledge, chunking, evaluations, runs, architecture and docs. The workbench consumes streamed NDJSON pipeline events, validates citations before emitting answer deltas, and displays source details, rankings, context, tokens and traces. Source inspection and Retrieval Map support keyboard interaction. Actual desktop/mobile screenshots are in docs/screenshots.

Ingestion parses Markdown, TXT, JSON, CSV and PDF, normalizes text, preserves headings where practical, chunks with overlap, batches embeddings and caches by content checksum + model. Upload, reindex, inspect and delete are backed by database operations.

Typed planning, backend membership/dataset permissions, authorized AnalyticsTool operations, conversation ownership, follow-up filters, disambiguation, monthly generation reservations, embedding usage accounting, per-instance chat rate limiting and audit persistence are implemented.

## Architecture

Next.js 16.4.0, React, strict TypeScript, Tailwind, Zod, Drizzle and AI SDK 7.0.137. Deterministic planner and access modules keep LLM calls confined to the response provider. OpenAI uses Responses through an adapter. Mock embeddings and responses make local tests reproducible without external services; gateway has a configurable adapter.

The domain shares a Drizzle schema across PGlite and Neon. Generation and database persistence have separate modules; API routes coordinate validated requests rather than contain the RAG algorithm. Context, chunking, RRF and citations are explicit TypeScript implementations.

## Database

PGlite 0.5.8 with pgvector extension 0.8.1 successfully created and migrated. Local persistence is .data/pglite. Seed created two synthetic projects, four demo users, memberships, six sites, twelve devices and 8,064 analytics facts. Demo corpus has nine documents; the isolated project contains one access-test fixture. All records are synthetic.

Migrations and seed were executed locally; the ingestion command verified repeatable indexing and cache reuse. Doctor verified runtime, vector extension, migration ledger, ten total documents and ten total chunks. Stop the app before database CLI work to avoid competing PGlite owners.

Neon is supported by the production adapter but was not provisioned or connected; DATABASE_URL was not supplied. Production database connectivity and provider billing have not been tested with credentials.

## RAG

Semantic cosine search, Portuguese full-text search, concurrent hybrid retrieval, manual Reciprocal Rank Fusion, deterministic reranking, diverse token-bounded context and validated clickable citations are implemented. Queries and documents are filtered by project; semantic vectors also require matching model identities.

Strategy comparison shows measured hits, scores, latency, context size and MRR when ground truth exists. Experiment configurations were executed with chunk/overlap/topK/threshold variations and the default corpus was restored.

## Tests

45 Vitest tests passed: 22 unit tests and 23 integration tests. Integration uses an actual PostgreSQL engine in PGlite, exercises all implemented aggregation operations, isolates permissions, checks numeric routing, memory/disambiguation, quotas, cache behavior and parses a real generated PDF fixture.

8 Playwright E2E tests passed across desktop and mobile: app opening, chat events and answer, citation dialog, inspector, strategy comparison, knowledge inspection, chunk preview and evaluation.

The deterministic evaluation suite passed 15/15 cases in the default mock configuration. The measured baseline had Hit Rate 1, Recall 1 and MRR approximately 0.889. These synthetic mock metrics are not a claim about real semantic retrieval quality. JSON/Markdown evaluation reports and experimental configuration reports are in the ignored local reports directory.

## Build

pnpm install, pnpm lint, pnpm typecheck, pnpm test and pnpm build completed successfully. Next.js produced eight content routes, the not-found route and four Node API routes. No OpenAI key was used by tests or build. CI performs frozen install, lint, typecheck, unit/integration tests and production build on Node 22.

## Git

Initial conventional commit: 2b9f4f2 — feat: initialize luna rag lab. Branch: main. Remote: https://github.com/Vitorcostalv/luna-rag-lab.git. Local runtime data, provider secrets, Vercel linkage and generated reports are excluded from Git. .env.example is intentionally included and contains no key values.

## GitHub

Public repository created and pushed: https://github.com/Vitorcostalv/luna-rag-lab. MIT license, contribution/security guidance, recommended topics and CI workflow included.

## Vercel

Created and linked the separate project vitorcostalvs-projects/luna-rag-lab without altering existing projects. No deployment was attempted because the production PostgreSQL environment is unconfigured. After configuring Neon and server-side environment variables, migrate/seed against that database and deploy the linked project with vercel --prod.

## Environment variables required

Local mock mode needs no secrets. Real OpenAI: AI_PROVIDER, OPENAI_API_KEY, OPENAI_CHAT_MODEL, OPENAI_EMBEDDING_MODEL. Production database: DATABASE_MODE=postgres, DATABASE_URL. Optional gateway: AI_GATEWAY_API_KEY, GATEWAY_CHAT_MODEL, GATEWAY_EMBEDDING_MODEL. Retrieval and quota settings are documented in .env.example and README.

## How to run

```powershell
Set-Location 'C:\Users\jasmi\OneDrive\projetos\WorkSpace\luna-rag-lab'
pnpm dev
```

Open http://localhost:3000. The local database is already seeded. For a fresh clone: pnpm install, copy .env.example to .env, pnpm db:migrate, pnpm db:seed, then pnpm dev. Use pnpm run doctor because pnpm doctor is a built-in package-manager command.

## Known limitations

- Demo identity selection is intentional impersonation for study; replace it with verified authentication before handling private content or exposing paid endpoints.
- Mock embeddings are deterministic hash features; real OpenAI and Neon connectivity were not verified without credentials. Reindex when switching provider/model.
- The planner uses explicit Portuguese patterns and supports the documented conversational cases; arbitrary natural language and dates can require clarification.
- Token budgets estimate characters/4. Paid generation usage and uncached embedding usage are reported by the provider; embedding calls themselves do not reserve quota. Rate limiting is per-process.
- Reranking is heuristic. ENABLE_LLM_RERANKER is a reserved optional setting and no LLM judge is implemented. Citation validation checks IDs, not semantic entailment; known injection-pattern filtering and mock tests do not guarantee resistance to unseen attacks.
- State events stream during execution; response deltas follow generation and citation validation, rather than directly streaming unvalidated model output.
- Synthetic facts cover April and October 2026. Logical datasets share one fact table and use simple averages for percentage and time metrics. The uploaded corpus is small by design.
- No production deployment is live. Hosting request limits may be lower than the local upload limit.
