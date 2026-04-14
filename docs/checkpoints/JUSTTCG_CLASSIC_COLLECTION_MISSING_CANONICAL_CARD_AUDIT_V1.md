# JUSTTCG_CLASSIC_COLLECTION_MISSING_CANONICAL_CARD_AUDIT_V1

## Context

The stale JustTCG bridge is down to one Classic Collection row:

- `pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection`

The prior contract audit already proved:

- `cel25c` exists
- `cel25c` already has canonical rows
- remap to cross-set Team Rocket canon is forbidden

This audit narrows the remaining question:

- is there an existing same-set canonical target that remap logic missed?
- or is the exact `cel25c` canonical card still missing?

## Row Analysis

Target row:

- raw name: `Here Comes Team Rocket!`
- raw number: `15/82`
- raw set: `celebrations-classic-collection-pokemon`
- normalized name: `here comes team rocket!`
- normalized number: `15`
- current mapping status: `MAPPED_TO_NON_CANONICAL_PLACEHOLDER`

Same-set `cel25c` search returns only two relevant rows:

1. exact same-name / same-number row
   - `c267755e-9f4a-4ed5-a6aa-190dd42ae977`
   - `gv_id = null`
   - `name = Here Comes Team Rocket!`
   - `number = 15`
   - `match_type = exact`

2. same-number-only canonical row
   - `d62d4f5c-277b-4f32-b5aa-a393d990fbb3`
   - `gv_id = GV-PK-CEL-15CC`
   - `name = Venusaur`
   - `number = 15`
   - `variant_key = cc`
   - `match_type = number_only`

That means the exact same-set identity exists only as a non-canonical placeholder. There is no non-null same-set canonical target.

## False Base-Set Match Proof

Naive cross-set candidate:

- `0731e27f-ae2e-49a1-a013-b82d0844d9ba`
- `GV-PK-TR-15`
- `Here Comes Team Rocket!`
- set `base5`

Why it looks tempting:

- same printed name
- same original number token `15`

Why it is not lawful:

- `base5` is the original Team Rocket card
- the JustTCG row is a `cel25c` Classic Collection reprint
- cross-set canonical reuse would erase the same-set reprint identity
- same-set remap is required for Classic Collection rows

## Final Classification

The row classifies deterministically as:

- `MISSING_SAME_SET_CANONICAL_CARD`

Why this is not a missed match:

- same-set canonical target count = `0`

Why this is not an identity-model gap:

- the current `cel25c` model already supports distinct cards in the set
- the row has a stable same-set placeholder and a stable printed identity
- the blocker is absence of canonicalization, not inability to represent the card

## Safety Analysis

Future canonical safety:

- `safe_future_canonical_candidate = yes`
- `collision_count_if_promoted = 0`
- `ambiguity_count_if_promoted = 0`

Why promotion appears lawful:

- printed identity is stable
- no duplicate same-set canonical row exists for `Here Comes Team Rocket!`
- no cross-set merge is required if promotion is done inside `cel25c`
- remap remains blocked until that canonical row exists

## Next Execution Recommendation

Required next action:

- `CREATE_MISSING_SAME_SET_CANONICAL_CARD_FIRST`

Exact next execution unit:

- `CEL25C_HERE_COMES_TEAM_ROCKET_CANONICAL_PROMOTION_V1`

Why this is the safest deterministic next step:

- it is single-row, same-set, and bounded
- it resolves the missing canonical card before any bridge remap
- it preserves the rule that bridge follows canon, not the reverse

## Result

The remaining Classic Collection stale bridge is fully explained:

- `classic_collection_row_count = 1`
- `final_classification = MISSING_SAME_SET_CANONICAL_CARD`
- `same_set_canonical_target_exists = no`
- `safe_future_canonical_candidate = yes`
- `remap_allowed_now = no`

The system now has a clean next move:

- create the missing same-set canonical `cel25c` card first
- only then repair the JustTCG mapping
