# MEE-08B Market Reference Warehouse Backfill Apply Gate

- Package: `MARKET-REFERENCE-WAREHOUSE-BACKFILL-V1`
- Mode: `gate_report_only`
- Ready: `true`
- Applied: `false`
- Manifest hash: `f8bdcb1fe884436f5d179cd2a5595e44f7aeec55b5f4e4c45e72069b5e4fd722`
- Migration hash: `2044ee540f6351324d251426c241dcf2e11fbadc2dcbdad15681df50e6f5ca8f`
- Package fingerprint: `4bac2b1c7bbc771dd218cd13f6091ea550336fd1d11a20f4eefa280776f76bb1`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| market_reference_acquisition_runs | 5 |
| market_reference_raw_snapshots | 11025 |
| market_reference_candidates | 11025 |
| market_reference_normalized_evidence | 11025 |
| market_reference_coverage_reports | 1 |

## Findings

- none

## Boundary

- Apply plan only.
- No DB writes.
- No provider calls.
- No pricing rollups.
- No public price publication.
