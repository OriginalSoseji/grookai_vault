# MEE_09C_REFERENCE_SIGNAL_REVIEW_GATE_V1

## Status

Implemented as a read-only internal review gate.

No database writes, provider calls, source fetches, pricing observations, price rollups, public pricing views, app-visible pricing, identity writes, vault writes, or image writes were executed.

## Purpose

Grade the 993 internal USD reference signal candidates from `MEE_09B` before any stored rollup or UI-facing reference display is proposed.

This gate is intentionally conservative. It is a classifier, not an approval to publish prices.

## Inputs

- `public.market_reference_candidates`
- `public.market_reference_normalized_evidence`
- `MEE_09B_INTERNAL_REFERENCE_SIGNAL_READ_MODEL_V1`

## Review Checks

Each signal is classified using:

- source quorum
- eligible evidence count
- low/median/high price spread
- variance band
- quarantined evidence context
- non-USD evidence exclusion context
- special-lane/stamp heuristics
- publishable leakage guard

Variance bands:

```text
bounded_variance: ratio < 4
moderate_variance: ratio >= 4
high_variance: ratio >= 10
extreme_variance: ratio >= 20
```

Special-lane review blocks are applied for lane hints such as:

- Staff
- prerelease
- McDonald's
- Trainer Kit
- World Championship
- Shadowless / 1st Edition / 1999-2000

## Current Proof

Latest live readback:

```text
reviewed_signal_count: 993
publishable_count: 0
review_ready_count: 0
review_required_count: 969
blocked_count: 24
```

Status counts:

```text
blocked_special_lane_review: 24
review_required_context: 158
review_required_high_variance: 241
review_required_single_source: 570
```

Variance bands:

```text
bounded_variance: 424
moderate_variance: 312
high_variance: 122
extreme_variance: 135
```

Flag counts:

```text
single_source_only: 796
non_usd_evidence_excluded: 197
quarantined_context_present: 993
special_lane_review_required: 24
thin_evidence: 6
```

## Interpretation

The result is healthy but not publish-ready:

- The warehouse is useful for internal signal analysis.
- USD-only aggregation is working.
- No signal is publishable.
- Every candidate still needs a review step because V1 preserves quarantined context and does not yet define provider/metric weighting.
- Special lanes are blocked from rollup promotion.

## Commands

```bash
npm run mee:reference-signal-review
node --test tests/contracts/market_evidence_engine_reference_signal_review_gate_v1.test.mjs
```

## Next Step

Design `MEE_09D_REFERENCE_SIGNAL_ROLLUP_CONTRACT_V1`.

That contract should define a stricter internal-only rollup table or materialized artifact for reviewed signals. It must decide:

- whether to store only review-ready rows or all classified rows
- metric weighting policy
- outlier handling
- source quorum requirements
- special-lane exclusion rules
- stale-data and refresh windows
- whether any reference display is allowed later, and under what label

No stored rollup should be created until that contract is approved.
