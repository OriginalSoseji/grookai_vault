# MEE-09A Market Reference Warehouse Readback Smoke V1

Generated: 2026-06-25T18:40:03.498Z

## Boundary

- Remote readback only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No price rollups.
- No public price publication.

## Row Counts

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
| quarantined_metric:false | 2047 |
| quarantined_price_outlier:false | 148 |
| reference_model_candidate:true | 8830 |

## Review Gate

| Check | Rows |
| --- | ---: |
| candidates_without_review_gate | 0 |
| candidates_direct_publishable | 0 |
| candidates_missing_raw_snapshot_link | 0 |
| normalized_direct_publishable | 0 |
| normalized_missing_candidate_link | 0 |

## Coverage

| Metric | Value |
| --- | ---: |
| report_count | 1 |
| target_count | 1000 |
| covered_target_count | 993 |
| uncovered_target_count | 7 |

## Distinct Cards

| Metric | Value |
| --- | ---: |
| candidate_cards | 993 |
| normalized_cards | 993 |
| model_eligible_cards | 993 |

## Findings

- none
