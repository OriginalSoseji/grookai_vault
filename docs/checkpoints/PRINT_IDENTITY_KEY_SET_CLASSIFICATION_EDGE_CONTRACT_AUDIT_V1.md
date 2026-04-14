# PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1

## Context

This audit covers the dominant post-cleanup blocker family from
`PRINT_IDENTITY_KEY_BLOCKED_SURFACE_REAUDIT_V2`:

- remaining blocked rows = `458`
- target family = `SET_CLASSIFICATION_EDGE`
- target family size = `238`

The user prompt described this lane as a broad set-classification problem. Live
state is narrower than that: every row in this family already has a valid
canonical `set_id`, and the blocker is that `card_prints.set_code` was never
mirrored into the row while `number_plain` also remained null.

## Live Findings

Uniform live behavior across all `238` rows:

- `set_id` is present and joins cleanly to canonical `sets.code`
- current `card_prints.set_code` is null / blank on all `238`
- active `tcgdex` mapping exists on all `238`
- `tcgdex` set prefix matches the canonical joined set on all `238`
- `tcgdex` localId is numeric on all `238`
- names are unique within each target set, so this lane has no same-name
  ambiguity pressure

Set breakdown:

- `sv04.5 = 137`
- `swsh10.5 = 54`
- `sv06.5 = 47`

## Classification Counts

- `SET_CODE_DERIVABLE_FROM_SET_ID = 238`
- `SET_CODE_MISMATCH_FIXABLE = 0`
- `SET_RECOVERABLE_FROM_EXTERNAL_SOURCE = 0`
- `SET_UNRESOLVABLE = 0`

Interpretation:

- this lane is not a mixed set-recovery problem
- it is a bounded mirror lane where the canonical `sets` table already contains
  the authoritative `set_code`
- external mapping is corroborating evidence, not the primary recovery source

## Recovery Logic

Contract for this family:

1. If `set_id` is valid, authoritative `set_code` must be taken from
   `public.sets`.
2. If active `tcgdex` mapping agrees with the canonical set code, that match is
   sufficient confirmation to proceed.
3. Because every row in this family also has numeric `tcgdex.localId`,
   `number_plain` is simultaneously recoverable from the same authoritative
   external source.
4. After those two mirrors, standard `print_identity_key` derivation becomes
   lawful.

This is the important correction:

- the lane is labeled `SET_CLASSIFICATION_EDGE`
- but the actual live fix is `set_code mirror from set_id` plus
  `number_plain mirror from numeric tcgdex localId`

## Collision Analysis

Simulated post-fix derivation used:

```text
print_identity_key =
lower(concat_ws(':',
  canonical_set_code,
  tcgdex_local_id,
  normalized_name_token,
  printed_identity_modifier_if_present
))
```

Collision result:

- `internal_collision_count = 0`
- `external_collision_count = 0`
- `collision_count_after_fix = 0`

So the full 238-row lane is safe under the planned V3 identity surface.

## Rule Definition

Formal rule:

- If `set_id` is valid:
  - derive `set_code` from canonical `sets`
- If current `set_code` disagrees:
  - override with canonical `sets.code`
- If `set_id` is absent but external set evidence is authoritative:
  - use external mapping
- Else:
  - `DERIVATION_BLOCKED`

Live outcome for this lane:

- every row satisfies the first branch
- no row requires external-only recovery
- no row remains blocked

## Readiness

- `set_edge_row_count = 238`
- `derivable_after_fix_count = 238`
- `remaining_blocked_count = 0` within this family

Broader system implication:

- a future bounded apply for this lane would reduce the global blocked surface
  from `458` to `220`

## Next Execution Recommendation

- `next_execution_unit = PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1`

Why this is the correct move:

- the audit found no unresolved set ambiguity
- the family is collision-free after simulated correction
- further audit would not add signal; the lane is ready for bounded apply
