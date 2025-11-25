# Grookai Vault Backend Workers Guide

## Purpose

Backend workers are the private highway for Grookai Vault. They execute pricing, imports, cron, and system-level tasks using the Supabase service-role key. Edge Functions remain thin, public-facing lanes that validate and hand off to the highway.

## Prerequisites

- Node installed (LTS recommended).
- `@supabase/supabase-js` installed (declared in `package.json`).
- Environment variables set: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (service role).
- Shared client available at `backend/supabase_backend_client.mjs`.

## Folder Structure

```
backend/
  supabase_backend_client.mjs
  pricing/
    import_prices_worker.mjs
  infra/
    system_health_worker.mjs
  jobs/
    (future)
```

## How to Create a New Worker

- Create a file under `backend/<domain>/` (e.g., `backend/jobs/some_job_worker.mjs`).
- Import the shared client from `../supabase_backend_client.mjs`.
- Implement an `async function main()` and call it at the bottom.
- On failure, log clearly and `process.exit(1)`.
- Optionally add an NPM script in `package.json`.
- Optionally add a PowerShell wrapper in `scripts/` (e.g., `scripts/run_some_job_worker.ps1`).

## Supabase Access Pattern

```js
import { createBackendClient } from '../supabase_backend_client.mjs';

async function main() {
  const supabase = createBackendClient();

  const { data, error } = await supabase
    .from('some_table')
    .select('*')
    .limit(1);

  if (error) {
    console.error('[worker] ERROR reading some_table:', error);
    process.exit(1);
  }

  console.log('[worker] OK:', data);
}

main().catch((err) => {
  console.error('[worker] Unhandled error:', err);
  process.exit(1);
});
```

Or RPC:

```js
await supabase.rpc('run_import_prices', { /* params */ });
```

## Health Checks

- Must have a fast mode using small, DB-safe queries.
- Avoid heavy network/API calls in health paths by default.
- Prefer small, indexed reads (e.g., select 1–2 columns with `limit(1)`).

Example snippet adapted from `system_health_worker`:

```js
const { data, error } = await supabase
  .from('card_prices') // swap to a small, stable table/view
  .select('id')
  .limit(1);

if (error) {
  console.error('[infra-worker] ERROR: DB connectivity check failed:', error);
  process.exit(1);
}

console.log('[infra-worker] DB connectivity OK:', data);
```

## Logging Patterns

- `[pricing-worker] start`
- `[pricing-worker] ERROR: ...`
- `[pricing-worker] complete`

Adopt the prefix `[domain-worker]` consistently per worker type.

## CI Integration

Use Node workers directly (tunnel/highway), not HTTP:

```yaml
- name: Import Prices Worker (Tunnel)
  run: node backend/pricing/import_prices_worker.mjs
  env:
    SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
    SUPABASE_SECRET_KEY: ${{ secrets.PROD_SECRET_KEY }}
```

## Migrating from Edge Functions

- Move heavy logic into backend workers.
- Keep Edge Functions thin (auth, validation, routing) or deprecate them.
- Backend must not rely on Edge gateway behavior or publishable keys.

## Never Again Rules

- Never raw HTTP for backend pipelines.
- Never use a publishable key in backend contexts.
- Never hand-rolled JWTs.
- Never depend on legacy JWT secret toggles.

---

This guide complements `docs/BACKEND_ARCHITECTURE.md` and provides the practical patterns for creating, running, and integrating backend workers in Grookai Vault.

