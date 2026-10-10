CREATE TABLE IF NOT EXISTS experiment_runs (
 id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), user_id text NOT NULL REFERENCES users(id),
 config jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS experiment_chunks (
 id text PRIMARY KEY, experiment_id text NOT NULL REFERENCES experiment_runs(id) ON DELETE CASCADE,
 document_id text NOT NULL, content text NOT NULL, heading text NOT NULL, token_count integer NOT NULL,
 model text NOT NULL, embedding vector(256) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS experiment_chunks_scope ON experiment_chunks(experiment_id,model);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS luna_auth_limits (window_key text PRIMARY KEY, attempts integer NOT NULL);
