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
| review_required_context | 158 |
| review_required_high_variance | 241 |
| review_required_single_source | 570 |

## Variance Bands

| Band | Rows |
| --- | ---: |
| bounded_variance | 424 |
| extreme_variance | 135 |
| high_variance | 122 |
| moderate_variance | 312 |

## Flags

| Flag | Rows |
| --- | ---: |
| extreme_variance | 135 |
| high_variance | 122 |
| moderate_variance | 312 |
| non_usd_evidence_excluded | 197 |
| quarantined_context_present | 993 |
| single_source_only | 796 |
| special_lane_review_required | 24 |
| thin_evidence | 6 |

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
| GV-PK-COL-SL10 | review_required_single_source | 1 | 3 | 27494.89 | 1 | single_source_only, quarantined_context_present |
| GV-PK-LC-3 | review_required_single_source | 1 | 6 | 1378.75 | 9.02 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-DRX-125 | review_required_single_source | 1 | 2 | 1292.45 | 1.12 | single_source_only, thin_evidence, quarantined_context_present |
| GV-PK-PLS-136 | review_required_single_source | 1 | 2 | 950 | 1.53 | single_source_only, thin_evidence, quarantined_context_present |
| GV-PK-PLF-122 | review_required_single_source | 1 | 3 | 799.99 | 1.58 | single_source_only, quarantined_context_present |
| GV-PK-DCR-6 | review_required_single_source | 1 | 4 | 526.79 | 1.42 | single_source_only, quarantined_context_present |
| GV-PK-PLS-137 | review_required_single_source | 1 | 4 | 499.99 | 1.14 | single_source_only, quarantined_context_present |
| GV-PK-LTR-115 | review_required_single_source | 1 | 4 | 403.17 | 1.96 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | review_required_single_source | 1 | 6 | 399.95 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-DCR-15 | review_required_single_source | 1 | 4 | 385.98 | 1.54 | single_source_only, quarantined_context_present |
| GV-PK-SW-3 | review_required_single_source | 1 | 8 | 365 | 9.92 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-PR-BLW-BW98 | review_required_single_source | 1 | 3 | 349.99 | 1.58 | single_source_only, quarantined_context_present |
| GV-PK-LC-18 | review_required_single_source | 1 | 6 | 330 | 8 | moderate_variance, single_source_only, quarantined_context_present |
| GV-PK-COL-SL6 | review_required_single_source | 1 | 3 | 309.98 | 1.5 | single_source_only, quarantined_context_present |
| GV-PK-COL-SL5 | review_required_single_source | 1 | 3 | 300 | 2.59 | single_source_only, quarantined_context_present |
| GV-PK-MD-98 | review_required_single_source | 1 | 3 | 299.99 | 3.33 | single_source_only, quarantined_context_present |
| GV-PK-LA-144 | review_required_single_source | 1 | 3 | 264.14 | 1.67 | single_source_only, quarantined_context_present |

## Context Queue

inspect non-USD exclusions, quarantined context, and moderate variance

| GV ID | Status | Sources | Evidence | Median | Ratio | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GV-PK-NXD-48 | review_required_context | 2 | 12 | 0.62 | 9.92 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-NXD-60 | review_required_context | 2 | 12 | 8 | 9.9 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-7 | review_required_context | 2 | 14 | 42.11 | 9.57 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-TR-7 | review_required_context | 2 | 16 | 41.84 | 9.51 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-4 | review_required_context | 2 | 13 | 193.93 | 9.04 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-TR-2 | review_required_context | 2 | 12 | 32.21 | 9.04 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-13 | review_required_context | 2 | 13 | 11.27 | 8.96 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-15 | review_required_context | 2 | 14 | 100 | 8.89 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-11 | review_required_context | 2 | 14 | 142.04 | 8.57 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-23 | review_required_context | 2 | 16 | 10.8 | 8.47 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-NXD-57 | review_required_context | 2 | 11 | 14.34 | 8.42 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-21 | review_required_context | 2 | 16 | 13.74 | 8.13 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-25 | review_required_context | 2 | 14 | 5.15 | 8 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-1 | review_required_context | 2 | 14 | 42.49 | 7.94 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-26 | review_required_context | 2 | 14 | 7.92 | 7.5 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-8 | review_required_context | 2 | 14 | 49.58 | 7.43 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-FO-24 | review_required_context | 2 | 14 | 7.15 | 7.36 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-DET-18 | review_required_context | 2 | 8 | 0.99 | 7.35 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-20 | review_required_context | 2 | 12 | 30.63 | 7.34 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |
| GV-PK-JU-15 | review_required_context | 2 | 12 | 61.52 | 7.14 | moderate_variance, non_usd_evidence_excluded, quarantined_context_present |

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
