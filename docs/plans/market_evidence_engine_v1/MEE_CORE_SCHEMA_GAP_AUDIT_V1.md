# MEE Core Schema Gap Audit V1

Status: dry-run plan only

Date: 2026-06-26

## Objective

Compare `MARKET_EVIDENCE_ENGINE_CORE_V1` against the actual Market Evidence Engine database schema and identify the minimum missing tables/views required for lifecycle state and transition history.

This is not acquisition work, not eBay targeting, not public pricing, and not an app-visible pricing change.

## Audit Inputs

- Contract: `docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`
- Reference schema: `public.market_reference_*`
- Listing schema: `public.market_listing_*`
- Public pricing gate: `public.v_card_pricing_ui_v1`
- Existing public price tables: `public.pricing_observations`, `public.ebay_active_prices_latest`

Remote schema was checked with read-only `supabase db query --linked` inspection.

## Findings

Existing schema strengths:

- `market_reference_*` preserves reference acquisition, raw snapshots, candidates, normalized evidence, coverage reports, and internal reference signal rollups.
- `market_listing_*` preserves active-listing acquisition, query cache, raw snapshots, observations, seller snapshots, card candidates, price events, and internal rollups.
- Existing candidates are review-only by construction.
- Existing internal rollups are not publishable, not app-visible, and not market truth.
- The new Market Evidence Engine warehouses are not read by `v_card_pricing_ui_v1`.

Core schema gaps:

- No `market_evidence_*` provider-agnostic lifecycle tables or views exist.
- No existing MEE table has a first-class `lifecycle_state` column.
- No existing MEE table has a first-class `state_history` column.
- Reference and listing lanes use different row identities, so there is no shared evidence id for lifecycle tracking.
- Lifecycle progress is inferred from table placement and flags instead of recorded as ordered state transitions.
- Rollup lineage is stored in lane-specific rollup payloads, not in a shared lifecycle state model.
- Publication gates are defensive flags today, not a dedicated lifecycle promotion surface.

## Minimum Missing Objects

The minimum safe core layer is three objects:

1. `public.market_evidence_observations`

   Provider-agnostic observation registry. It gives every provider/lane row a stable lifecycle identity without replacing existing provider warehouses.

2. `public.market_evidence_lifecycle_events`

   Append-only lifecycle transition ledger. It records ordered movement through:

   `acquired`, `raw_stored`, `normalized`, `matched`, `classified`, `quality_gated`, `rollup_eligible`, `rolled_up_internal`, `publishable`, `app_visible`.

3. `public.v_market_evidence_lifecycle_current_v1`

   Read-only current-state view. It calculates the latest lifecycle state per observation and exposes whether required stage order is currently complete.

Optional later objects, outside this minimum plan:

- `public.market_evidence_publication_candidates`
- `public.market_evidence_rollup_lineage`
- `public.v_market_evidence_schema_gap_audit_v1`

Those can wait until the first lifecycle ledger is proven.

## Dry-Run Migration Plan

Dry-run SQL artifact:

`docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql`

The SQL is intentionally rollback-only:

- starts a transaction,
- defines the minimum proposed objects,
- enables RLS,
- adds service-role-only policies,
- emits a plan summary,
- rolls back.

It is not a Supabase migration file and was not applied.

## Proposed Object Boundaries

`market_evidence_observations`:

- stores canonical evidence identity,
- references existing provider/lane rows by table name and UUID,
- stores source/source type/record id,
- stores raw snapshot linkage,
- stores optional card candidate identity,
- stores contract/adapter version metadata,
- does not store public price truth.

`market_evidence_lifecycle_events`:

- stores one lifecycle event at a time,
- stores `from_state`, `to_state`, `stage_order`,
- stores actor/version/payload/hash metadata,
- forbids unknown lifecycle states,
- keeps `publishable=false`, `app_visible=false`, and `market_truth=false` by default.

`v_market_evidence_lifecycle_current_v1`:

- derives latest state from the append-only event ledger,
- exposes current stage order,
- exposes event count,
- keeps readback provider-agnostic.

## Non-Goals

This plan does not:

- acquire evidence,
- improve provider coverage,
- optimize eBay queries,
- write provider observations,
- write `pricing_observations`,
- write `ebay_active_prices_latest`,
- create public pricing,
- create app-visible pricing,
- touch identity tables,
- touch vault tables,
- touch image/storage tables,
- delete or merge rows.

## Verification Plan

Before any future apply:

- Run the dry-run SQL in a rollback transaction.
- Verify proposed object count is exactly 3.
- Verify RLS is enabled on both proposed tables.
- Verify policies are service-role-only.
- Verify no public pricing views are created or changed.
- Verify no `pricing_observations` or `ebay_active_prices_latest` writes exist in the SQL.
- Verify lifecycle stages are present in order.

## Next Approval Prompt

Only if we decide to create a real local migration candidate later, use:

`Approve real MEE-CORE-LIFECYCLE-SCHEMA-V1 migration candidate only. Scope: create one local Supabase migration candidate for provider-agnostic Market Evidence Engine lifecycle state and transition history, including market_evidence_observations, market_evidence_lifecycle_events, v_market_evidence_lifecycle_current_v1, indexes, RLS enablement, and service-role-only policies only. No remote migration apply. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No merges. No global apply.`
