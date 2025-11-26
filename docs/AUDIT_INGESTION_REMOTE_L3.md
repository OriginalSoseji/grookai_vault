# Audit L3 – Remote Ingestion Path (Supabase project ycdxbpibncqcchqiihfz)

## Findings
- **Workers & pipeline**: Pokémon/TCGdex ingestion lives under `backend/sets/*.mjs` and `backend/pokemon/*.mjs`. They all import `../env.mjs`, which loads `.env.local` then falls back to process env, and use `createBackendClient()` (service-role) from `backend/supabase_backend_client.mjs`.
- **Supabase client**: `backend/supabase_backend_client.mjs` requires `SUPABASE_URL` + `SUPABASE_SECRET_KEY`. No GV_ENV selector; target project is chosen solely by these env vars.
- **Env loading**: `backend/env.mjs` does `dotenv.config({ path: '.env.local' }); dotenv.config();` — by default does **not override** already-set env vars. Remote runs can point to another project by exporting env vars before invoking Node.
- **Env files**: `.env.local` exists with URL/ref `ycdxbpibncqcchqiihfz` (publishable + secret). `.env.staging` / `.env.prod` absent. `.env` is a placeholder.
- **CLI config**: `supabase/config.toml` now uses `project_id = "ycdxbpibncqcchqiihfz"` (aligned with Flutter).
- **Remote data state**: Remote project has schema but empty data (`card_prints = 0`, `v_vault_items = 0`). No prior remote import path scripted; ingestion has been run locally-only so far.
- **Migrations**: Pricing, card_prints, raw_imports, mapping_conflicts, traits, etc., exist in `supabase/migrations/`; no “local-only” migrations detected.
- **Docs**: Existing ingestion docs describe pipelines but no explicit remote import runner; no staging/remote mode flags found.

## Conclusion
- The ingestion pipeline is ready for remote use; it already respects `SUPABASE_URL`/`SUPABASE_SECRET_KEY`. The gap is operational: there is no scripted “remote import” harness. A safe remote import must set env vars to the remote project and run the existing workers in sequence. No schema or logic changes are required.
