# MEE_08A_MARKET_REFERENCE_WAREHOUSE_BACKFILL_MANIFEST_V1

## Status

Artifact-only manifest.

No database writes, provider calls, source fetches, migration apply, pricing observations writes, pricing rollups, or public price publication are performed by this checkpoint.

## Purpose

Prepare a deterministic local manifest for backfilling the newly approved `market_reference_*` warehouse tables from existing MEE artifacts.

The manifest builder is:

```text
scripts/audits/market_reference_warehouse_backfill_manifest_v1.mjs
```

The pure builder is:

```text
backend/pricing/market_reference_warehouse_backfill_manifest_v1.mjs
```

## Inputs

The script auto-discovers the latest source-aware artifacts:

- MEE-04C acquisition batch
- MEE-06A PokemonTCG.io acquisition
- MEE-06B TCGCSV acquisition
- MEE-06C PokemonTCG.io normalized evidence
- MEE-06C TCGCSV normalized evidence
- MEE-06D free-reference coverage gap report

## Proposed Warehouse Rows

The dry-run manifest projects rows for:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`

Rows are keyed with stable hashes before any database UUIDs exist.

## Locked Boundary

The manifest must not:

- write Supabase rows
- call providers
- fetch source pages
- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public pricing views
- compute public prices
- publish prices

## Next Step

Review the manifest output. If clean, create a separate `MEE-08B` DB backfill apply plan with exact row counts, hashes, and approval text.
