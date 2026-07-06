# MEE-PRICE-PUBLICATION-POLICY-V1

Mode: plan-only

Generated: 2026-06-29T03:48:24.494Z

## Purpose

Define the first deterministic internal policy that decides which internal price candidates may advance toward future publication review.

This does not publish pricing and does not write any public pricing destination.

## Current Policy Readback

| Metric | Count |
| --- | ---: |
| Total policy rows | 16833 |
| Internal price policy candidates | 329 |
| Future publication review candidates | 11 |

Public-boundary proof: can_publish_price_directly=0, publishable=0, app_visible=0, market_truth=0.

## Decision Summary

| Decision | Source | Lane | Rows | Internal Candidates | Future Review | Median |
| --- | --- | --- | --- | --- | --- | --- |
| defer_more_evidence | active_listing | raw_single | 224 | 0 | 0 | 30.055 |
| defer_more_evidence | active_listing | slab | 243 | 0 | 0 | 130.35 |
| hold_high_value_manual_review | active_listing | raw_single | 32 | 0 | 0 | 356.805 |
| hold_outlier_review | active_listing | raw_single | 14 | 0 | 0 | 41.725 |
| hold_reference_context_only | reference | reference | 14572 | 0 | 0 | 0.85 |
| hold_slab_grade_policy | active_listing | slab | 391 | 0 | 0 | 305.98 |
| hold_special_lane_policy | active_listing | raw_single | 599 | 0 | 0 | 5.52 |
| hold_special_lane_policy | active_listing | slab | 429 | 0 | 0 | 124.99 |
| raw_single_policy_candidate | active_listing | raw_single | 271 | 271 | 11 | 40 |
| raw_single_review_candidate | active_listing | raw_single | 58 | 58 | 0 | 90.66 |

## Candidate Samples

| GV ID | Lane | Median | Evidence | Sellers |
| --- | --- | --- | --- | --- |
| GV-PK-EM-104 | raw_single | 19.99 | 98 | 24 |
| GV-PK-TRR-6 | raw_single | 65.96 | 70 | 19 |
| GV-PK-LM-14 | raw_single | 40 | 68 | 30 |
| GV-PK-CG-89 | raw_single | 51.99 | 66 | 15 |
| GV-PK-DR-12 | raw_single | 34.99 | 59 | 16 |
| GV-PK-HP-101 | raw_single | 79 | 58 | 15 |
| GV-PK-MA-11 | raw_single | 30 | 51 | 14 |
| GV-PK-HL-100 | raw_single | 73.98 | 51 | 11 |
| GV-PK-SS-2 | raw_single | 24.02 | 50 | 15 |
| GV-PK-TRR-9 | raw_single | 90 | 46 | 12 |
| GV-PK-TRR-10 | raw_single | 75.99 | 40 | 13 |

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, function invocation, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image writes, deletes, upserts, merges, or global apply were performed.

Package fingerprint: `0002ee345d2fba027a6f9ffe2229d2cc5e0efd9700ee60745caee6941a2032d6`
