# Public deployment and operational modes

Production: https://luna-rag-lab.vercel.app

Repository: https://github.com/Vitorcostalv/luna-rag-lab

Existing Vercel project: `vitorcostalvs-projects/luna-rag-lab`, ID `prj_sFcPDKtJjmUs0F8qXFdr2r4qPLG9`. No existing unrelated project was changed. Vercel deployment authentication was disabled for this public synthetic project; application owner authentication remains mandatory for writes.

## Current public mode

With no production PostgreSQL configuration, the server defaults to snapshot mode. Anonymous requests always use the versioned public fixtures, including when a future owner database is configured. The snapshot contains nine synthetic corpus documents and 64 original mock runs, including recorded follow-ups. The restricted project and uploaded files are excluded. Four isolated experiment configurations, four 15-question benchmarks and eight safety cases are exported separately.

The public API does not initialize PGlite, call OpenAI or persist requests. Unknown questions return HTTP 422 with a recorded-example explanation. Public chunking and intent previews run deterministic calculations without persistence. Public configuration controls show the original recording configuration. Administrative API calls return 403 even when their JSON says `userId=admin`. `/api/auth` returns 503 until owner authentication and the production database are configured.

`/api/health` returns the actual application mode and database state. Snapshot availability is distinct from database availability. Live database errors return 503 without connection strings or credentials.

## Enable a synthetic production owner environment

The free Neon installation stopped at required marketplace terms acceptance. The account holder can review them at https://vercel.com/vitorcostalvs-projects/~/integrations/accept-terms/neon?source=cli. Only the free plan was requested; no paid resource was created.

Configure server-side `DATABASE_MODE=postgres`, `DATABASE_URL`, `LAB_MODE=live`, `OWNER_AUTH_SECRET` (at least 32 random characters) and `OWNER_PASSWORD_HASH`. Keep `PUBLIC_DEMO_MODE=false`; production is automatically protected regardless of that flag. Password hashes use `salt:scrypt(password,salt,64).hex`; choose a strong unique password and random salt. `/owner` issues one-hour HMAC-signed HttpOnly/Secure/SameSite=Strict sessions. POST/PATCH/DELETE owner operations require a matching Origin and authoritative admin/demo identity. Shared PostgreSQL counters limit login and live operations across server instances. Anonymous paid access is always disabled.

Run `pnpm db:bootstrap:production` with the production environment before deployment. The command validates PostgreSQL URL configuration and connection, enables pgvector, applies migrations, seeds synthetic fixtures idempotently and verifies document/chunk/fact counts. It never logs a database URL or raw connection error. Embeddings are seeded explicitly with mock features; reindex as owner after switching embedding provider/model. Stop any local PGlite app before local database CLI work.

For real OpenAI configure `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`. For gateway configure the documented gateway variables instead. No real provider credentials have been used or verified. Embedding models must match the configured provider in experiments; switching to an arbitrary model requires changing server configuration. Experiments retain separate IDs and model identities and never replace the default index.

Generation reserves monthly quota; embedding usage is accounted after provider calls and does not reserve quota in advance. Owner request limits are shared; owner sessions have no immediate revocation list, so logout clears the browser cookie and rotating the signing secret revokes all sessions. The login limiter is account-wide, intentionally independent of spoofable headers. Hosting body/runtime limits can be lower than local limits. Add enterprise SSO, credential lifecycle management, retention cleanup and deployment monitoring before using sensitive content.

## Validate and publish

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:public
vercel deploy --yes
# Validate the preview anonymously before the production release.
vercel deploy --prod --yes
```

`PUBLIC_TEST_URL` runs the public Playwright suite against an actual HTTPS deployment with no local server and no bypass cookie. Desktop and mobile tests inspect citations, guided replay, graph keyboard interaction, experiment downloads, category benchmarks, write denial, health and all content routes. Actual screenshots are stored in `docs/screenshots` and excluded from deployment uploads.

Generate updated recordings only from the synthetic local corpus using `pnpm demo:snapshot` and `pnpm demo:fixtures`; review their contents before committing. These commands force mock mode and are not build hooks. CI never calls paid providers or production migrations.
