# CI Workflows

This repo defines two Windows-first workflows:

## Quality (PRs, main)

- Checks out code, ensures `ci/.env.example` exists.
- Runs optional probes/scripts if present:
  - `scripts/security/rls_probe.ps1`
  - `scripts/db/run_explain_checks.ps1`
  - `scripts/tools/seed_demo.ps1`
- Uploads `scripts/diagnostics/output/**` as artifacts.
- Fails if `EXPLAIN_SUMMARY.md` contains `RED`.

## Ship Dry-Run (manual)

- `workflow_dispatch` triggered.
- Reads repo secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_DB_URL`.
- Runs preflight from `scripts/ship/finish_option_a.ps1 -Phase C -NoPush` when present.
- Uploads `db_preflight_*.log` and diagnostics artifacts.

## Secrets

Set required secrets under Repo → Settings → Secrets and variables → Actions.

