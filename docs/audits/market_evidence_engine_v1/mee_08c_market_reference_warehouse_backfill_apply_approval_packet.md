# MEE-08C Market Reference Warehouse Backfill Apply Approval Packet

## Status

Final DB-write approval packet only.

No database writes, provider calls, source fetches, pricing observations writes, price rollups, public pricing views, or public price publication were executed.

## Apply Script

```text
scripts/audits/market_reference_warehouse_backfill_apply_v1.mjs
```

## Dry-Run Report

```text
docs/audits/market_evidence_engine_v1/mee_08c_market_reference_warehouse_backfill_apply_2026-06-25T18-17-21-439Z.md
```

## Verification

```text
node --test tests/contracts/market_evidence_engine_*.test.mjs
62/62 passing
```

## Hashes

```text
Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722
Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f
Package fingerprint: b089f21753be1e22d192108791a9a86f678acf7baf9d039dd94f2c7c8822d747
```

## Row Counts

```text
market_reference_acquisition_runs: 5
market_reference_raw_snapshots: 11025
market_reference_candidates: 11025
market_reference_normalized_evidence: 11025
market_reference_coverage_reports: 1
```

## Approval Text

Use this exact text only if the remote DB warehouse backfill should run:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-APPLY-V1 apply only. Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: insert 5 acquisition run rows, 11025 raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row into market_reference_* warehouse tables only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No global apply.
```

## Apply Command

The apply command must pass the approval text through `--approval-text` and `--apply`.

The script refuses apply if:

- the approval text does not match exactly
- the manifest hash changed
- the migration hash changed
- row counts changed
- direct-publish flags appear
- the target warehouse tables are not empty
