# MEE Publication Gate Design V1

Status: plan-only

Date: 2026-06-27

## Objective

Define the internal-only publication gate that decides when Market Evidence Engine evidence may become a candidate for future public pricing.

This contract does not publish prices. It does not write app-visible prices. It does not change `pricing_observations`, `ebay_active_prices_latest`, or public pricing views.

## Core Rule

A provider never creates price truth.

The publication gate may only evaluate already-acquired, already-normalized, already-matched, already-classified, quality-gated evidence that has passed internal review and remains replayable to raw evidence.

## Required Inputs

The publication gate may read only internal Market Evidence Engine objects:

- `market_evidence_observations`
- `market_evidence_lifecycle_events`
- `market_evidence_review_dispositions`
- `market_evidence_review_action_events`
- `v_market_evidence_card_signal_summary_v1`
- `v_market_evidence_card_review_queue_v1`
- `v_market_evidence_review_dashboard_queue_v1`
- `v_market_evidence_review_dashboard_status_summary_v1`
- `v_market_evidence_candidate_quality_scores_v1`
- `v_market_evidence_normalization_assignment_queue_v1`

Provider-specific warehouse tables may be used for replay and audit only. They must not bypass lifecycle state.

## Evidence Lanes

Publication evaluation must keep lanes separated:

- `raw_single`: active listing evidence for raw single cards only.
- `slab`: active listing evidence for graded slab listings only.
- `reference_metric`: reference-provider evidence. This can support context but cannot publish alone.
- `mixed_raw_slab`: blocked until split into raw and slab lanes.
- `classification_blocked`: blocked until classification is corrected.
- `unknown`: blocked.
- `low_signal`: monitor-only, not publishable.

Raw singles and slabs must never share a public median or public confidence label.

## Minimum Gate Requirements

An internal publication candidate must satisfy all requirements:

- `card_print_id` is present.
- `gv_id` is present.
- lifecycle has no public-boundary leak.
- normalization assignment queue has no row for the same evidence in `missing_card_print_id`, `missing_gv_id`, or `public_boundary_violation`.
- review disposition is resolved.
- review disposition is `review_confirmed_internal_candidate`.
- evidence lane is `raw_single` or `slab`.
- dashboard handoff candidate is true.
- quality score view has no hard exclusion, lane mismatch, manual policy block, low confidence block, or public-boundary block.
- source evidence is not stale.
- source evidence count and source diversity meet lane thresholds.
- all output remains internal-only until a separate public-pricing implementation explicitly writes a public destination.

## Threshold Policy

Initial dry-run thresholds:

| Lane | Minimum evidence rows | Minimum source family count | Stale window |
| --- | ---: | ---: | --- |
| raw_single | 5 | 1 | 14 days |
| slab | 3 | 1 | 30 days |
| reference_metric | not publishable alone | 2 for supporting context | 30 days |

These thresholds are intentionally conservative. They are not enough by themselves to publish; they only permit internal publication-candidate review.

## Blockers

The gate must block:

- `publishable`, `app_visible`, or `market_truth` already true before gate execution.
- `can_publish_price_directly` true from any provider or candidate row.
- active listing evidence treated as sold-comparable truth.
- reference evidence treated as market truth.
- mixed raw/slab evidence.
- classification-blocked evidence.
- unknown evidence.
- low-signal monitor rows.
- reference-only rows.
- foreign-language, lot, bulk, choose-your-card, sealed, custom, proxy, fake, accessory, or stale evidence.
- missing replay path to raw evidence.

## Output States

The publication gate may produce internal-only decisions:

- `blocked_identity`
- `blocked_public_boundary`
- `blocked_classification`
- `blocked_lane_split_required`
- `blocked_reference_only`
- `blocked_low_signal`
- `blocked_quality`
- `blocked_stale`
- `defer_more_evidence`
- `internal_publication_candidate`

None of these states are app-visible prices.

## Future Handoff Boundary

A future implementation may create an internal table such as `market_evidence_publication_gate_decisions`.

That table must:

- be service-role-only,
- be append-only or versioned,
- preserve rule version and input hashes,
- preserve evidence counts and lane,
- preserve replay references,
- keep `publishable=false`, `app_visible=false`, and `market_truth=false` by default,
- require a separate explicit public-pricing contract before any app-facing view reads from it.

## Non-Goals

This contract does not:

- acquire provider data,
- optimize eBay queries,
- create sold comps,
- publish prices,
- modify app pricing,
- write `pricing_observations`,
- write `ebay_active_prices_latest`,
- modify identity, vault, or image data.

