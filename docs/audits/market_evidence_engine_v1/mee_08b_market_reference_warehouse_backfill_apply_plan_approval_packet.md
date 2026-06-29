# MEE-08B Market Reference Warehouse Backfill Apply Plan Approval Packet

## Status

Approval packet only.

No database writes, provider calls, source fetches, pricing observations writes, price rollups, public pricing views, or public price publication were executed.

## Candidate

```text
scripts/audits/market_reference_warehouse_backfill_apply_gate_v1.mjs
```

## Source Manifest

```text
docs/audits/market_evidence_engine_v1/mee_08a_market_reference_warehouse_backfill_manifest_2026-06-25T18-08-48-211Z.json
```

## Gate Report

```text
docs/audits/market_evidence_engine_v1/mee_08b_market_reference_warehouse_backfill_apply_gate_2026-06-25T18-11-50-143Z.md
```

## Verification

```text
node --test tests/contracts/market_evidence_engine_*.test.mjs
59/59 passing
```

## Hashes

```text
Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722
Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f
Package fingerprint: 4bac2b1c7bbc771dd218cd13f6091ea550336fd1d11a20f4eefa280776f76bb1
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

Use this exact text only if the DB backfill writer package should be prepared:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-BACKFILL-V1 apply plan only. Manifest hash: f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722. Migration hash: 2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f. Scope: prepare DB backfill apply package for 5 acquisition run rows, 11025 raw snapshot rows, 11025 candidate rows, 11025 normalized evidence rows, and 1 coverage report row only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```

## Apply Boundary

If approved, the next step is to build a DB writer package that inserts into only:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`

That package should still require a separate final approval before any remote DB write.
