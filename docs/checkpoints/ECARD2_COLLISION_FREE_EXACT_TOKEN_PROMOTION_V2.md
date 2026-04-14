# ECARD2_COLLISION_FREE_EXACT_TOKEN_PROMOTION_V2

Status: COMPLETE
Type: Bounded Apply Artifact
Scope: `ecard2` collision-free exact-token promotion subset
Date: 2026-04-11

## Context
The first promotion artifact failed correctly because the requested 24-row collision-free surface did not exist live.

Re-audit established the actual split:
- `PROMOTION_READY_COLLISION_FREE = 11`
- `PROMOTION_NAMESPACE_COLLISION = 13`
- `BLOCKED_CONFLICT = 10`

This V2 artifact executes only the 11 rows proven safe under both:
- canonical identity key ownership
- live `GV-PK-AQ-*` namespace ownership

## Proof
Validated apply surface:
- `promotion_source_count = 11`
- `identity_key_collisions = 0`
- `gvid_collisions = 0`
- `duplicate_proposed_keys = 0`
- `overlap_with_excluded_rows = 0`

Excluded rows held outside scope:
- `remaining_namespace_collision_rows = 13`
- `remaining_blocked_conflict_rows = 10`

Representative promoted rows:
- `Arcanine / 2 -> GV-PK-AQ-2`
- `Ariados / 3 -> GV-PK-AQ-3`
- `Ampharos / H01 -> GV-PK-AQ-H01`

## Apply Model
This runner uses true promotion semantics:
1. create a new canonical `card_prints` row for each of the 11 safe sources
2. assign the deterministic `GV-PK-AQ-*` id
3. repoint dependent FK surfaces to the new canonical row
4. delete the old unresolved parent

The old unresolved rows have:
- `set_code = null`
- `number = null`
- `number_plain = null`
- `gv_id = null`

That makes parallel canonical insertion lawful under the current `card_prints` uniqueness surface for these 11 rows.

## Invariants Preserved
- only `ecard2` rows in the 11-row ready surface enter scope
- the 13 namespace-collision rows remain unresolved and untouched
- the 10 blocked-conflict rows remain unresolved and untouched
- no existing non-null `gv_id` row is rewritten
- no cross-set mutation occurs
- no GV-ID builder logic is modified

## FK Movement
Repointed surfaces:
- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`
- `vault_items`

Because each target row is newly inserted, FK movement is a pure repoint with no target-side merge surface expected.

## Post-Apply State
Required verification target:
- `promotion_count = 11`
- `remaining_promotion_required_rows = 13`
- `remaining_namespace_collision_rows = 13`
- `remaining_blocked_conflict_rows = 10`
- canonical `ecard2` count increases by `11`
- FK integrity remains valid

## Risks Checked
- hidden GV namespace collision on the 11-row surface
- hidden canonical identity-key collision on the 11-row surface
- excluded row leakage into the apply scope
- unsupported FK surfaces preventing old-parent deletion

## Result
The safe `ecard2` promotion surface is executed independently.

The unresolved `ecard2` surface after this apply is intentionally reduced to:
- `13` namespace-collision rows
- `10` blocked-conflict rows

No broader promotion or namespace contract behavior is introduced by this artifact.
