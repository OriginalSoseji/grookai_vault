## Wall Feed — One‑Click Verify & Auto‑Remediate

This workflow gives you a clean, Windows‑friendly path to validate and (optionally) fix the Public Wall feed end‑to‑end.

### One‑Click Path (VS Code Tasks)

- Run: `Wall Feed: Push ➜ Inspect ➜ Seed ➜ Verify`
  - `DB: Push (non-interactive)` — applies migrations to the linked project
  - `Diag: Inspect wall feed` — inspects view/function existence, grants, and RLS flags
  - `Seed: Wall demo data` — backfills `thumb_url` for recent rows
  - `Diag: Verify wall feed` — DB + REST checks and UI binding scan

Note: These tasks do not execute automatically; run them from VS Code’s Tasks palette.

### Reports & Logs

- Inspector: `scripts/diagnostics/output/wall_feed_inspect.md`
- Verification: `scripts/diagnostics/output/wall_feed_verification.md`
- Seeder log: `scripts/diagnostics/output/seed_wall_photos.log`

### Auto‑Remediate (generate a pending migration)

- Run: `Wall Feed: Auto-remediate (generate pending migration)`
- Script: `scripts/diagnostics/auto_fix_wall_feed.ps1`
  - Reads the inspector report
  - If view/RPC missing → creates `supabase/migrations/_pending_wall_feed_fix.sql`
  - If objects exist but grants missing → creates `supabase/migrations/_pending_wall_feed_grants.sql`
  - Writes plan: `scripts/diagnostics/output/wall_feed_autofix_plan.md`
  - Files are re‑generated safely each run (idempotent)

After the script creates a `_pending_*.sql`, review it, then apply with:

```
supabase db push
```

### What Verification Confirms

- DB Objects: existence (pg_views/pg_proc), grants (information_schema), sample rows
- REST API: reachable endpoints, HTTP codes, row count, sample `thumb_url`
- Seeder: last run status and source (VIEW | RPC | LISTINGS_FALLBACK), row updates
- UI: that the app prefers `thumb_url` via `imageBestFromRow` / `thumbFromRow`

