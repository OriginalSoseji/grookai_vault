# MEE-09C Reference Signal Review Gate V1

Generated: 2026-06-25T20:05:03.482Z

## Boundary

- Internal review gate only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No price rollups.
- No app-visible pricing.
- No stored rollup created.

## Inputs

| Input | Rows |
| --- | ---: |
| candidates | 21745 |
| normalized_evidence | 21745 |
| signal_candidates | 993 |

## Review Status Counts

| Status | Rows |
| --- | ---: |
| blocked_special_lane_review | 24 |
| review_required_context | 702 |
| review_required_high_variance | 249 |
| review_required_single_source | 18 |

## Variance Bands

| Band | Rows |
| --- | ---: |
| bounded_variance | 411 |
| extreme_variance | 137 |
| high_variance | 128 |
| moderate_variance | 317 |

## Flags

| Flag | Rows |
| --- | ---: |
| extreme_variance | 137 |
| high_variance | 128 |
| moderate_variance | 317 |
| non_usd_evidence_excluded | 753 |
| quarantined_context_present | 993 |
| single_source_only | 244 |
| special_lane_review_required | 24 |

## Summary

| Metric | Value |
| --- | ---: |
| review_ready_count | 0 |
| review_required_count | 969 |
| blocked_count | 24 |
| publishable_count | 0 |

## Review Ready Multi Source Samples

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| none |  | 0 | 0 |  |  |  |

## Review Required Context Samples

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-B2-1 | review_required_context | 2 | 8 | 54.14 | 5.99 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-10 | review_required_context | 2 | 6 | 56.08 | 1.59 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-103 | review_required_context | 2 | 8 | 8.6 | 2.55 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-104 | review_required_context | 2 | 6 | 2.68 | 2.29 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-105 | review_required_context | 2 | 6 | 4.12 | 1.86 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-106 | review_required_context | 2 | 6 | 3.42 | 3.63 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-107 | review_required_context | 2 | 8 | 6.03 | 2.03 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-11 | review_required_context | 2 | 8 | 25.28 | 2.5 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-12 | review_required_context | 2 | 8 | 30.96 | 1.86 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-13 | review_required_context | 2 | 6 | 26.33 | 1.79 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-14 | review_required_context | 2 | 8 | 25.59 | 1.66 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-15 | review_required_context | 2 | 8 | 19.29 | 2.27 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-17 | review_required_context | 2 | 8 | 25.49 | 5.09 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-18 | review_required_context | 2 | 6 | 94.85 | 1.33 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-19 | review_required_context | 2 | 8 | 15.98 | 7.13 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-2 | review_required_context | 2 | 8 | 128.35 | 1.88 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-20 | review_required_context | 2 | 8 | 33.96 | 1.86 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-21 | review_required_context | 2 | 6 | 1.69 | 4.76 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-22 | review_required_context | 2 | 8 | 6.93 | 1.99 | non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-B2-23 | review_required_context | 2 | 8 | 3.94 | 2.39 | non_usd_evidence_excluded, quarantined_context_present |

## Review Required Single Source Samples

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-COL-SL1 | review_required_single_source | 1 | 3 | 169.99 | 2.08 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL5 | review_required_single_source | 1 | 3 | 300 | 2.59 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL6 | review_required_single_source | 1 | 3 | 309.98 | 1.5 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL8 | review_required_single_source | 1 | 3 | 168.25 | 2.57 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-BW04 | review_required_single_source | 1 | 3 | 4.45 | 2.05 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-BW05 | review_required_single_source | 1 | 3 | 2.99 | 6.81 | moderate_variance, single_source_only, quarantined_context_present |

## High Variance Samples

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-LC-21 | review_required_high_variance | 1 | 7 | 140.51 | 536.19 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-COL-23 | review_required_high_variance | 1 | 5 | 2.54 | 507.72 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-PLF-10 | review_required_high_variance | 1 | 8 | 0.53 | 403.71 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LC-28 | review_required_high_variance | 1 | 7 | 19.87 | 365.09 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-PLS-37 | review_required_high_variance | 1 | 7 | 1.24 | 302.91 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-BLW-54 | review_required_high_variance | 1 | 7 | 0.86 | 276.89 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LC-103 | review_required_high_variance | 1 | 7 | 4.51 | 259.85 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LC-33 | review_required_high_variance | 1 | 6 | 81.02 | 253.86 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LTR-81 | review_required_high_variance | 1 | 6 | 0.68 | 244 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-PLB-50 | review_required_high_variance | 1 | 7 | 19.86 | 242.39 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-DRX-98 | review_required_high_variance | 1 | 7 | 0.85 | 242.1 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-PLB-10 | review_required_high_variance | 1 | 8 | 0.76 | 238.84 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-PLF-29 | review_required_high_variance | 1 | 7 | 1.98 | 238.44 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LC-25 | review_required_high_variance | 1 | 6 | 63.19 | 206.49 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-EPO-72 | review_required_high_variance | 1 | 8 | 1.05 | 148.71 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-DEX-88 | review_required_high_variance | 1 | 7 | 1 | 142.38 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-BS-71 | review_required_high_variance | 2 | 8 | 3.1 | 124.99 | extreme_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-LTR-76 | review_required_high_variance | 1 | 6 | 0.82 | 119.96 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LTR-31 | review_required_high_variance | 1 | 6 | 9.29 | 119.28 | extreme_variance, single_source_only, quarantined_context_present |
| GV-PK-LC-35 | review_required_high_variance | 1 | 7 | 74.03 | 117.65 | extreme_variance, single_source_only, quarantined_context_present |

## Findings

- none
