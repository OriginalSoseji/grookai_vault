# Product Evolution Full-Branch Replay Gate

Date: 2026-07-15

Status: FULL_BRANCH_REPLAY_PASSED

Branch: `feature/card-visual-description-agent`

## Purpose

This gate checked whether the Product Evolution failure observed in the isolated card visual description worktree was a real SQL replay failure in the feature branch, or a consequence of removing dependency migrations from the isolated filesystem.

No remote database mutation was performed.

No `supabase db push` was run.

No card visual description database apply was run.

## Result

The first full-branch reset attempt failed before migration replay because the local Supabase stack was stopped.

After starting the local stack, the full feature branch replay passed:

```powershell
supabase db reset --local --yes
```

Exit code: `0`

The replay reached and applied:

- `20260706100000_product_evolution_e1_interest_graph_schema_v1.sql`
- `20260706120000_product_evolution_e2_notification_schema_v1.sql`
- `20260708110000_product_evolution_e3_want_match_durable_engine_v1.sql`
- `20260715120000_card_visual_description_agent_v1.sql`

This proves the E3 guard is valid when the full migration chain is present.

## Interpretation

The isolated worktree failed because it removed E1/E2 migrations that create:

- `public.card_events.dedupe_key`
- `public.notification_outbox.dedupe_key`

The Product Evolution SQL is not currently the blocker in the full branch.

The remaining blocker is migration governance: the linked ledger still reports unrelated local-only pending migrations in addition to `20260715120000`, so strict prepush cannot approve applying only the card visual description migration from this branch.

## Current Safe Truth

- Full local replay passes with the complete feature branch migration set.
- The isolated card-only ledger can show `20260715120000` as the only local-only migration.
- The isolated card-only replay cannot pass because remote-applied Product Evolution migrations depend on E1/E2 schema that was removed only for isolation.
- Therefore the next gate is ledger reconciliation, not Product Evolution SQL repair.

## Artifacts

- `01_full_branch_local_reset_metadata.txt`
- `02_full_branch_local_reset_output.txt`
- `03_supabase_start_metadata.txt`
- `04_supabase_start_redacted.txt`
- `05_full_branch_local_reset_after_start_output.txt`
- `06_full_branch_local_reset_after_start_metadata.txt`
- `07_supabase_status_before_stop_redacted.txt`
- `08_supabase_stop_redacted.txt`
- `09_supabase_status_after_stop_redacted.txt`
- `FULL_BRANCH_REPLAY_GATE.md`
- `artifact_hashes.json`

The local Supabase stack was stopped after replay. Supabase status/start artifacts are redacted to exclude local development secrets.

## Exact Next Gate

Do not apply the card visual description migration yet.

Resolve or explicitly scope the unrelated linked-ledger local-only migrations before applying `20260715120000`. The next safe action is to produce a ledger reconciliation plan for the existing local-only IDs, separating:

- migrations that must be applied before the card migration
- migrations that are schema-present but ledger-missing and require repair proof
- migrations that should remain pending and block this apply

Return to the card visual description apply gate only after strict prepush passes with an approved pending set.
