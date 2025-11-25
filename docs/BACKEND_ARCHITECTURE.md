# Grookai Vault Backend Architecture

## North Star

Build Grookai Vault as an enterprise-grade SaaS platform that a single person can operate confidently.

## Lanes vs Highway (Core Model)

- Edge Functions are the public-facing lanes.
- Backend Workers are the private highway.
- Heavy logic is never placed in Edge Functions. Lanes only validate, route, and translate requests into highway operations.

## Auth & Keys

- PUBLISHABLE keys are for frontend only (client SDKs, anonymous or end-user contexts).
- SECRET keys are for backend only (workers, CI, admin scripts). Never expose SECRET in frontend or Edge responses.
- BRIDGE_* tokens are for internal gates (e.g., CI → worker, function → worker). Treat them like short-lived service access toggles.
- Backend uses `@supabase/supabase-js` with the service role SECRET; never craft or parse JWTs manually for backend tunnels.

## Environment Rules

- `SUPABASE_URL` identifies the project, shared across all lanes/highway.
- Maintain the same variable naming across DEV / STAGING / PROD. Only values differ by environment.
- Backend workers require: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (service role).
- Frontend requires: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

## Backend Workers

- All backend logic (pricing, imports, jobs, cron) lives under `backend/`.
- Workers import the shared client from `backend/supabase_backend_client.mjs`.
- No backend path uses raw HTTP to Supabase or Edge functions for core logic.
- Example entries:
  - `backend/pricing/import_prices_worker.mjs`
  - `backend/infra/system_health_worker.mjs`

## Edge Functions

- Thin wrappers only. They authenticate public requests and hand off to the highway.
- They are public entries, not the backend pipeline home.
- Legacy slugs (e.g., `import-prices`) remain available but should call into workers or be gradually retired.

## Health & Observability

- Must have a fast mode: minimal, reliable checks that complete quickly.
- DB-safe: health checks should prefer small, indexed reads; avoid writes and external calls by default.
- Orchestration: workers like `system_health_worker` run broader checks and aggregate results.
- Emit clear logs and non-zero exits on failure for CI visibility.

## CI/CD

- CI invokes Node workers directly (highway), not HTTP endpoints (lanes).
- Secrets are injected via the CI runner environment (e.g., `PROD_SUPABASE_URL`, `PROD_SECRET_KEY`).
- Example:

```yaml
- name: Import Prices Worker (Tunnel)
  run: node backend/pricing/import_prices_worker.mjs
  env:
    SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
    SUPABASE_SECRET_KEY: ${{ secrets.PROD_SECRET_KEY }}
```

## Naming Conventions

- Slugs: kebab-case with versioning when needed (e.g., `import-prices-v3`).
- Workers: `backend/<domain>/<worker>.mjs` (e.g., `backend/pricing/import_prices_worker.mjs`).
- Scripts: `scripts/run_<worker>.ps1` (e.g., `scripts/run_system_health_worker.ps1`).
- Env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `BRIDGE_*`.

## Legacy Rules (Never Again)

- No raw HTTP to Supabase for core backend paths.
- No `Invoke-WebRequest` for backend pipelines.
- No custom Authorization headers to simulate service access.
- No hand-crafted JWTs.
- No reliance on legacy-secret toggles. Use clear, named BRIDGE_* gates or remove.

---

This document is the single source of truth for backend architecture decisions in Grookai Vault. All new backend work should align with the lanes/highway model and use the shared backend client.

