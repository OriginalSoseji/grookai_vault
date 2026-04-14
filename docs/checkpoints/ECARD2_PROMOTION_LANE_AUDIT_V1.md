# ECARD2_PROMOTION_LANE_AUDIT_V1

Status: COMPLETE
Type: Read-Only Lane Audit
Scope: `ecard2` unresolved identity surface
Date: 2026-04-11

## Context
`ecard2` was selected as the next live target from the remaining mixed-execution bucket because the coarse target-selection audit marked it `PROMOTION_HEAVY`.

Selection-time metrics were:
- `unresolved_parent_count = 34`
- `canonical_parent_count = 160`
- `same_token_conflicts = 0`
- `fan_in_group_count = 0`
- `normalization_count = 4`
- `blocked_conflict_count = 9`
- `promotion_candidate_count = 21`

This audit re-checked that surface row by row before any apply artifact was allowed.

## Audited Surfaces
- unresolved parents: active `card_print_identity` rows for `set_code_identity = 'ecard2'` whose parent `card_prints.gv_id` is null
- canonical in-set targets: `card_prints` where `set_code = 'ecard2'` and `gv_id is not null`
- normalized same-set candidates under `NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1`
- cross-set same-name/same-number coincidences to test whether alias behavior was actually proven
- promotion-required rows with no lawful same-set target
- blocked conflicts where numeric-base ownership was already taken by a different in-set canonical row
- promotion namespace collisions inside the exact-token `GV-PK-AQ-*` lane

## Hard Findings
The coarse selection metrics overstated a 4-row normalization-ready surface.

Row-level proof shows:
- no lawful same-set `BASE_VARIANT_COLLAPSE` rows remain
- three of the four coarse “normalization” rows are actually `PROMOTION_REQUIRED`
- one of the four coarse “normalization” rows, `Steelix / H23`, is actually `BLOCKED_CONFLICT`

Why the coarse metric drifted:
- it treated single cross-set same-name/same-number coincidences as normalization-like
- those candidate sets were unrelated (`si1`, `neo3`, `swsh2`, `ex2`)
- unrelated cross-set coincidence is not lawful alias proof

Audited reality therefore is:
- `PROMOTION_REQUIRED = 24`
- `BASE_VARIANT_COLLAPSE = 0`
- `BLOCKED_CONFLICT = 10`
- `UNCLASSIFIED = 0`

## Classification Summary
| Execution Class | Count |
| --- | ---: |
| `PROMOTION_REQUIRED` | 24 |
| `BASE_VARIANT_COLLAPSE` | 0 |
| `BLOCKED_CONFLICT` | 10 |
| `UNCLASSIFIED` | 0 |

Additional promotion sub-split:
- `PROMOTION_READY = 11`
- `PROMOTION_NAMESPACE_COLLISION = 13`

This means the promotion lane is lawful, but it cannot be executed as one artifact.

## Why The Blocked Rows Are Blocked
All `10` blocked rows are holo-token rows whose numeric base is already owned by a different in-set canonical card.

Representative examples:
- `Exeggutor / H10` is blocked by canonical `Entei / 10` (`GV-PK-AQ-10`)
- `Kingdra / H14` is blocked by canonical `Houndoom / 14` (`GV-PK-AQ-14`)
- `Steelix / H23` is blocked by canonical `Muk / 23` (`GV-PK-AQ-23`)

These are not lawful promotions under the current token law because `TOKEN_NORMALIZE_V1` reduces `H23 -> 23`, and `23` already belongs to a different `ecard2` canonical identity.

## Why The Promotion Rows Are Promotion-Safe
The `24` promotion rows have:
- no lawful same-set canonical target
- no fan-in
- no same-token in-set conflict
- stable printed identity surfaces

Representative numeric promotion examples:
- `Arcanine / 2`
- `Ariados / 3`
- `Azumarill / 4`
- `Electrode / 8`

Representative holo promotion examples:
- `Ampharos / H01`
- `Bellossom / H05`
- `Entei / H08`

Cross-set coincidences that do not block promotion:
- `Exeggutor / 13 -> GV-PK-SI-13` in `si1`
- `Kingdra / 19 -> GV-PK-N3-19` in `neo3`
- `Ninetales / 25 -> GV-PK-RCL-25` in `swsh2`

Those rows remain promotion-safe because no related-lane alias proof exists. They are same-name/same-number coincidences, not lawful alias collapse targets.

## Promotion Lane Split
The `24` promotion-required rows split again at exact-token namespace time:

- `11` rows are collision-free and ready for exact-token promotion
- `13` rows collide with already-existing `GV-PK-AQ-*` rows

The collision subset is not theoretical. Existing rows already occupy:
- `GV-PK-AQ-11`
- `GV-PK-AQ-12`
- `GV-PK-AQ-13`
- `GV-PK-AQ-15`
- `GV-PK-AQ-16`
- `GV-PK-AQ-17`
- `GV-PK-AQ-18`
- `GV-PK-AQ-19`
- `GV-PK-AQ-20`
- `GV-PK-AQ-25`
- `GV-PK-AQ-28`
- `GV-PK-AQ-30`
- `GV-PK-AQ-32`

Audit proof on those colliders:
- `set_code = null`
- same `set_id` as the `ecard2` family
- same printed name and token as the unresolved row
- `active_identity_count = 0`

That is a namespace/realignment problem, not a direct promotion-safe subset.

## Proof Examples
Non-zero class examples:

`PROMOTION_REQUIRED`
- `Arcanine / 2`: no same-set target, no numeric-base conflict, exact-token namespace unoccupied
- `Exeggutor / 13`: no same-set target, unrelated `si1` coincidence exists, exact-token namespace already occupied by a stranded null-`set_code` row

`BLOCKED_CONFLICT`
- `Exeggutor / H10`: blocked by in-set `Entei / 10`
- `Steelix / H23`: blocked by in-set `Muk / 23`; unrelated `ex2 Steelix / 23` does not resolve the conflict

There is no non-zero `BASE_VARIANT_COLLAPSE` example because that lane audited to zero.

## Next Execution Recommendation
Exact next lawful execution unit:

`ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1`

Why this is the safest deterministic next step:
- it reduces to a single surface
- scope is only the `11` promotion rows whose exact-token `GV-PK-AQ-*` namespace is unoccupied
- it avoids the `13` namespace-collision rows entirely
- it leaves the `10` blocked holo-token conflicts untouched

This audit therefore concludes:
- promotions cannot run in one bounded artifact
- the promotion lane must be split
- the first apply artifact should target only the `11` collision-free exact-token promotion rows

Recommended follow-up after that subset:
- separate namespace/realignment audit for the `13` collided promotion rows
- separate blocked-conflict audit/contract for the `10` holo-token numeric-base ownership conflicts

## Result
`ecard2` is decomposed from audited reality.

Formal audited split:
- `PROMOTION_REQUIRED = 24`
- `BASE_VARIANT_COLLAPSE = 0`
- `BLOCKED_CONFLICT = 10`
- `UNCLASSIFIED = 0`

Formal next lawful unit:
- `ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1`
