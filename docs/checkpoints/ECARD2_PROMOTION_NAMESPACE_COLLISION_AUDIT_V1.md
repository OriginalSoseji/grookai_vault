# ECARD2_PROMOTION_NAMESPACE_COLLISION_AUDIT_V1

Status: COMPLETE
Type: Read-Only Re-Audit
Scope: `ecard2` unresolved promotion surface after failed apply attempt
Date: 2026-04-11

## Context
`ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V1` failed closed on live hard gate `LIVE_GVID_COLLISIONS:13`.

The requested 24-row collision-free promotion surface does not exist live. The set had to be decomposed again from audited reality before any further apply artifact could be allowed.

Current live top-line state:
- `unresolved_parent_count = 34`
- `canonical_parent_count = 160`
- prior unresolved split remained:
  - `PROMOTION_REQUIRED = 24`
  - `BLOCKED_CONFLICT = 10`

This re-audit tightens only the promotion-required lane.

## Audited Surfaces
- unresolved `ecard2` parents: active `card_print_identity` rows whose parent `card_prints.gv_id` is null
- current canonical rows: all `card_prints` with non-null `gv_id`
- per-row exact-token promotion proposals:
  - `proposed_number_plain`
  - `proposed_variant_key`
  - `proposed_gv_id`
- collision checks against:
  - canonical identity key occupancy
  - live GV namespace occupancy
- existing blocked-conflict rows carried forward unchanged

## Classification Summary
| Execution Class | Count |
| --- | ---: |
| `PROMOTION_READY_COLLISION_FREE` | 11 |
| `PROMOTION_NAMESPACE_COLLISION` | 13 |
| `BLOCKED_CONFLICT` | 10 |
| `UNCLASSIFIED` | 0 |

This is the corrected live decomposition of the full unresolved `ecard2` surface:
- `11` rows can promote immediately without identity-key or GV-ID collision
- `13` rows are promotion-safe by identity, but collide with legacy occupied `GV-PK-AQ-*` namespace
- `10` rows remain blocked for the existing numeric-base ownership reasons

## Collision Characterization
All `13` namespace-collision rows classify as:

`LEGACY_NAMESPACE_ALIAS_COLLISION`

Shared proof pattern for all 13 rows:
- `identity_key_collision = yes`
- `gvid_collision = yes`
- collision target has the same `set_id`, `number_plain`, and `variant_key`
- collision target has the same `GV-PK-AQ-*` value the promotion would generate
- collision target `set_code = null`
- collision target has `active_identity_count = 0`

This is not a semantic blocked-conflict surface. It is a legacy namespace ownership surface.

## Proof Examples
`PROMOTION_READY_COLLISION_FREE`
- `Arcanine / 2 -> GV-PK-AQ-2`
- `Ampharos / H01 -> GV-PK-AQ-H01`

Why these are ready:
- no same-set canonical target exists
- no canonical identity-key collision exists
- no live `gv_id` collision exists

`PROMOTION_NAMESPACE_COLLISION`
- `Espeon / 11 -> GV-PK-AQ-11`
- `Exeggutor / 12 -> GV-PK-AQ-12`

Why these are not ready:
- promotion identity is lawful
- proposed canonical identity and `GV-PK-AQ-*` namespace are already occupied by legacy null-`set_code` rows
- the collision rows are not active canonical owners, but they do occupy the namespace and identity key

`BLOCKED_CONFLICT`
- `Steelix / H23` remains blocked because numeric base `23` is already owned in-set by `Muk / 23`
- holo-token blocked rows remain outside promotion scope and unchanged by this audit

## Why The First Apply Attempt Failed
The failed V1 artifact assumed all 24 promotion-required rows were collision-free. Live dry-run proved otherwise:
- `promotion_ready_count = 11`
- `promotion_namespace_collision_count = 13`
- `collision_count = 13`
- `duplicate_proposed_key_count = 0`
- `blocked_overlap_count = 0`

The failure was correct. The runner failed closed before mutation.

## Next Execution Recommendation
Exact next lawful execution unit:

`ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2`

Why this is the safest deterministic next step:
- it reduces to one single, bounded surface
- scope is only the `11` rows proven collision-free under both identity key and GV namespace
- it leaves the `13` namespace-collision rows untouched
- it leaves the `10` blocked-conflict rows untouched

Required follow-up after that:

`ECARD2_NAMESPACE_COLLISION_CONTRACT_AUDIT_V1`

Reason:
- the 13 collided rows require a namespace ownership / legacy-row contract decision
- they are not blocked by semantic ambiguity
- they are blocked by occupied legacy identity/GV namespace

## Final Decision
`ecard2` is now decomposed from live reality into:
- `PROMOTION_READY_COLLISION_FREE = 11`
- `PROMOTION_NAMESPACE_COLLISION = 13`
- `BLOCKED_CONFLICT = 10`
- `UNCLASSIFIED = 0`

No mutation was performed.

The failed promotion attempt has been converted into a lawful audited split, and the true collision-free promotion surface is now isolated.
