# MEE Special Lane Cleanup Policy V1

Status: plan only

## Objective

Define deterministic handling for candidate evidence held in `needs_special_lane_policy` before any publication-gate confirmation can happen.

Special lanes are not ordinary market lanes. A provider listing that matches the species/name/number of an ordinary source card is not enough to confirm a special-lane card.

## Families

### World Championship Deck

Policy: `exact_card_evidence_required`

World Championship Deck rows require listing evidence that explicitly indicates the Championship Deck replica context. Acceptable signals include year, deck name, world championship wording, replica/non-tournament wording, player signature/facsimile signature, or exact deck-list context.

Ordinary source-card listings must remain held.

### McDonald's

Policy: `exact_card_evidence_required`

McDonald's rows require the McDonald's set/year context and front-card evidence. Ordinary species or number matches must remain held.

### MEP Black Star Promos

Policy: `exact_card_or_program_evidence_required`

MEP rows require exact promo/program evidence. Ordinary species/name/number matches are not sufficient.

### Trainer Kit

Policy: `separate_source_matching_required`

Trainer Kit rows require trainer-kit-specific source matching. Ordinary set listings and modern set-number collisions must remain held.

### Base Print Run

Policy: `print_run_exactness_required`

Base print-run lanes require explicit print-run evidence such as Shadowless, 1st Edition, 1999-2000, or equivalent observable card-front/back detail. Ordinary Base Set evidence must remain held.

### Promo Or Alternate Distribution

Policy: `distribution_lane_review_required`

Promo, stamp, placement, league, event, or alternate-distribution rows require explicit distribution context before confirmation.

## Current Audit

The audit reviewed `39,180` special-lane cleanup rows across `338` card prints.

Rows by family:

- `trainer_kit`: `14,306`
- `world_championship_deck`: `10,707`
- `mep_black_star_promos`: `6,658`
- `mcdonalds`: `3,658`
- `promo_or_alt_distribution`: `3,599`
- `base_print_run`: `252`

Public-boundary leak rows: `0`

## Publication Rule

No special-lane cleanup row may move to `confirm_internal_candidate` until it has a family-specific policy result proving exact or explicitly representative evidence. Representative evidence may support display or internal review, but it cannot become public market truth unless a later publication policy explicitly permits it.

## Boundary

This policy cannot:

- write cleanup events
- mutate candidate rows
- publish prices
- write `pricing_observations`
- write `ebay_active_prices_latest`
- mark app-visible pricing
- mutate identity, card print, vault, or image tables

