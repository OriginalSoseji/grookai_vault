# CONTROLLED_GROWTH_INGESTION_RULE_HARDENING_AUDIT_V1

## Context

`CONTROLLED_GROWTH_INGESTION_PIPELINE_V1` surfaced `31` staged rows as false promotion candidates.

Prior audit result:

- `TRUE_NEW_CANONICAL = 0`
- `MISSED_NORMALIZATION = 3`
- `NAMESPACE_COLLISION = 1`
- `PARTIAL_MATCH_REQUIRING_RULE = 8`
- `NON_CANONICAL = 19`

Canonical expansion remains blocked. The correct next step is rule hardening inside staging classification, not promotion.

## Candidate Breakdown

Hardened rule-gap decomposition:

- `NORMALIZATION_RULE_GAP = 3`
- `NAMESPACE_RULE_GAP = 1`
- `MATCH_HEURISTIC_RULE_GAP = 8`
- `NON_CANONICAL_FILTER_RULE_GAP = 19`
- `REVIEW_SURFACE_CORRECT_AS_IS = 0`
- `UNCLASSIFIED = 0`

## Grouped Root Causes

Repeated families found in the 31-row surface:

- `TRAINER_KIT_DECK_SLOT_NON_CANONICAL_FILTER = 19`
  - all from `tk-sm-l`
  - deck-slot markers such as `(#10)` are upstream disambiguators, not printed identity
- `PROMO_EVENT_REVIEW_ROUTING = 6`
  - Nintendo promo staff and event surfaces
  - examples include `[Staff]`, `Prerelease`, `City Championships`, `Origins Game Fair`
- `LOCALE_SPECIAL_PROMO_REVIEW_ROUTING = 2`
  - locale/special edition promo surfaces
  - `Red's Pikachu (Japanese Exclusive)`
  - `Clefairy - 381/SM-P (Dream League)`
- `SYMBOL_ALIAS_NORMALIZATION_MATCH = 2`
  - `Nidoran F` should match `Nidoran♀`
  - `Nidoran M` should match `Nidoran♂`
- `SPELLING_ALIAS_NORMALIZATION_MATCH = 1`
  - `Ghastly` should match canonical `Gastly`
- `SAME_SET_TOKEN_NAMESPACE_GUARD = 1`
  - `Charcadet - 022` conflicts with existing same-set number ownership in `me02`

## Crosswalk

Original audit class to hardening bucket:

- `MISSED_NORMALIZATION (3)` -> `NORMALIZATION_RULE_GAP (3)`
- `NAMESPACE_COLLISION (1)` -> `NAMESPACE_RULE_GAP (1)`
- `PARTIAL_MATCH_REQUIRING_RULE (8)` -> `MATCH_HEURISTIC_RULE_GAP (8)`
- `NON_CANONICAL (19)` -> `NON_CANONICAL_FILTER_RULE_GAP (19)`

No row remained unexplained.

## Priority Hardening Plan

Priority order:

1. `CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1`
   - target surface: `19`
   - risk: `low`
   - effect: removes the largest false-promotion family by filtering trainer-kit deck-slot artifacts before promotion staging
2. `CONTROLLED_GROWTH_INGESTION_NORMALIZATION_RULES_V1`
   - target surface: `3`
   - risk: `low`
   - effect: converts `Ghastly`, `Nidoran F`, and `Nidoran M` into deterministic canonical matches
3. `CONTROLLED_GROWTH_INGESTION_MATCH_HEURISTIC_RULES_V1`
   - target surface: `8`
   - risk: `medium`
   - effect: routes staff, event, and locale promo surfaces into review instead of promotion
4. `CONTROLLED_GROWTH_INGESTION_NAMESPACE_RULES_V1`
   - target surface: `1`
   - risk: `medium`
   - effect: blocks false promotion when same-set printed-number ownership is already occupied

## Gate Decision

`promotion_allowed_after_rule_hardening = no`

Why:

- rule hardening only reclassifies the false-promotion rows into `MATCHED`, `NEEDS_REVIEW`, or `NON_CANONICAL`
- no row becomes a lawful promotion candidate under current maturity and canonical-growth gates
- canonical expansion remains blocked

## Next Execution Recommendation

Next lawful execution unit:

- `CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1`

Why this is the highest-leverage safe move:

- it removes `19/31` false promotion candidates in one bounded low-risk change
- it does not require canonical mutation
- it narrows the remaining false-promotion surface to smaller rule families that can be hardened separately
