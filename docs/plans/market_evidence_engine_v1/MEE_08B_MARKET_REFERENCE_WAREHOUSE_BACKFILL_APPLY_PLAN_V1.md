# MEE_08B_MARKET_REFERENCE_WAREHOUSE_BACKFILL_APPLY_PLAN_V1

## Status

Apply-plan gate only.

No database writes, provider calls, source fetches, pricing observations writes, price rollups, public pricing views, or public price publication are performed by this checkpoint.

## Purpose

Validate that the MEE-08A manifest is ready to become a later warehouse-only DB backfill package.

The gate script is:

```text
scripts/audits/market_reference_warehouse_backfill_apply_gate_v1.mjs
```

## Required Inputs

- Manifest: `docs/audits/market_evidence_engine_v1/mee_08a_market_reference_warehouse_backfill_manifest_2026-06-25T18-08-48-211Z.json`
- Migration: `supabase/migrations/20260625000000_market_reference_warehouse_v1.sql`

## Expected Hashes

```text
Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722
Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f
```

## Expected Row Counts

```text
market_reference_acquisition_runs: 5
market_reference_raw_snapshots: 11025
market_reference_candidates: 11025
market_reference_normalized_evidence: 11025
market_reference_coverage_reports: 1
```

## Apply Order

The later DB writer must insert in this order:

1. `market_reference_acquisition_runs`
2. `market_reference_raw_snapshots`
3. `market_reference_candidates`
4. `market_reference_normalized_evidence`
5. `market_reference_coverage_reports`

The normalized evidence rows must be linked to inserted candidate IDs by stable candidate hash.

## Approval Text

Use this exact text only when ready to prepare the DB backfill package:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-V1 apply plan only. Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: prepare DB backfill apply package for 5 acquisition run rows, 11025 raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```

## Next Step

Run the gate in report-only mode. If clean, wait for explicit approval before building the DB writer.
