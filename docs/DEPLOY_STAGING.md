# Deploy to STAGING (Dry-Run + Shadow)

Provide these env vars (do not commit secrets):
- STAGING_DB_URL: postgres://USER:PASSWORD@HOST:PORT/db
- STAGING_DB_URL_SHADOW: postgres://USER:PASSWORD@HOST:PORT/db_shadow
- STAGING_REST_URL: https://<project-ref>.supabase.co
- STAGING_ANON_KEY: <anon key>
- SUPABASE_PROJECT_REF_STAGING: <project-ref>

Steps
- Link project (once):
  - supabase link --project-ref %SUPABASE_PROJECT_REF_STAGING%
- Shadow reset using local migrations (no data):
  - supabase db reset --linked --no-seed --yes
- Seed minimal data (optional):
  - psql "%STAGING_DB_URL%" -f supabase/seed/dev/seed_basic.sql
- Refresh MV (one-time):
  - psql "%STAGING_DB_URL%" -c "REFRESH MATERIALIZED VIEW public.wall_thumbs_3x4;"
- Smoke REST (counts only):
  - $env:STAGING_REST_URL="..."; $env:STAGING_ANON_KEY="..."; pwsh scripts/staging/smoke.ps1

Notes
- Requires a user in auth.users to satisfy listings.owner_id FK for seed.
- Do not drop/rename; all migrations are additive.
