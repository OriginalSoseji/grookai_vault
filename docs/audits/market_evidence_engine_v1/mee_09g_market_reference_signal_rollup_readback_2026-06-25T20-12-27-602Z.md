# MEE-09G Market Reference Signal Rollup Readback

- Package: `MARKET-REFERENCE-SIGNAL-ROLLUP-READBACK-V1`
- Ready: `true`
- Total rows: `993`
- Expected rows: `993`

## Boundary

- Read-only remote rollup review.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No public/app-visible pricing.

## Internal Locks

| Lock | Rows |
| --- | ---: |
| needs_review_true | 993 |
| publishable_true | 0 |
| app_visible_true | 0 |
| market_truth_true | 0 |
| non_usd_rows | 0 |
| unexpected_rollup_version_rows | 0 |

## Status Counts

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

## High Variance Queue

review price spread and source metric compatibility before trusting

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

## Single Source Queue

acquire a second independent source or keep internal-only

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-COL-SL6 | review_required_single_source | 1 | 3 | 309.98 | 1.5 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL5 | review_required_single_source | 1 | 3 | 300 | 2.59 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL1 | review_required_single_source | 1 | 3 | 169.99 | 2.08 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-SL8 | review_required_single_source | 1 | 3 | 168.25 | 2.57 | single_source_only, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | review_required_single_source | 1 | 11 | 79.79 | 2.99 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | review_required_single_source | 1 | 10 | 72.18 | 5.09 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-BW04 | review_required_single_source | 1 | 3 | 4.45 | 2.05 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-BW05 | review_required_single_source | 1 | 3 | 2.99 | 6.81 | moderate_variance, single_source_only, quarantined_context_present |

## Context Queue

inspect non-USD exclusions, quarantined context, and moderate variance

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-PLB-49 | review_required_context | 2 | 12 | 3.13 | 9.99 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-PLF-88 | review_required_context | 2 | 14 | 0.87 | 9.97 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-NXD-48 | review_required_context | 2 | 12 | 0.62 | 9.92 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-SW-3 | review_required_context | 2 | 16 | 365 | 9.92 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-NXD-60 | review_required_context | 2 | 12 | 8 | 9.9 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-BCR-23 | review_required_context | 2 | 12 | 1.27 | 9.87 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-SW-12 | review_required_context | 2 | 14 | 15.25 | 9.84 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-MT-32 | review_required_context | 2 | 12 | 14.49 | 9.78 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-7 | review_required_context | 2 | 14 | 42.11 | 9.57 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-TR-7 | review_required_context | 2 | 16 | 41.84 | 9.51 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-DEX-79 | review_required_context | 2 | 12 | 1.69 | 9.47 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-COL-26 | review_required_context | 2 | 12 | 1.05 | 9.43 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-SW-23 | review_required_context | 2 | 12 | 2.21 | 9.33 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-LTR-53 | review_required_context | 2 | 13 | 30.02 | 9.26 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-DP-27 | review_required_context | 2 | 12 | 131.05 | 9.24 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-EPO-8 | review_required_context | 2 | 12 | 1.1 | 9.2 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-DRX-19 | review_required_context | 2 | 12 | 10.25 | 9.12 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-PLB-56 | review_required_context | 2 | 14 | 7.92 | 9.12 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-MD-2 | review_required_context | 2 | 12 | 14.99 | 9.11 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-MD-23 | review_required_context | 2 | 12 | 17.68 | 9.1 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |

## Special Lane Queue

never auto-publish without lane-aware exact variant evidence

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-PR-BLW-48-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 244.66 | 10.45 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-48-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 244.66 | 10.45 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-75-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 236.5 | 12.06 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-75-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 236.5 | 12.06 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-53-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 157.47 | 6 | moderate_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-53-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 157.47 | 6 | moderate_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-84-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 127.47 | 21.79 | extreme_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-84-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 127.47 | 21.79 | extreme_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-40-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 121.48 | 23.07 | extreme_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 121.48 | 23.07 | extreme_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-51-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 71.24 | 5.54 | moderate_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-PR-BLW-51-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 71.24 | 5.54 | moderate_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-NVI-43-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 14.65 | 2.23 | single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-NVI-43-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 14.65 | 2.23 | single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-NXD-12-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 5.25 | 10.86 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-NXD-12-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 7 | 5.25 | 10.86 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-DP-52-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 1.32 | 18.88 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-DP-52-STAFF-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 1.32 | 18.88 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-SW-106-ORIGINS-GAME-FAIR-2008-STAFF-STAMP | blocked_special_lane_review | 1 | 6 | 1.12 | 13.6 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |
| GV-PK-MD-42-PRERELEASE-STAMP | blocked_special_lane_review | 1 | 6 | 1.06 | 13.56 | high_variance, single_source_only, quarantined_context_present, special_lane_review_required |

## Findings

- none
