# Quality Checks (Security + EXPLAIN + Demo)

This pack adds security probing, EXPLAIN plan summaries, and a demo seeder — all Windows/PowerShell first.

## Tasks

- `Security: RLS probe`
  - Reads `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional `TEST_USER_JWT`)
  - Probes: `GET /rest/v1/wall_feed_v?select=*&limit=1`, `POST /rest/v1/rpc/wall_feed_list` with `{_limit:1,_offset:0}`
  - Attempts a base-table read to confirm anon is blocked
  - Writes `scripts/diagnostics/output/rls_probe.md`

- `DB: Explain checks`
  - Uses `SUPABASE_DB_URL` to run `scripts/db/explain_checks.sql`
  - Summarizes to `scripts/diagnostics/output/EXPLAIN_SUMMARY.md` with GREEN/YELLOW/RED marks

- `Seed: Demo dataset`
  - Guarded by `DEMO_SEED=true` (set in env before running)
  - Upserts sample wall listings/photos and a pricing health row
  - Writes `scripts/diagnostics/output/seed_demo_<ts>.log`

- `Quality: Security + EXPLAIN + Demo (auto)`
  - Runs the three tasks in sequence

## Env requirements

- `.env`:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (RLS probe)
  - `SUPABASE_DB_URL` (EXPLAIN checks)
  - `SUPABASE_SERVICE_ROLE_KEY` (Demo seed)

## Success criteria

- RLS probe: view/RPC return 200 for anon; base tables do not; report shows PASS
- EXPLAIN: GREEN or YELLOW only; no RED on large relations
- Seeder: `Updated/Skipped` activity logged and `thumb_url` visible in app via `image_best.dart`

