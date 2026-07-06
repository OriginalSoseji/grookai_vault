# MEE-08A Market Reference Warehouse Backfill Manifest V1

Generated: 2026-06-25T18:33:27.749Z

## Boundary

- Artifact-only backfill manifest.
- No provider calls.
- No source fetches.
- No database writes.
- No migration apply.
- No pricing observations writes.
- No pricing rollups.
- No public price publication.

## Inputs

- batch: docs/audits/market_evidence_engine_v1/mee_04c_raw_evidence_acquisition_batch_2026-06-25T17-33-07-661Z.json
- tcgcsv_acquisition: docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-45-49-629Z.json
- pokemontcg_acquisition: docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-34-20-477Z.json
- tcgcsv_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-45-57-604Z.json
- pokemontcg_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-36-37-485Z.json
- coverage_report: docs/audits/market_evidence_engine_v1/mee_06d_free_reference_coverage_gap_2026-06-25T17-46-08-509Z.json
- json: docs/audits/market_evidence_engine_v1/mee_08a_market_reference_warehouse_backfill_manifest_2026-06-25T18-33-27-749Z.json

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| market_reference_acquisition_runs | 5 |
| market_reference_raw_snapshots | 10788 |
| market_reference_candidates | 11025 |
| market_reference_normalized_evidence | 11025 |
| market_reference_coverage_reports | 1 |

## Candidate Sources

| Source | Rows |
| --- | ---: |
| pokemontcg_io_reference | 3618 |
| tcgcsv_reference | 7407 |

## Normalized Dispositions

| Disposition | Rows |
| --- | ---: |
| quarantined_metric | 2047 |
| quarantined_price_outlier | 148 |
| reference_model_candidate | 8830 |

## Gate

- manifest_hash_sha256: `3a54b2744071601dc610d63767d54b3e7f90a5ddaa3ae8a6a3ce687cbae52878`
- ready_for_db_backfill_apply_plan: `true`

## Findings

- none

## Next Step

Create a separate DB backfill apply plan only after reviewing this manifest. That apply plan should insert warehouse rows only and still avoid pricing rollups.
