Import Prices Pipeline — Phase 1

Overview
- The `import-prices` Edge Function now supports three explicit branches:
  - health: Fast check used by CI; verifies token and performs a cheap DB connectivity check; never calls the heavy RPC.
  - pipeline_test: Logs a run row in `admin.import_runs`, then wraps the existing `admin.import_prices_do` RPC with success/failure recording.
  - default: Legacy full import behavior; unchanged for existing callers that do not send health/pipeline_test payloads.

Branches
- health
  - Triggered when request body contains any of: `{ "health": true }`, `{ "ping": 1 }`, or `{ "source": "bridge_health" }`.
  - Performs a minimal DB check (`head` select on a small public table) and returns immediately.
  - Response example: `{ "ok": true, "kind": "health", "db": "ok", "ts": "..." }`.
  - CI probe payload: `{ "ping": 1, "source": "bridge_health" }` with headers `apikey` and `x-bridge-token`.

- pipeline_test
  - Triggered when `body.mode === "pipeline_test"`.
  - Inserts a row in `admin.import_runs` with `kind = 'pipeline_test'`, `scope = <body>`, `status = 'running'`, `started_at = now()`.
  - Calls `admin.import_prices_do` (unchanged semantics) and updates the same row:
    - On success: `status = 'success'`, `finished_at = now()`.
    - On failure: `status = 'failed'`, `finished_at = now()`, `error = <message>`.
  - Returns a JSON object including the recorded `run_id` and status.

- default (full import)
  - Preserves current behavior for existing callers; calls `admin.import_prices_do` with the request payload.

Logging
- Greppable prefixes in function logs:
  - `[IMPORT-PRICES] health.*`
  - `[IMPORT-PRICES] pipeline_test.*`
  - `[IMPORT-PRICES] full.*`

External Auth Pattern
- All external calls to `functions/v1/import-prices` must use these headers:
  - `apikey: $SUPABASE_PUBLISHABLE_KEY`
  - `Authorization: Bearer $PROD_BEARER_JWT` (JWT supplied via secrets; not minted here)
  - `x-bridge-token: $BRIDGE_IMPORT_TOKEN`
  - `Content-Type: application/json`
- Do not send Authorization with the publishable key. Do not use legacy SRK envs.
- Health payload: `{ "ping": 1, "source": "bridge_health" }`

admin.import_runs
- Created via Phase 1 migration (`supabase/migrations/*admin_import_runs.sql`).
- Schema:
  - `id uuid primary key default gen_random_uuid()`
  - `created_at timestamptz not null default now()`
  - `kind text not null` — e.g., `pipeline_test` or `full_import`
  - `scope jsonb`
  - `status text not null default 'pending'` — one of `pending | running | success | failed`
  - `started_at timestamptz`
  - `finished_at timestamptz`
  - `error text`
- Indexes:
  - `(status, created_at desc)`
  - `(kind, created_at desc)`

Notes
- No changes to Flutter code, other Edge Functions, RLS, or existing tables/views.
- CI workflow in the external `grookai-ci` repo posts the health payload and treats non-200 as failure.

Local Test Script
- Use `scripts/test_import_prices_health.ps1` with these env vars:
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ACCESS_JWT`, `BRIDGE_IMPORT_TOKEN`.
  - Sends the required headers to `POST $SUPABASE_URL/functions/v1/import-prices`.
