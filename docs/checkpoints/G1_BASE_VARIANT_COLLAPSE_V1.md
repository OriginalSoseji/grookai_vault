# G1_BASE_VARIANT_COLLAPSE_V1

## Context

- `g1` was decomposed into two lawful lanes:
  - `BASE_VARIANT_COLLAPSE = 13`
  - `PROMOTION_REQUIRED = 16`
- This artifact executes only the 13 collapse rows.
- All RC-prefix promotion rows remain excluded and untouched.

## Proof

- `total_unresolved_count = 29`
- `apply_scope_count = 13`
- `excluded_promotion_scope_count = 16`
- `normalized_map_count = 13`
- `same_token_name_normalize_count = 12`
- `suffix_to_base_single_target_count = 1`
- `fan_in_group_count = 0`
- `unmatched_apply_count = 0`
- `ambiguous_apply_count = 0`
- `reused_targets_in_apply_scope = 0`
- `overlap_with_promotion_rows = 0`

## Scope Handling

- APPLY rows are resolved only against same-set canonical targets with non-null `gv_id`.
- EXCLUDED rows are the RC-prefix promotion surface and are not eligible for collapse in this unit.
- The frozen map is deterministic and bounded to the 13 audited rows.

## Identity Handling

- `12` rows resolve by same-token NAME_NORMALIZE_V3 punctuation collapse.
- `1` row resolves by suffix-to-base single-target collapse:
  - `Team Flare Grunt / 73a -> GV-PK-GEN-73`
- Exactly one target-side active identity conflict exists before apply.
- The runner archives only the conflicting old active identity row before repointing.

## Invariants Preserved

- RC-prefix promotion rows untouched
- canonical namespace unchanged
- no `gv_id` mutation on existing canonical rows
- no cross-set mutation
- fail closed on unsupported FK references

## Post-Verify

- `collapse_count = 13`
- `remaining_unresolved_rows = 16`
- `remaining_promotion_required_rows = 16`
- canonical `g1` count unchanged at `100`
- supported FK refs on old parents reduced to `0`
- target active identity conflicts after apply reduced to `0`

## Risks

- accidental inclusion of RC-prefix rows
- suffix-to-base misrouting on `73a -> 73`
- FK merge drift in `card_print_traits` or `card_printings`
- untracked references outside the supported FK inventory
