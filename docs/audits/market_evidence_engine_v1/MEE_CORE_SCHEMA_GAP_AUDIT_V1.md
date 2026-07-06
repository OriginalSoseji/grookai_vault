# MEE Core Schema Gap Audit V1

Generated: 2026-06-26

Mode: read-only audit plus dry-run migration plan artifact

## Contract Compared

`MARKET_EVIDENCE_ENGINE_CORE_V1` requires every market observation to move through:

`acquired`, `raw_stored`, `normalized`, `matched`, `classified`, `quality_gated`, `rollup_eligible`, `rolled_up_internal`, `publishable`, `app_visible`.

## Actual DB Findings

Objects present:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`
- `market_reference_signal_rollups`
- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_card_candidates`
- `market_listing_price_events`
- `market_listing_rollups`
- `pricing_observations`
- `ebay_active_prices_latest`

Expected core lifecycle objects missing:

- `market_evidence_observations`
- `market_evidence_lifecycle_events`
- `v_market_evidence_lifecycle_current_v1`

Additional optional lifecycle/publication objects not proposed yet:

- `market_evidence_publication_candidates`
- `market_evidence_rollup_lineage`
- `v_market_evidence_schema_gap_audit_v1`

## Column Gap Summary

Current `market_reference_*` and `market_listing_*` tables do not contain first-class lifecycle columns:

- `lifecycle_state`: missing everywhere.
- `state_history`: missing everywhere.
- `rollup_eligible`: missing everywhere.

Some safety flags already exist:

- `market_reference_normalized_evidence.model_eligible`
- `market_reference_signal_rollups.publishable/app_visible/market_truth`
- `market_listing_rollups.publishable/app_visible/market_truth`
- candidate tables have `needs_review` and `can_publish_price_directly=false`.

This means safety gates exist, but lifecycle progression is not auditable as a state machine.

## Minimum Plan

The minimum missing core schema is:

1. `market_evidence_observations`
2. `market_evidence_lifecycle_events`
3. `v_market_evidence_lifecycle_current_v1`

This keeps existing provider warehouses intact and adds only a thin lifecycle identity + append-only transition layer.

## Dry-Run SQL

`docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql`

The SQL is rollback-only and was not applied.

## Boundary Proof

- No provider calls.
- No source fetches.
- No DB writes were applied.
- No Supabase migration file was created.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing view changes.
- No app-visible pricing.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes.
- No merges.
- No global apply.
