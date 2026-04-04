# PHASE2A_CANONICAL_PROMOTION_NUMERIC_ONLY_V1

## Scope Summary

Phase 2A promoted only the safe numeric-only portion of the remaining null-`gv_id` identity-backed lane.

This phase did **not**:

- collapse duplicates
- rewrite `card_print_identity`
- handle prefixed / symbolic / mixed-format printed identity
- touch deferred complex families

Promotion rule:

- update existing `public.card_prints` parents in place
- preserve `card_prints.id`
- preserve active `card_print_identity`
- assign deterministic `gv_id` only where the full proof held

## Approved Set Allowlist

Frozen approved allowlist after proof:

- `me01`
- `sv02`
- `sv04`
- `sv06`
- `sv06.5`
- `sv07`
- `sv08`
- `sv09`
- `sv10`
- `svp`
- `swsh10.5`

## Removed From Requested Allowlist During Proof

- `A3a` → missing `printed_set_abbrev`
- `P-A` → missing `printed_set_abbrev`
- `sv08.5` → missing `printed_set_abbrev`
- `lc` → live `gv_id` collision with existing public `LC` lane (`base6`)
- `sm7.5` → live `gv_id` collision with existing public `DRM` lane (`sm75`)
- `sm10` → live `gv_id` collision with existing public `UNB` lane
- `sm12` → live `gv_id` collision with existing public `CEC` lane
- `sv04.5` → live `gv_id` collision with existing public `PAF` lane (`sv4pt5`)

## Candidate Counts By Set

- `me01` → `83`
- `sv02` → `99`
- `sv04` → `99`
- `sv06` → `99`
- `sv06.5` → `99`
- `sv07` → `99`
- `sv08` → `99`
- `sv09` → `99`
- `sv10` → `99`
- `svp` → `73`
- `swsh10.5` → `88`

Total Phase 2A candidates: `1,036`

## GV_ID Derivation Rule

Source of truth:

- [buildCardPrintGvIdV1.mjs](/C:/grookai_vault/backend/warehouse/buildCardPrintGvIdV1.mjs)

Phase 2A used the live public convention already present in the catalog:

- prefix: `GV-PK`
- set token: normalized `sets.printed_set_abbrev`
- number token: numeric `printed_number`, preserving the stored numeric string including leading zeros
- base-variant only for this phase

Resulting shape for this phase:

- `GV-PK-{PRINTED_SET_ABBREV}-{PRINTED_NUMBER}`

Proof:

- live approved-family convention check rows: `2,544`
- mismatches between live `gv_id` and `buildCardPrintGvIdV1` on those rows: `0`

## Collision Audit Results

Final approved scope only:

- candidate_count = `1,036`
- distinct_card_print_id_count = `1,036`
- distinct_proposed_gvid_count = `1,036`
- internal_collision_count = `0`
- live_collision_count = `0`
- derivation_error_count = `0`

The removed families above are excluded precisely because they failed a hard gate before apply.

## Apply Strategy

Implementation artifact:

- [phase2a_canonical_promotion_numeric_only_apply_v1.mjs](/C:/grookai_vault/backend/identity/phase2a_canonical_promotion_numeric_only_apply_v1.mjs)

Dry-run artifact:

- [phase2a_canonical_promotion_numeric_only_dry_run_v1.sql](/C:/grookai_vault/docs/sql/phase2a_canonical_promotion_numeric_only_dry_run_v1.sql)

Execution shape:

- batch size `500`
- transaction per batch
- update existing parents only:
  - `update public.card_prints set gv_id = <proposed_gv_id> where id = <card_print_id> and gv_id is null`
- no `card_print_identity` mutation
- no parent inserts
- no deferred-set changes

Pre-apply backups:

- [phase2a_preapply_schema.sql](/C:/grookai_vault/backups/phase2a_preapply_schema.sql)
- [phase2a_preapply_data.sql](/C:/grookai_vault/backups/phase2a_preapply_data.sql)

## Apply Result

Execution completed successfully.

- batches applied: `3`
- batch sizes: `500`, `500`, `36`
- promoted_total = `1,036`
- remaining_null_gvid_in_phase2a_scope = `0`
- live_gvid_collision_count = `0`
- active_identity_total_before = `10,613`
- active_identity_total_after = `10,613`
- active_identity_with_gvid_count_after = `8,167`
- excluded_rows_promoted_count = `0`

Route impact:

- Phase 1 left `7,131` active identity rows on `gv_id` parents
- Phase 2A increased that reachable surface to `8,167`
- newly routable identity-backed rows added in Phase 2A: `1,036`

## Sample Promoted Rows

- `sv06.5` / Joltik / `001` → `GV-PK-SFA-001`
- `sv06.5` / Galvantula / `002` → `GV-PK-SFA-002`
- `sv10` / Ethan's Pinsir / `001` → `GV-PK-DRI-001`
- `sv10` / Yanma / `002` → `GV-PK-DRI-002`
- `svp` / Sprigatito / `001` → `GV-PK-PR-SV-001`
- `svp` / Quaxly / `003` → `GV-PK-PR-SV-003`
- `me01` / Bulbasaur / `001` → `GV-PK-MEG-001`
- `swsh10.5` rows promoted under `GV-PK-PGO-*` with zero collision

## Deferred Surface Stayed Untouched

Confirmed unchanged example rows:

- `sm10` / Pheromosa & Buzzwole GX / `1` / `gv_id = null`
- `sm10` / Greninja & Zoroark GX / `107` / `gv_id = null`
- `sm10` / Honchkrow GX / `109` / `gv_id = null`

## Verification Plan And Outcome

Required verification was executed and passed:

1. promoted row count equals candidate count
2. zero candidate rows remain with `gv_id is null`
3. zero `gv_id` collisions in promoted scope
4. promoted rows are publicly routable because `/card/[gv_id]` resolves from `card_prints.gv_id`
5. active identity remained stable
6. promoted rows preserved the same `card_prints.id`, same active identity row, and same set linkage
7. excluded/deferred sets remained untouched

## Stop Conditions

Phase 2A remained fail-closed on:

- proposed `gv_id` collision
- canonical overlap
- missing / unstable printed set abbreviation
- mixed-format set entry into candidate scope
- batch update count mismatch
- attempted overwrite of existing non-null `gv_id`
- deferred-set drift

## Status

PROMOTION COMPLETED SUCCESSFULLY
