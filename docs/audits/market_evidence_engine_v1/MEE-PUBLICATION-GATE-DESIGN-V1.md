# MEE-PUBLICATION-GATE-DESIGN-V1

Mode: plan-only

Generated: 2026-06-27

## Scope

Audit completed Market Evidence Engine lifecycle, review disposition, quality scoring, assignment queue, and dashboard read models. Create an internal-only publication gate contract and dry-run implementation plan.

No remote migration apply. No DB writes. No provider calls. No source fetches. No public pricing views. No app-visible pricing.

## Audit Findings

```json
{
  "observations": 194663,
  "lifecycle_events": 1362641,
  "observations_missing_card_print_id": 0,
  "observations_missing_gv_id": 0,
  "lifecycle_public_boundary_leaks": 0,
  "review_public_boundary_leaks": 0,
  "current_publication_handoff_candidates": 0,
  "quality_rows": 0,
  "quality_public_boundary_leaks": 0,
  "assignment_identity_or_boundary_blockers": 0
}
```

## Source Mix

```json
[
  {
    "source_type": "active_listing",
    "source": "ebay_active",
    "rows": 183638
  },
  {
    "source_type": "reference",
    "source": "tcgcsv_reference",
    "rows": 7407
  },
  {
    "source_type": "reference",
    "source": "pokemontcg_io_reference",
    "rows": 3618
  }
]
```

## Rollup-Eligible Evidence Readback

```json
{
  "active_listing_raw_single_events": 5233,
  "active_listing_slab_events": 2270,
  "reference_metric_events": 8830
}
```

## Gate Design

The gate evaluates internal candidate readiness. It does not publish.

Primary dry-run object:

`public.v_market_evidence_publication_gate_candidates_v1`

The proposed view computes:

- `gate_decision`
- `would_be_publication_candidate`
- blocker counts
- lane-specific rollup evidence counts
- stale evidence checks
- closed public flags

## Current Expected Output

The expected current output is zero internal publication candidates because no review disposition is currently `review_confirmed_internal_candidate`.

This is correct. The engine should not publish or hand off anything until review confirmation and publication-gate rules are intentionally applied.

## Required Next Approval

If we want to install the internal gate candidate view, the next approval should be targeted schema apply only. It should still not publish prices.

## Decision

Proceed next with a targeted internal schema candidate apply only if the user wants a live read model for publication-gate candidates.

