# Card Visual Description Isolated Migration Gate

Date: 2026-07-15

Status: BLOCKED_BY_EXISTING_LOCAL_REPLAY_DEBT

Feature branch: `feature/card-visual-description-agent`

Feature branch HEAD: `312c74bbf592b3fc232d2a1429654678007e894d`

Isolated gate worktree: `C:\grookai_vault_card_desc_isolated_gate`

## Purpose

This gate tested whether the card visual description migration can be validated as an isolated pending migration without applying unrelated local-only migrations.

No remote database mutation was performed.

No `supabase db push` was run.

No card visual description migration was applied.

No OpenAI-backed one-card database apply was run.

## Workspace Setup

Created a detached isolated worktree from current HEAD.

Copied these migration files into the isolated worktree:

- `20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql`
- `20260625140000_market_reference_tcgdex_raw_snapshot_support_v1.sql`
- `20260625150000_market_evidence_publication_gate_fast_path_indexes_v1.sql`
- `20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql`
- `20260715120000_card_visual_description_agent_v1.sql`

Removed the unrelated local-only pending migration files only from the isolated worktree:

- `20260523183000_printing_truth_review_sidecar_v1.sql`
- `20260629190000_market_listing_price_events_observation_idx.sql`
- `20260703090000_trade_execution_second_leg_any_trade_copy_v1.sql`
- `20260706100000_product_evolution_e1_interest_graph_schema_v1.sql`
- `20260706110000_product_evolution_e1_emission_triggers_v1.sql`
- `20260706120000_product_evolution_e2_notification_schema_v1.sql`
- `20260706121000_product_evolution_e2_notification_dispatcher_rpcs_v1.sql`
- `20260706122000_product_evolution_e2_notification_dispatcher_schedule_v1.sql`
- `20260706123000_product_evolution_e2_notification_app_rpcs_v1.sql`
- `20260708174000_product_evolution_e5_card_journey_moment_rollups_v1.sql`
- `20260712090000_pricing_pipeline_phase_runs_v1.sql`
- `20260713190000_trust_safety_block_report_v1.sql`
- `20260715104500_mobile_vault_variant_and_canonical_image_contract_v1.sql`
- `20260715110000_tcgcsv_full_source_warehouse_v1.sql`

These removals are not present in the feature branch. They exist only in the isolated gate worktree.

## Ledger Result

From the isolated workspace:

```powershell
supabase migration list --linked
```

Result:

- remote-only IDs: none
- local-only IDs: `20260715120000`

This proves the isolated filesystem can present the card visual description migration as the only pending migration.

## Strict Prepush Result

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260715120000
```

Result: failed during local replay.

The gate passed:

- linked migration ledger command
- expected local-only ID check
- pending migration object scan

It failed at:

```powershell
supabase db reset --local --yes
```

Direct local reset reproduced the failure.

Failing migration:

```text
20260708110000_product_evolution_e3_want_match_durable_engine_v1.sql
```

Error:

```text
ERROR: E3 PR2 requires public.card_events.dedupe_key (SQLSTATE P0001)
```

The same guard also requires:

```text
public.notification_outbox.dedupe_key
```

## Interpretation

This is existing migration replay debt, not a card visual description failure.

The remote-applied E3 migration depends on schema created by earlier product evolution E1/E2 migrations. Those E1/E2 migration files currently appear as local-only in the linked ledger. Removing them to isolate the card migration makes the remote-applied E3 migration unreplayable locally.

Therefore the repository cannot currently prove an isolated replay path for `20260715120000` without first resolving the E1/E2/E3 migration-history inconsistency.

## Artifacts

- `01_isolated_workspace_file_plan.json`
- `02_supabase_link_isolated_gate.txt`
- `03_migration_list_isolated_gate.txt`
- `04_migration_ledger_isolated_gate_summary.json`
- `05_strict_prepush_isolated_gate.txt`
- `06_supabase_db_reset_isolated_full.txt`
- `07_supabase_status_after_isolated_reset.txt`
- `08_supabase_stop_isolated_gate.txt`
- `09_supabase_status_after_stop.txt`
- `ISOLATED_MIGRATION_GATE.md`
- `artifact_hashes.json`

The local Supabase stack started by the replay attempt was stopped after capture. The status artifact is redacted to exclude local development keys.

## Exact Next Safe Gate

Do not apply the card visual description migration yet.

Resolve the existing product evolution migration replay debt first. The immediate safe options are:

1. Provide a DB URL so a read-only remote schema proof can confirm whether `card_events.dedupe_key` and `notification_outbox.dedupe_key` exist remotely and whether the local-only E1/E2 migrations are schema-present but ledger-missing.
2. Create a separate migration-ledger repair plan for the product evolution local-only IDs, with readback proof before any `supabase migration repair`.
3. Use a clean branch/worktree where the migration ledger, remote schema, and local replay all agree before returning to the card visual description apply gate.

Return to the card visual description gate only after strict prepush can pass local replay with `20260715120000` isolated.
