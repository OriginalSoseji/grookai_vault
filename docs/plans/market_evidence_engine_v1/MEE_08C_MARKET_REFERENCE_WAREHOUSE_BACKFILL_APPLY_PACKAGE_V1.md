# MEE_08C_MARKET_REFERENCE_WAREHOUSE_BACKFILL_APPLY_PACKAGE_V1

## Status

DB writer package prepared. Not executed.

The package defaults to dry-run report mode. No database writes, provider calls, source fetches, pricing observations writes, price rollups, public pricing views, or public price publication are performed unless a later exact approval is supplied with `--apply`.

## Script

```text
scripts/audits/market_reference_warehouse_backfill_apply_v1.mjs
```

## Scope

The writer may insert only into:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`

It must not write:

- `pricing_observations`
- `ebay_active_prices_latest`
- identity tables
- vault tables
- image tables
- public pricing views

## Apply Behavior

The writer:

1. Validates the approved manifest hash.
2. Validates the approved migration hash.
3. Materializes the exact expected row counts from artifacts.
4. Refuses apply unless exact final approval text is supplied.
5. Refuses apply if target warehouse tables are not empty.
6. Inserts rows in dependency order.
7. Links normalized evidence to candidate rows by stable candidate hash.

## Final Approval Text

Use this exact text only if the remote DB backfill should run:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-APPLY-V1 apply only. Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: insert 5 acquisition run rows, 11025 raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row into market_reference_* warehouse tables only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No global apply.
```

## Next Step

Run the package in dry-run report mode, then wait for explicit final approval before any DB write.
