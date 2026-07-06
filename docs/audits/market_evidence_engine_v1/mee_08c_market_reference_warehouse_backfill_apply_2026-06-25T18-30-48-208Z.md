# MEE-08C Market Reference Warehouse Backfill Apply Package

- Package: `MARKET-REFERENCE-WAREHOUSE-BACKFILL-APPLY-V1`
- Mode: `apply_requested`
- Ready: `false`
- Applied: `false`
- Manifest hash: `f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722`
- Migration hash: `2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f`
- Package fingerprint: `b089f21753be1e22d192108791a9a86f678acf7baf9d039dd94f2c7c8822d747`

## Row Counts

| Table | Rows |
| --- | ---: |
| market_reference_acquisition_runs | 5 |
| market_reference_raw_snapshots | 11025 |
| market_reference_candidates | 11025 |
| market_reference_normalized_evidence | 11025 |
| market_reference_coverage_reports | 1 |

## Findings

- apply_failed:[market-reference-backfill-apply] insert failed for market_reference_raw_snapshots: duplicate key value violates unique constraint "market_reference_raw_snapshots_unique_payload"
