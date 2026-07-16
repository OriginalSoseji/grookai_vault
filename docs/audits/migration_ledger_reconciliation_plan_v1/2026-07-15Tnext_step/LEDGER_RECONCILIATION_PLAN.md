# Migration Ledger Reconciliation Plan

Date: 2026-07-15

Status: PLAN_ONLY_NO_REMOTE_MUTATION

Branch: `feature/card-visual-description-agent`

## Purpose

This plan defines the next safe path to unblock the Canonical Card Visual Description Agent migration without applying unrelated schema or repairing migration history blindly.

No remote database mutation was performed.

No `supabase db push` was run.

No `supabase migration repair` was run.

No card visual description database apply was run.

## Current Ledger

Linked ledger result:

- remote-only IDs: none
- local-only IDs: 15

Local-only IDs:

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

## Read-Only Schema Presence Probe

Representative remote schema objects were checked through:

```powershell
supabase db query --linked --output json --file docs/audits/migration_ledger_reconciliation_plan_v1/2026-07-15Tnext_step/03_readonly_schema_presence_probe.sql
```

The probe queried only PostgreSQL catalogs and `information_schema.columns`.

## Classification

Representative objects are present remotely for these local-only IDs:

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
- `20260715104500_mobile_vault_variant_and_canonical_image_contract_v1.sql`
- `20260715110000_tcgcsv_full_source_warehouse_v1.sql`

These are candidates for a later migration-ledger repair only after full per-migration parity proof. Representative object presence is necessary evidence, not sufficient approval.

Representative objects are absent remotely for these local-only IDs:

- `20260523183000_printing_truth_review_sidecar_v1.sql`
- `20260713190000_trust_safety_block_report_v1.sql`
- `20260715120000_card_visual_description_agent_v1.sql`

These must not be marked applied by migration repair based on the current evidence.

## Decision

Do not apply the card visual description migration yet.

Do not repair any migration history yet.

The safe path is to separate ledger repair candidates from schema-absent pending migrations, then request explicit approval for the migration-history repair step after full readback.

## Recommended Gate Sequence

1. Run full parity readback for the 12 schema-present candidate IDs, including representative tables, indexes, functions, views, RLS status, policies, grants, and any required cron/config objects where applicable.
2. If parity is proven, request explicit approval to mark those 12 IDs applied in the linked migration ledger.
3. Do not repair `20260523183000`, `20260713190000`, or `20260715120000`; their representative schema is absent.
4. Use an isolated card-apply worktree that keeps repaired dependency migration files available for local replay but excludes unrelated schema-absent migrations that are not part of the card gate.
5. Re-run strict prepush and require an approved pending set containing only `20260715120000`.
6. Only then run the card visual description migration apply gate and exactly one OpenAI-backed database apply.

## Why This Does Not Unblock Apply Yet

The card migration is still not the only local-only migration in the linked ledger.

The repository now has useful evidence:

- full local replay passes with the complete feature branch
- the remote ledger has no remote-only IDs
- many local-only IDs appear schema-present remotely
- the card visual description schema is absent remotely

But migration-history repair is a remote state mutation and requires its own explicit approval and stronger parity proof before execution.

## Artifacts

- `00_metadata.txt`
- `01_linked_migration_list.txt`
- `02_linked_migration_summary.json`
- `03_readonly_schema_presence_probe.sql`
- `04_readonly_schema_presence_probe_output.json`
- `05_readonly_schema_presence_probe_metadata.txt`
- `06_schema_presence_summary.json`
- `LEDGER_RECONCILIATION_PLAN.md`
- `artifact_hashes.json`

## Exact Next Safe Step

Run full parity readback for the 12 schema-present migration IDs and preserve the evidence. Stop before any `supabase migration repair`, `supabase db push`, schema apply, or one-card database apply.

## Follow-Up Result

The full parity readback was captured in `docs/audits/migration_ledger_full_parity_readback_v1/2026-07-15Tnext_step/FULL_PARITY_READBACK_REPORT.md`.

Catalog parity passed for the 12 schema-present IDs: `174` expected relation, index, function, policy, trigger, and RLS checks had `0` missing expected objects and `0` security-definer mismatches.

The gate remains blocked because `20260706122000_product_evolution_e2_notification_dispatcher_schedule_v1.sql` expects the disabled cron job `notification-dispatcher-disabled-v1`; `cron.job` and `net` exist remotely, but the exact job row is absent.

Revised next safe step: investigate and classify the `20260706122000` notification dispatcher schedule gap before proposing any migration-history repair.

## Cron Gap Follow-Up

The `20260706122000` schedule gap was investigated in `docs/audits/notification_dispatcher_cron_gap_v1/2026-07-15Tnext_step/NOTIFICATION_DISPATCHER_CRON_GAP_REPORT.md`.

The disabled placeholder cron row is absent because later applied migration `20260707182000` replaced it with the active runtime-config-backed `notification-dispatcher-every-minute-v1` cron job.

Updated next safe step: prepare a migration-history repair plan for the 12 repair-candidate IDs and stop before execution.
