# Finish Option A (auto)

This workflow completes Option A end‑to‑end without manual CLI typing:

1) Collects `supabase db pull` “reverted” hints and logs them
2) Applies the `repair --status reverted <ID>` fixes in stable batches
3) Restores the wall‑feed migration locally and pushes
4) Runs inspection, seeds thumbnails, and verifies REST/UI

Run via VS Code task:
- “Wall Feed: Finish Option A (auto)”

Or manually:
```
pwsh -NoProfile -File scripts/diagnostics/finish_option_a.ps1
```

Pre‑reqs
- You must be signed in and linked to the correct project (once):
  - `supabase login`
  - `supabase link --project-ref <project_ref>`
- (Optional) Set `SUPABASE_DB_URL` in `.env` to avoid prompts

What it does (Phases A–D)
- Phase A — Pull & discover “reverted” hints
  - Runs `supabase db pull`, saves logs to `scripts/diagnostics/output/pull_attempt_*.log`
  - Parses for `supabase migration repair --status reverted <ID>` hints
  - Writes IDs to `supabase/_repair/remote_versions.txt`
- Phase B — Apply repairs in batches (8 at a time)
  - Runs `supabase migration repair --status reverted <ID>` for each ID, logs to `repair_*.log`
  - Sleeps a few seconds between batches to avoid rate limits
  - Repeats a max of 3 passes
  - Exits with instructions if hints remain after 3 passes
- Phase C — Restore wall‑feed migration and push
  - Copies `20251103_wall_feed_view.sql` from the latest `supabase/migrations/_archive_local_*` back into `supabase/migrations/`
  - If not found, creates a placeholder migration and instructs you to add it manually
  - Runs `supabase db push`, logs to `db_push.log`
- Phase D — Verify
  - Runs `scripts/diagnostics/inspect_wall_feed.ps1`
  - Runs `scripts/tools/seed_wall_photos.ps1` and appends to `seed_wall_photos.log`
  - Runs `scripts/diagnostics/verify_wall_feed.ps1`

Logs & Reports
- `scripts/diagnostics/output/pull_attempt_*.log`
- `scripts/diagnostics/output/repair_*.log`
- `scripts/diagnostics/output/db_push.log`
- `scripts/diagnostics/output/wall_feed_inspect.md`
- `scripts/diagnostics/output/seed_wall_photos*.log`
- `scripts/diagnostics/output/wall_feed_verification.md`

Notes
- The orchestrator is idempotent and safe to re‑run. Logs are timestamped.
- If your env lacks PowerShell 7, switch the VS Code task to `powershell` instead of `pwsh`.
- CLI Profile: Scripts force `--profile supabase` on all Supabase CLI calls and delete any stray `supabase/.temp/profile` before running to avoid Windows path/profile edge cases.

## Troubleshooting Push

Phase C performs several hardening steps before pushing migrations:

- Env normalization: prefers `SUPABASE_DB_URL` over `POSTGRES_URL` if both exist. Secrets (passwords/JWTs) are redacted in logs.
- Shell alignment: uses PowerShell 7 if present, otherwise Windows PowerShell.
- Connectivity preflight:
  - DNS/TCP check via `Test-NetConnection` on port 5432
  - Optional `psql` probe: `psql "$SUPABASE_DB_URL" -c "select 1"`
  - Fail‑fast with a specific reason (DNS, TCP, or psql auth)
- Push retries: up to 3 attempts with `--debug`, exponential backoff, and annotation of common errors in the log:
  - "Unsupported or invalid secret format" → token drift or invalid DB secret
  - "SASL" or "password authentication failed" → wrong password/JWT
  - Stuck at "Connecting to remote database" → pooler handshake timeout
- Fallback: if pushing via DB URL fails, tries the linked context once, or vice versa.

Quick isolation task:

- Run VS Code task: `DB: Push (debug preflight)` to execute Phase C alone with all preflight checks and safe retries.

If errors persist:
- Re‑login the CLI (`supabase logout` / `supabase login`) and re‑link (`supabase link --project-ref <ref>`), then re‑run the task.
- Verify the DB URL from the Supabase Dashboard (pooled connection string) matches your `.env`.
