# PRINT_IDENTITY_KEY_VARIANT_AMBIGUITY_CONTRACT_AUDIT_V1

## Context

This audit covers the remaining blocked surface after:

- shadow-row reuse realignment
- promo backfill
- set-classification edge backfill

Locked live blocker state at audit time:

- original blockers = `1363`
- shadow rows resolved = `693`
- promo rows resolved = `181`
- set-classification edge resolved = `238`
- remaining blocked rows = `220`

The prompt framed the remaining surface as pure variant ambiguity. Live state is
slightly narrower and more concrete:

- every remaining row has `variant_key = ''`
- every remaining row has `printed_identity_modifier = ''`
- the real blocker is not malformed variant data
- the real blocker is unresolved multi-lane identity when repeated names still
  have no mirrored number surface, plus a smaller legacy numbering residue

## Family Breakdown

Final exhaustive family assignment:

- `SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION = 194`
- `OTHER = 26`
- `EMPTY_VS_NULL_VARIANT_KEY_EQUIVALENCE = 0`
- `LEGACY_VARIANT_KEY_NORMALIZATION_REQUIRED = 0`
- `PRINTED_IDENTITY_MODIFIER_AND_VARIANT_KEY_OVERLAP = 0`
- `CHILD_PRINTING_MODELING_GAP = 0`
- `UNCLASSIFIED = 0`

Interpretation:

- the dominant lane is the modern special-set repeated-name surface
- the residual non-dominant lane is legacy numbering, not a modern variant-key
  problem

## Repeated Patterns

All `194` dominant-family rows live in three sets:

- `sv04.5 = 108`
- `sv06.5 = 52`
- `swsh10.5 = 34`

Repeated-name examples:

- `sv04.5 / Paldean Student / 085, 086, 230, 231`
- `sv04.5 / Clive / 078, 227, 236`
- `sv06.5 / Pecharunt ex / 039, 085, 093, 095`
- `swsh10.5 / Mewtwo VSTAR / 031, 079, 086`

Important live fact:

- these rows do not differ by stored `variant_key`
- they do not differ by stored `printed_identity_modifier`
- they differ by authoritative `tcgdex.localId`
- once that numeric surface is mirrored into `number`, the ambiguity disappears

Legacy residue:

- `ecard3 = 15`
- `col1 = 11`

Representative legacy patterns:

- `ecard3 / Magcargo / H16 and H17`
- `col1 / Groudon / 6 and SL4`
- `col1 / Dialga / SL2`

These rows are collision-free under simulation, but they still deserve a
separate historical numbering contract because `H` and `SL` semantics should
not be folded into the modern numeric lane by assumption.

## Derivation Safety

### SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION

- `safe_to_derive_now = yes`
- `collision_count_if_derived = 0`
- `ambiguity_count_if_derived = 0`

Safe derivation rule for this family:

1. mirror canonical `set_code`
2. mirror numeric `tcgdex.localId` into `number`
3. allow generated `number_plain` to follow from live schema
4. derive `print_identity_key` from:
   - `effective_set_code`
   - mirrored number surface
   - normalized printed name
   - empty modifier lane

### OTHER

- `safe_to_derive_now = no`
- `collision_count_if_derived = 0`
- `ambiguity_count_if_derived = 0`

Why this still stays blocked:

- the remaining `26` rows are not failing on collision
- they are failing on contract discipline
- legacy localId forms such as `H16` and `SL4` need their own numbering rule
  before a bounded apply is lawful

## Execution Roadmap

Recommended next sequence:

1. `PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1`
2. `PRINT_IDENTITY_KEY_LEGACY_LOCAL_ID_NUMBERING_CONTRACT_AUDIT_V1`

Why the first unit is correct:

- it covers the dominant `194`-row family
- the simulated derivation is collision-free
- the distinction signal already exists in authoritative `tcgdex.localId`
- no variant-key or modifier migration is needed

## Final Decision

- `variant_ambiguity_row_count = 220`
- `dominant_family = SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION`
- `safe_to_derive_now_counts = { yes: 194, no: 26 }`
- `next_execution_unit = PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1`
- `audit_status = passed`
