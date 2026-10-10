# V2 execution report

Implementation and validation: 2026-10-09, America/Sao_Paulo.

## Public release

Public HTTPS application: https://luna-rag-lab.vercel.app.

Existing project: `vitorcostalvs-projects/luna-rag-lab` (`prj_sFcPDKtJjmUs0F8qXFdr2r4qPLG9`). The first deployment was automatically assigned to production by Vercel. The complete V2 was then deployed and validated in preview before the final production release.

Validated V2 preview: https://luna-rag-k502sedq7-vitorcostalvs-projects.vercel.app, deployment `dpl_41QeqpnSX9PnoeBUarR4mqS7WNRa`. All 12 public Playwright cases passed against this HTTPS URL, across desktop and mobile, without Vercel authentication or a bypass cookie. No error-level logs were returned for the preview at the time of inspection. Final production metadata and smoke results are recorded below after publication.

## Mode and database

The deployed fallback is a read-only public snapshot, clearly labeled recorded mock execution. It contains nine synthetic documents, nine chunks and 64 original pipeline runs (16 questions × four strategies). Recorded follow-ups include the original inherited state; public messages do not create a new persisted conversation. Unknown queries are rejected with a guided-example explanation. Deterministic chunk and intent previews remain interactive without database writes.

The local PGlite/pgvector database is migrated and seeded. Four A/B experiment recordings use separate index IDs and model identities, with 9, 21, 9 and 9 chunks respectively; the main corpus is preserved. Eight recorded safety checks passed. Four 15-question benchmark recordings expose measured failures as well as passes.

Production Neon is not provisioned. A free-plan integration installation was attempted and stopped at mandatory account-holder marketplace terms acceptance. No paid resource was created and no internal/customer database was used. No `DATABASE_URL` or real provider key was supplied. The production bootstrap command was verified to fail safely without its required environment and to log no credentials. Successful Neon bootstrap and real OpenAI/gateway calls remain untested.

## Features

Thirteen content routes: overview, workbench, knowledge, knowledge graph, chunking, experiments, datasets, safety, evaluations, runs, architecture, docs and owner access. Ten API routes cover lab, documents, chat, evaluation, experiments, graph, benchmarks, safety, auth and health.

The knowledge graph has seven typed node kinds and provenance on every edge. It supports search, type filters, zoom, drag pan, keyboard pan controls, a keyboard-accessible node list and source details. It represents the versioned public corpus and does not expose private uploads.

A/B experiments validate chunk size/overlap/topK/threshold/mode/context budget/model, create isolated PostgreSQL indexes, compare recall/precision/MRR/latency/tokens, display sources and answers and export actual JSON/CSV. Public visitors choose recorded configurations; only local admin or verified production owner can create persistent experiments. Models must match the configured provider rather than mix incompatible vectors.

The Inspector exposes typed normalization/memory/intent/routing/access decisions, pipeline timings and structured observable outputs. These describe deterministic code behavior, not private chain of thought. Quality analysis reports actual short/long/duplicate candidate chunks, context redundancy, weak scores, missing document evidence and lexical/semantic score disagreement, with explicitly heuristic suggestions. Learning mode uses this run's embedding/retrieval/fusion/context/response records and supports ranked-candidate inspection, context-budget preview and an explicitly illustrative RRF calculation.

Dataset Explorer shows schema, metrics, filters, aggregations and roles, and deterministically translates editable questions into validated intents without executing SQL in the browser. Evaluations offer seven categories, recorded permission/safety cases, persisted pipeline history, compatible benchmark signatures, percentage changes and Markdown export. The functional report gives a page-by-page mode matrix: [functional-report-v2.md](functional-report-v2.md).

## Security

All production writes require a verified HMAC-signed owner session. Browser-supplied admin IDs do not grant access. Owner sessions expire after one hour; cookies use HttpOnly, Secure and SameSite=Strict. Writes require a matching Origin and admin/demo identity. Auth login and live owner operations use shared PostgreSQL counters. Anonymous paid generation, upload, deletion, reindexing and persistent experiments/evaluations are disabled. Secrets and raw provider diagnostics are not returned by health or bootstrap.

Public `/api/health` reports application availability separately from `database.available=false`. Live connection failure returns HTTP 503. The application checks project/dataset permissions before retrieval and tools. Known injection patterns are excluded from mock evidence; source citation IDs are validated before answer deltas. These checks do not guarantee semantic entailment or resistance to unseen injection.

## Validation

The original 45 Vitest tests are preserved. V2 adds 28 tests, for 73 total: 36 unit and 37 integration cases. Tests cover anonymous write denial, replay boundaries, graph schema/provenance, experiment validation and isolation, owner session expiry/signature/origin, authorized owner upload/delete, forged identity, actual safety implementations, inherited decision outputs, visible provider failure and truthful database failure reporting. Integration tests use a real PostgreSQL engine in PGlite. The complete final 73-test suite passed. An attempted concurrent build/test validation exceeded local memory; build and tests then passed separately. CI executes those checks sequentially.

The original eight local Playwright cases passed across desktop and mobile, exercising live mock pipeline, citations, comparison, inspection, chunking and evaluation. Twelve new public-mode cases passed locally and twelve passed against the final preview HTTPS URL. They cover guided execution, source citations, typed decisions, learning mode, anonymous admin denial, graph keyboard/filters/zoom, experiment selection/downloads, safety/datasets/categories, health, all thirteen routes and no horizontal overflow/browser errors.

Lint, strict TypeScript and local production build passed. Vercel preview build passed frozen installation and production compilation. CI now also installs Chromium and runs both Playwright suites on Node 22, alongside lint/typecheck/unit/integration/build. Tests and build use no paid key. Actual desktop/mobile V2 screenshots are in `docs/screenshots`.

Default mock benchmark: 15/15 checks, recall 1 and MRR 0.889. Semantic and hybrid recordings also pass 15/15; lexical passes 12/15 with recall 0.25 and MRR 0.333. These small synthetic mock measurements are not claims about real semantic retrieval quality. Failures remain visible in recorded benchmark reports.

## Remaining configuration and limits

Required for production owner/live: `DATABASE_MODE=postgres`, `DATABASE_URL`, `LAB_MODE=live`, `OWNER_AUTH_SECRET`, `OWNER_PASSWORD_HASH`. Real OpenAI also needs `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`; gateway has its documented alternatives. Values are never included in this report.

Public replay is finite and read-only. Graph/catalog/safety recordings are versioned and require regeneration to reflect corpus changes. Arbitrary Portuguese language and dates can require clarification. Reranking is heuristic, token counts estimate characters/4, numerical percent/time metrics use simple averages, and embedding usage is accounted after calls rather than reserved in advance. Generation deltas follow generation and citation validation. Owner model changes require server configuration and reindexing. Sessions have no individual revocation list; secret rotation revokes all sessions. Add retention cleanup, enterprise SSO and production monitoring before private-content use.

The repository remains https://github.com/Vitorcostalv/luna-rag-lab on `main`; secrets, local runtime data and reports stay ignored. No force push or new repository/project was used.
