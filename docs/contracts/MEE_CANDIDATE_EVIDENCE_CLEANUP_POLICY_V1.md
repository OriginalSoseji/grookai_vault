# MEE Candidate Evidence Cleanup Policy V1

Status: plan only

## Objective

Define deterministic, non-public cleanup outcomes for `market_listing_card_candidates` behind held publication-gate rows.

This policy does not confirm candidates, publish prices, write public pricing views, or change evidence rows. It describes how candidate evidence should be reviewed before a future `confirm_internal_candidate` package can exist.

## Input Surface

- `public.v_market_evidence_publication_gate_candidates_v1`
- `public.market_listing_card_candidates`
- `public.market_listing_observations`
- `MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1`

## Cleanup Outcomes

### quarantine_candidate

Use when candidate evidence has exclusion flags. These rows must be kept out of future confirmation and rollup handoff until reviewed or replaced.

### require_special_lane_policy

Use when the card identity belongs to a special lane where ordinary listing evidence can be misleading. Examples include World Championship Deck replicas, McDonald's rows, MEP rows, Trainer Kit rows, Base print-run lanes, and promo lanes.

### require_high_value_review

Use when the candidate group crosses high-value thresholds. These rows require stricter manual review before they can become internal publication-gate candidates.

### require_matcher_reclassify

Use when candidate confidence is below the direct-confirm threshold. The fix is deterministic matcher improvement, reclassification, or candidate rejection. The publication threshold should not be lowered to fit noisy evidence.

### keep_review

Use when candidate evidence has no stronger blocker but remains marked `needs_review`. This is still not confirmable.

### defer_until_more_evidence

Use when evidence volume or seller diversity is insufficient. This is a hold, not a rejection.

## Current Audit Result

The audit reviewed `52,630` candidate rows behind `470` held card-print rows.

- `39,180` require special-lane policy
- `9,610` require matcher reclassification
- `2,169` require high-value review
- `1,671` should be quarantined for exclusion flags
- `0` candidate rows have public direct-publish flags
- all `52,630` candidate rows currently have `match_status = needs_review`

## Boundary

This policy cannot:

- mutate `market_listing_card_candidates`
- invoke `apply_market_evidence_review_action_v1`
- write public pricing
- write `pricing_observations`
- write `ebay_active_prices_latest`
- mark evidence as market truth
- mark evidence app-visible
- mutate identity, vault, image, or card-print tables

## Next Gate

After cleanup rules exist, a separate approved package can propose internal review/disposition changes. That future package still must keep all public flags false unless a later publication contract explicitly permits public handoff.

