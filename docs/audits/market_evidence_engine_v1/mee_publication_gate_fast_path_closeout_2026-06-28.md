# MEE Publication Gate Fast Path Closeout

Date: 2026-06-28

## Scope

Make the internal publication-gate candidate review scalable after the TCGdex reference evidence expansion.

This remains internal-only Market Evidence Engine work. It does not publish prices and does not make pricing app-visible.

## Problem

`public.v_market_evidence_publication_gate_candidates_v1` timed out after the TCGdex lifecycle drain because it recalculated lifecycle rollup counts from `market_evidence_lifecycle_events` during every gate read.

The enlarged lifecycle table now contains millions of event rows, so routine post-ingest checks must not depend on repeated full lifecycle-event aggregation.

## Changes

Added fast-path indexes:

- `market_evidence_lifecycle_events_rollup_eligible_fast_idx`
- `market_evidence_lifecycle_events_public_boundary_fast_idx`

Added internal materialized read model:

- `public.mv_market_evidence_lifecycle_rollup_summary_v1`

Replaced the publication-gate view implementation so it reads:

- `public.market_evidence_review_dispositions`
- `public.mv_market_evidence_lifecycle_rollup_summary_v1`
- `public.v_market_evidence_normalization_assignment_queue_v1`
- `public.v_market_evidence_candidate_quality_scores_v1`

It no longer expands through the heavy dashboard/signal-summary view chain for routine gate evaluation.

## Remote Apply

Applied and marked:

- `20260625150000_market_evidence_publication_gate_fast_path_indexes_v1.sql`
- `20260625160000_market_evidence_lifecycle_rollup_summary_materialized_v1.sql`

Replaced:

- `public.v_market_evidence_publication_gate_candidates_v1`

## Readback

Publication-gate candidate readback now completes.

- candidate rows: `2,152`
- internal publication candidates: `0`
- public-boundary leak rows: `0`

Gate decision summary:

| Gate decision | Evidence lane | Rows |
| --- | --- | ---: |
| `blocked_classification` | `classification_blocked` | `19` |
| `blocked_lane_split_required` | `mixed_raw_slab` | `574` |
| `blocked_low_signal` | `low_signal` | `156` |
| `blocked_low_signal` | `unknown` | `18` |
| `blocked_reference_only` | `reference_metric` | `915` |
| `defer_review_confirmation` | `raw_single` | `378` |
| `defer_review_confirmation` | `slab` | `92` |

Materialized lifecycle summary:

- card rows: `19,726`
- lifecycle public-boundary leak cards: `0`
- refreshed at: `2026-06-28 20:43:13.453903+00`

## Boundary

This work did not write:

- `pricing_observations`
- `ebay_active_prices_latest`
- public pricing views
- app-visible pricing
- public price rollups
- identity tables
- vault tables
- image/storage tables

The publication gate remains an internal readiness review layer only.
