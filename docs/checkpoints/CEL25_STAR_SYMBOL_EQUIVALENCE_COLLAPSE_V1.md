# CEL25_STAR_SYMBOL_EQUIVALENCE_COLLAPSE_V1

## Context

`cel25` had two blocked rows after closing duplicate and base-variant execution:

- `Umbreon Star / 17A`
- `Gardevoir ex / 93A`

The symbol-semantics contract audit approved one bounded rule:

- `STAR_WORD_TAIL_TO_STAR_SYMBOL_EQUIVALENCE_V1`

This checkpoint covers only the single lawful `Umbreon Star -> Umbreon ★` collapse.

## Rule Definition

Allowed contract:

- same set only
- same normalized token only
- terminal-word `Star` only
- target must be a canonical `★` identity
- unique target required

Forbidden expansion:

- no generic `Star` replacement
- no mid-string `star` replacement
- no cross-set routing
- no `δ` semantics

## Proof

- `total_unresolved_count = 2`
- `source_count = 1`
- `out_of_scope_unresolved_count = 1`
- `canonical_target_count = 47`
- `unmatched_count = 0`
- `ambiguous_target_count = 0`
- `reused_target_count = 0`
- `non_tail_word_scope_count = 0`
- `non_star_symbol_candidate_count = 0`

Frozen map:

- `c2bdbb6f-10de-4a93-abcf-ed3b8837908b / Umbreon Star / 17A`
  -> `c9c1a789-a686-4541-99b7-ac7d4de7be30 / Umbreon ★ / GV-PK-CEL-17CC`

## FK Readiness

- `card_print_identity = 1`
- `card_print_traits = 1`
- `card_printings = 1`
- `external_mappings = 1`
- `vault_items = 0`

Collision audit:

- `trait_target_key_conflict_count = 0`
- `printing_finish_conflict_count = 0`
- `external_mapping_conflict_count = 0`

## Apply Outcome

- `collapse_count = 1`
- `updated_identity_rows = 1`
- `inserted_traits = 1`
- `deleted_old_traits = 1`
- `merged_printing_metadata_rows = 0`
- `moved_unique_printings = 1`
- `deleted_redundant_printings = 0`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 1`

## Scope Limits

- no `BASE_VARIANT` rows entered scope
- no `DUPLICATE` rows entered scope
- `Gardevoir ex / 93A` remained untouched
- no other sets entered scope

## Post-Apply Truth

- `remaining_unresolved_total_rows = 1`
- `remaining_star_symbol_rows = 0`
- `remaining_identity_model_gap_rows = 1`
- remaining unresolved row is exactly:
  - `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`
- canonical `cel25` row count unchanged: `47`
- target identity rows after apply: `1`
- target active identity rows after apply: `1`
- target inactive identity rows after apply: `0`
- zero old-parent FK references remain
- zero target `gv_id` drift

## Invariants

- bounded symbol equivalence applied only once
- canonical namespace unchanged
- no unintended rows affected
- final `cel25` residue is now one identity-model gap row
