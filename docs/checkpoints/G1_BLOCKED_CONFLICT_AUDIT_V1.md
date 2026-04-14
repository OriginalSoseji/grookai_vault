# G1_BLOCKED_CONFLICT_AUDIT_V1

Status: COMPLETE
Type: Read-Only Audit
Scope: Unresolved `g1` surface after blocked-conflict-heavy target selection
Date: 2026-04-12

## Context
`g1` was selected as the next live target under the assumption that the unresolved surface was blocked-conflict-heavy and likely dominated by token collisions.

Live audit corrected that assumption.

The actual unresolved `g1` surface decomposes into two deterministic lanes:
- `BASE_VARIANT_COLLAPSE = 13`
- `PROMOTION_REQUIRED = 16`

No mutation was performed.

## Audited Surfaces
- unresolved rows: `29`
- canonical rows: `100`
- live candidate analysis used only current same-set canonical targets under:
  - `NAME_NORMALIZE_V3`
  - `TOKEN_NORMALIZE_V1`

Important live finding:
- the RC-prefixed lane is already representable in the current model because `g1` already has canonical rows such as:
  - `GV-PK-GEN-RC1`
  - `GV-PK-GEN-RC6`
  - `GV-PK-GEN-RC21`
  - `GV-PK-GEN-RC28`
  - `GV-PK-GEN-RC31`
  - `GV-PK-GEN-RC32`

That means unresolved RC-prefixed rows are not an identity-model gap.

## Classification Summary
- `MULTI_CANONICAL_TARGET_CONFLICT = 0`
- `TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES = 0`
- `SUFFIX_OWNERSHIP_CONFLICT = 0`
- `PROMOTION_REQUIRED = 16`
- `IDENTITY_MODEL_GAP = 0`
- `BASE_VARIANT_COLLAPSE = 13`
- `UNCLASSIFIED = 0`

This audit disproves the earlier assumption that token collisions dominate the unresolved `g1` surface.

## Grouped Root Causes
Repeated execution families:

`RC_PREFIX_EXACT_TOKEN_PROMOTION_SURFACE`
- count: `16`
- rows are canon-worthy RC-prefixed identities with no lawful same-name canonical target
- their numeric base already maps to different non-RC canon rows, which is not lawful alias proof

`SAME_TOKEN_NAME_NORMALIZE_COLLAPSE`
- count: `12`
- rows already have a same-token canonical target
- only punctuation / normalization differs, primarily `EX` vs `-EX`

`SUFFIX_TO_BASE_SINGLE_TARGET_COLLAPSE`
- count: `1`
- `Team Flare Grunt / 73a` lawfully reduces to the single same-name canonical target at `73`

## Proof Examples
Non-zero class examples:

`BASE_VARIANT_COLLAPSE`
- `M Charizard EX / 12`
  - lawful target: `M Charizard-EX / 12 / GV-PK-GEN-12`
  - same printed token already exists canonically; only punctuation normalization differs

`BASE_VARIANT_COLLAPSE`
- `Team Flare Grunt / 73a`
  - lawful target: `Team Flare Grunt / 73 / GV-PK-GEN-73`
  - suffix source reduces to exactly one same-name canonical target

`PROMOTION_REQUIRED`
- `Gulpin / RC12`
  - no same-name same-token canonical target exists
  - numeric-base `12` is already owned by `M Charizard-EX`, which is not lawful alias proof
  - existing canonical RC lane proves `RC12` is representable

`PROMOTION_REQUIRED`
- `Gardevoir EX / RC30`
  - no same-name canonical `RC30` target exists
  - numeric-base `30` is owned by `Zubat`, which is a distinct identity
  - the row is canon-worthy and belongs on the RC-prefixed lane

## Dominant Pattern Analysis
Dominant grouped family:
- `RC_PREFIX_EXACT_TOKEN_PROMOTION_SURFACE`
- count: `16`

However, `single_contract_possible = no` for the whole unresolved set.

Reason:
- the dominant RC promotion family is real and reusable
- but `13` rows remain in a separate deterministic collapse lane
- mixing promotion semantics and collapse semantics in one artifact would recreate the same ambiguity this audit was meant to remove

## Next Execution Recommendation
Exact next lawful execution unit:
- `G1_BASE_VARIANT_COLLAPSE_V1`

Why this is the safest deterministic next step:
- it is already fully proven under current normalization rules
- every in-scope row has exactly one lawful target
- no promotion behavior is required
- no schema work is required
- it reduces the set cleanly before the larger RC-prefix promotion lane is handled

Immediate follow-up after that:
- `G1_RC_PREFIX_PROMOTION_LANE_AUDIT_V1`

That second unit should verify collision-free promotion for the remaining `16` RC-prefixed rows and then decide whether they can move directly to bounded promotion apply.

## Final State
`g1` is decomposed from audited reality.

Locked conclusion:
- the unresolved surface is not blocker-dominated in the way originally expected
- the set splits cleanly into:
  - `13` collapse rows
  - `16` promotion rows
- the next lawful unit is a deterministic base-variant collapse artifact
