# ECARD2_NAMESPACE_COLLISION_CONTRACT_AUDIT_V1

Status: COMPLETE
Type: Audit + Contract
Scope: Remaining `ecard2` namespace-collision surface after `ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2`
Date: 2026-04-11

## Context
`ecard2` no longer has a single unresolved promotion lane.

Current live state after the 11 collision-free promotions:
- `unresolved_parent_count = 23`
- `canonical_parent_count = 184`
- `PROMOTION_READY_COLLISION_FREE = 0` in current live unresolved state because that lane was already executed
- `namespace_collision_row_count = 13`
- `blocked_conflict_count = 10`

This contract audits only the 13 remaining rows whose proposed promotion GV-IDs collide with existing `GV-PK-AQ-*` namespace.

No mutation was performed.

## Collision Analysis
All 13 audited rows follow the same live pattern:
- proposed `gv_id` already exists as an occupied `GV-PK-AQ-*` row
- source row and collision target share the same `set_id`
- source row and collision target share the same printed name
- source row and collision target share the same `number_plain`
- source row and collision target share the same `variant_key`
- collision target `set_code` is `null`
- collision target has `0` active identities and `0` total identities

Representative examples:
- `Espeon / 11 -> GV-PK-AQ-11`
- `Exeggutor / 12 -> GV-PK-AQ-12`
- `Scizor / 32 -> GV-PK-AQ-32`

This is not a semantic ambiguity surface. The collisions are legacy namespace occupancy by dormant same-identity canonical rows.

## Classification Breakdown
Collision classification:
- `IDENTITY_EQUIVALENT_NAMESPACE_COLLISION = 13`
- `TOKEN_SHARED_DISTINCT_IDENTITIES = 0`
- `CROSS_SET_NAMESPACE_COLLISION = 0`
- `LEGACY_NAMESPACE_CONFLICT = 0`
- `UNCLASSIFIED = 0`

Safe resolution classification:
- `REUSE_CANONICAL = 13`
- `ALTERNATE_GVID_REQUIRED = 0`
- `PERSIST_BLOCKED = 0`
- `IDENTITY_MODEL_EXTENSION_REQUIRED = 0`

## Safe Vs Unsafe Paths
Safe:
- reuse the existing `GV-PK-AQ-*` canonical row when the legacy target is same-set, same-name, same-token, same-variant, and already owns the namespace

Unsafe:
- generate alternate suffix GV-IDs for the same identity
- inject `variant_key` into GV-ID just to escape the occupied namespace
- introduce set-scoped prefix changes
- leave the rows blocked as if they were semantically ambiguous

The unsafe paths are deterministic but wrong. They would create duplicate canonical ownership for an identity that already has a lawful `GV-PK-AQ-*` row.

## GV-ID Strategy Decision
No new GV-ID strategy is required for these 13 rows.

Decision:
- preserve the existing `GV-PK-AQ-*` assignments
- do not create alternate suffixes
- do not modify namespace format
- do not rewrite current GV-IDs

The namespace problem is not lack of namespace capacity. It is that legacy dormant rows already occupy the correct namespace and should be reused.

## Contract Decision
Final contract for the 13 rows:
- collision type: legacy namespace reuse of an identity-equivalent canonical row
- safe resolution type: `REUSE_CANONICAL`
- required future action: repoint the unresolved source row into the existing legacy canonical target, then delete the old unresolved parent

This preserves:
- identity correctness
- deterministic namespace ownership
- existing GV-ID stability
- no schema expansion
- no alternate naming route

## Next Execution Recommendation
Exact next lawful execution unit:

`ECARD2_NAMESPACE_CANONICAL_REUSE_REALIGNMENT_V1`

Why:
- the surface is single-pattern and bounded to 13 rows
- no GV-ID generation decision remains
- no model extension is required
- the blocked 10-row surface remains separate and untouched

## Final State
The remaining namespace-collision surface is fully understood.

Locked conclusions:
- all 13 rows are classified
- all 13 resolve by canonical reuse
- no row requires a new GV-ID
- no row requires persistence as blocked
- no row requires an identity model extension

The next step is an apply artifact that reuses the occupied legacy `GV-PK-AQ-*` canon rows rather than attempting further promotion.
