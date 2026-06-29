# MEE Blocker Policy Closeout V1

Status: plan/run closeout only

## Objective

Close the remaining Market Evidence Engine blocker-policy foundation without additional micro approvals.

This contract finishes the policy layer for:

- Trainer Kit special-lane evidence
- World Championship Deck exact-evidence handling
- MEP, McDonald's, promo/distribution, and Base print-run special lanes
- matcher reclassification
- high-value review
- final publication-gate recheck

## Global Boundary

No blocker policy can publish prices or create market truth.

All lanes remain internal until a separate publication package explicitly approves app-visible pricing.

Forbidden writes:

- `pricing_observations`
- `ebay_active_prices_latest`
- public pricing views
- identity tables
- `card_prints` or `card_printings`
- vault tables
- image/storage tables

## Special-Lane Policies

### Trainer Kit

Policy: `separate_source_matching_required`

Trainer Kit rows require Trainer Kit specific set/source evidence. Ordinary species, number, or later-set collisions must remain held. A future matcher must prove kit identity before any candidate can progress.

Current scope: `14,306` rows across `80` card prints.

### World Championship Deck

Policy: `exact_card_evidence_required`

World Championship rows require exact Championship Deck evidence: year, deck name, replica context, player signature/facsimile signature, deck-list context, or explicit World Championship wording. Ordinary source-card listings remain held.

Current scope: `10,707` rows across `101` card prints.

### MEP Black Star Promos

Policy: `exact_card_or_program_evidence_required`

MEP rows require exact promo/program evidence. Ordinary species or number matches remain held.

Current scope: `6,658` rows across `29` card prints.

### McDonald's

Policy: `exact_card_evidence_required`

McDonald's rows require McDonald's year/set evidence and front-card context. Ordinary species matches remain held.

Current scope: `3,658` rows across `55` card prints.

### Promo / Alternate Distribution

Policy: `distribution_lane_review_required`

Promo, stamp, placement, league, event, or alternate-distribution rows require explicit distribution context.

Current scope: `3,599` rows across `68` card prints.

### Base Print Run

Policy: `print_run_exactness_required`

Shadowless, 1st Edition, 1999-2000, and Base print-run rows require print-run-specific evidence. Ordinary Base Set evidence remains held.

Current scope: `252` rows across `5` card prints.

## Matcher Reclassify Policy

Policy: `deterministic_reclassification_required`

Rows in `needs_matcher_reclassify` cannot be confirmed by lowering thresholds. They require deterministic reclassification, stronger title/set/number/finish parsing, or continued hold.

Current scope: `9,610` rows across `100` card-print/lane groups.

## High-Value Review Policy

Policy: `manual_high_value_review_required`

Rows in `needs_high_value_review` require manual or stricter high-value review. Expensive evidence must not become publication eligible from automated active-listing signals alone.

Current scope: `2,169` rows across `30` card-print/lane groups.

## Final Gate Recheck

Current publication gate:

- total rows: `2,152`
- publication candidates: `0`
- public-boundary leaks: `0`
- deferred confirmation rows: `470`

This is correct. The engine has internal state for the blockers, but no blocker has been promoted to public pricing.

