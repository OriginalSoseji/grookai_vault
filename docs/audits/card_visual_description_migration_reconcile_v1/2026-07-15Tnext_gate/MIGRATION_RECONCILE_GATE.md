# Card Visual Description Migration Reconcile Gate

Date: 2026-07-15

Status: BLOCKED_BY_UNEXPECTED_LOCAL_ONLY_PENDING_SET

Feature branch: `feature/card-visual-description-agent`

Feature branch HEAD: `312c74bbf592b3fc232d2a1429654678007e894d`

Clean reconciliation worktree: `C:\grookai_vault_reconcile_card_visual_20260715`

## Purpose

This gate attempted the exact next step after the one-card apply gate was blocked: reconcile linked Supabase migration ledger drift before attempting the card visual description migration.

No card visual description migration apply was attempted in this gate.

No one-card OpenAI-backed apply was attempted in this gate.

## Commands Run

Created a clean detached worktree from current HEAD:

```powershell
git worktree add C:\grookai_vault_reconcile_card_visual_20260715 HEAD
```

Linked the clean worktree:

```powershell
supabase link --project-ref ycdxbpibncqcchqiihfz --yes
```

Captured linked migration ledger:

```powershell
supabase migration list --linked
```

Attempted linked schema pull:

```powershell
supabase db pull card_visual_remote_drift_reconcile_20260715 --linked --yes
```

Attempted DB URL pull fallback only if `SUPABASE_DB_URL` or `DATABASE_URL` was available:

```powershell
supabase db pull card_visual_remote_drift_reconcile_20260715_dburl --db-url <redacted> --yes
```

The DB URL fallback did not run because no DB URL environment variable was available in the clean worktree process environment.

After the linked pull failed, Git history was searched for the four remote-only migration IDs. Commit `c223dc932283f613e17c2276faa302646e8eee2e` contained all four missing migration files. Those files were restored into this feature branch as local files only.

After restoring those files, the linked migration ledger was captured again:

```powershell
supabase migration list --linked
```

Then strict prepush was rerun:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

## Ledger Truth

Initial remote-only migration IDs:

- `20260625130000`
- `20260625140000`
- `20260625150000`
- `20260625160000`

Local-only migration IDs:

- `20260523183000`
- `20260629190000`
- `20260703090000`
- `20260706100000`
- `20260706110000`
- `20260706120000`
- `20260706121000`
- `20260706122000`
- `20260706123000`
- `20260708174000`
- `20260712090000`
- `20260713190000`
- `20260715104500`
- `20260715110000`

After restoring the four missing local migration files, remote-only migration IDs were reduced to:

- none

The remaining local-only migration IDs are:

- `20260523183000`
- `20260629190000`
- `20260703090000`
- `20260706100000`
- `20260706110000`
- `20260706120000`
- `20260706121000`
- `20260706122000`
- `20260706123000`
- `20260708174000`
- `20260712090000`
- `20260713190000`
- `20260715104500`
- `20260715110000`
- `20260715120000`

## Pull Result

`supabase db pull --linked` failed before producing a reconciliation migration.

The CLI reported:

```text
The remote database's migration history does not match local files in supabase\migrations directory.
```

The CLI suggested migration-history repair commands for both the remote-only and local-only IDs. Those commands mutate the linked remote migration ledger, so they were not run in this gate.

## Source Search And Local Repair

Git history source evidence was found for all four initially remote-only IDs in commit `c223dc932283f613e17c2276faa302646e8eee2e`:

- `supabase/migrations/20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql`
- `supabase/migrations/20260625140000_market_reference_tcgdex_raw_snapshot_support_v1.sql`
- `supabase/migrations/20260625150000_market_evidence_publication_gate_fast_path_indexes_v1.sql`
- `supabase/migrations/20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql`

Those files were restored locally to this branch. No remote state was changed.

Restored file SHA-256 hashes:

- `20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql`: `e4e0165e125605a6c996d863c8cdda07f8e8537977dcae0482776db6300d0d63`
- `20260625140000_market_reference_tcgdex_raw_snapshot_support_v1.sql`: `5e562873cefaa546dcff9fcef6bc2185a3774280348ea68e8e86dfc47e60cfec`
- `20260625150000_market_evidence_publication_gate_fast_path_indexes_v1.sql`: `1c860630f7d26d5cfa4d5850271224655e286e875a7ba96f98d8eb10c1e33bcd`
- `20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql`: `90a60356a7f0781d11cd6390c326e7db312e2aed392184ed02c803009eaba9d4`

The `20260625130000` hash matches the earlier recorded audit hash.

## Strict Prepush Result After Local Repair

Strict prepush still failed.

The failure changed from remote-only drift to unexpected local-only pending migrations:

```text
Expected: 20260715120000
Actual: 20260523183000, 20260629190000, 20260703090000, 20260706100000, 20260706110000, 20260706120000, 20260706121000, 20260706122000, 20260706123000, 20260708174000, 20260712090000, 20260713190000, 20260715104500, 20260715110000, 20260715120000
```

This means the card visual description migration still cannot be applied as an isolated migration from this branch.

## Decision

Stop before schema apply.

The remote-only ledger blocker was resolved locally by restoring missing migration files from Git history. The remaining blocker is the unrelated local-only pending set. Applying the card visual description migration from this branch would also apply unrelated pending migrations unless those are resolved first.

## Not Done

- No `supabase migration repair` command was run.
- No `supabase db push` command was run.
- No reconciliation migration was produced by `supabase db pull`.
- No card visual description migration was applied.
- No card visual description database rows were written.
- No app-facing or canonical boundary was changed.

## Artifacts

- `01_supabase_link_reconcile_worktree.txt`
- `02_migration_list_clean_reconcile_worktree.txt`
- `03_supabase_db_pull_reconcile.txt`
- `04_supabase_db_pull_dburl_reconcile.txt`
- `05_migration_ledger_mismatch_summary.json`
- `06_migration_list_after_restoring_remote_only_files.txt`
- `07_strict_prepush_after_restoring_remote_only_files.txt`
- `08_migration_ledger_after_restored_files_summary.json`
- `MIGRATION_RECONCILE_GATE.md`
- `artifact_hashes.json`

## Exact Next Gate

Resolve the unrelated local-only pending set before applying the card visual description migration.

For this isolated card visual description gate, strict prepush must show `20260715120000` as the only local-only migration. Do not include the unrelated local-only IDs in `ExpectedLocalOnlyIds` for this card gate unless the intent is to apply those migrations too.

Only after the local-only set is resolved should the card visual description gate rerun:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

If that passes, proceed to `supabase db push`, schema/RLS/grant readback, and exactly one OpenAI-backed card apply.
