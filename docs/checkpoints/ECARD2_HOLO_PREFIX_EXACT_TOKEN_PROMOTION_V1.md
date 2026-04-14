# ECARD2_HOLO_PREFIX_EXACT_TOKEN_PROMOTION_V1

Status: COMPLETE
Type: Bounded Apply Artifact
Scope: Remaining `ecard2` holo-prefix exact-token promotion surface
Date: 2026-04-12

## Context
The prior `ecard2` work left exactly 10 unresolved rows after:
- `COLLISION_FREE_PROMOTION -> COMPLETE (11)`
- `NAMESPACE_REUSE -> COMPLETE (13)`

The blocked audit reclassified all 10 residual rows as lawful exact-token promotions on the `H##` printed-number lane.

This artifact is intentionally narrow:
- set scope is `ecard2` only
- source scope is the exact 10 unresolved `H##` rows only
- no namespace reuse behavior
- no canonical-row rewrite
- no GV-ID builder changes

## Proof
Hard gates satisfied:
- `source_count = 10`
- all printed tokens match `H\d+`
- no same-set exact-token canonical target exists
- no identity-key collision exists
- no GV-ID collision exists
- no duplicate `H##` tokens exist in scope

Deterministic GV-ID outputs used:
- `H10 -> GV-PK-AQ-H10`
- `H14 -> GV-PK-AQ-H14`
- `H21 -> GV-PK-AQ-H21`
- `H22 -> GV-PK-AQ-H22`
- `H23 -> GV-PK-AQ-H23`
- `H24 -> GV-PK-AQ-H24`
- `H26 -> GV-PK-AQ-H26`
- `H27 -> GV-PK-AQ-H27`
- `H29 -> GV-PK-AQ-H29`
- `H31 -> GV-PK-AQ-H31`

## Apply Model
The runner promotes each of the 10 unresolved parents into its own new canonical row:
1. validate exact audited source scope
2. generate deterministic `GV-PK-AQ-H##` ids
3. create canonical `card_prints` rows
4. repoint dependent FK surfaces
5. delete the old unresolved parents

## Invariants Preserved
- only the 10 audited holo-prefix rows enter scope
- no previously resolved `ecard2` rows are touched
- no existing canonical row is reused or rewritten
- no cross-set mutation occurs
- no namespace fallback rule is introduced

## FK Surfaces
The apply runner inventories and repoints:
- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`
- `vault_items`

## FK Movement
Applied FK movement:
- `inserted_canonical_rows = 10`
- `card_print_identity = 10`
- `card_print_traits = 10`
- `card_printings = 10`
- `external_mappings = 10`
- `vault_items = 0`

## Post-Apply State
Verified live result:
- `promotion_count = 10`
- `remaining_unresolved_rows = 0`
- canonical `ecard2` count delta = `10`
- new canonical rows with non-null GV-ID = `10`
- distinct new GV-IDs = `10`
- FK orphan counts all = `0`

Representative promoted rows:
- `Exeggutor / H10 -> GV-PK-AQ-H10`
- `Kingdra / H14 -> GV-PK-AQ-H14`
- `Scizor / H21 -> GV-PK-AQ-H21`
- `Slowking / H22 -> GV-PK-AQ-H22`
- `Steelix / H23 -> GV-PK-AQ-H23`

## Risks Checked
- stale source scope after prior promotion/reuse work
- accidental reuse of an existing canonical row
- hidden `GV-PK-AQ-H##` namespace collision
- unsupported FK references blocking parent deletion

## Result
The final unresolved `ecard2` holo-prefix surface was promoted without namespace collision or reuse behavior.

Post-apply conclusion:
- `ecard2` unresolved surface = `0`
- holo-prefix identity lane is now canonical
- no additional `ecard2` promotion artifact is required for this surface
