# XY10_BASE_VARIANT_FANIN_COLLAPSE_V1

Status: COMPLETE
Type: Same-Set Normalization + Fan-In Collapse
Scope: `xy10`

## Context

`xy10` was decomposed successfully before apply:

- `BASE_VARIANT_COLLAPSE = 21`
- `ACTIVE_IDENTITY_FANIN = 4`
- `BLOCKED_CONFLICT = 0`
- `UNCLASSIFIED = 0`

That left one bounded apply surface:

1. normalize all unresolved rows under `NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1`
2. resolve the two audited reused-target fan-in groups
3. preserve active-identity uniqueness on the one non-reused suffix target that already carried an active identity
4. repoint dependent rows
5. delete old parents

## Proof

- `source_count = 25`
- `base_variant_count = 21`
- `active_identity_fanin_count = 4`
- `fan_in_group_count = 2`
- `target_active_identity_conflict_count_before = 1`
- `blocked_conflict_count = 0`
- `unclassified_count = 0`

Normalization summary:

- `exact_match_count = 0`
- `same_token_different_name_count = 22`
- `exact_unmatched_count = 25`
- `normalized_map_count = 25`
- `normalized_name_count = 22`
- `suffix_variant_count = 3`
- `base_reused_target_count = 2`
- `distinct_new_target_count = 23`

The two audited fan-in groups were:

- `Regirock EX / 43` and `Regirock EX / 43a` converging lawfully on `GV-PK-FCO-43A`
- `Zygarde EX / 54` and `Zygarde EX / 54a` converging lawfully on `GV-PK-FCO-54A`

Both groups were normalization-only and semantically clean.

There was one separate target-side active-identity uniqueness wrinkle:

- `Shauna / 111 -> GV-PK-FCO-111A`

This was not a reused-target fan-in group in the audited source split, but the target already carried one active identity. The incoming `111` identity was therefore archived before repoint so the target kept exactly one active identity row after collapse.

## Apply Outcome

- `collapse_count = 25`
- `remaining_unresolved_rows = 0`
- canonical `xy10` row count unchanged at `126`
- exactly one active identity per touched canonical target after apply
- no FK orphans introduced
- no cross-set mutation
- no `gv_id` mutation

## FK Movement Summary

Live apply results:

- `archived_identity_rows = 3`
- `archived_from_fanin_rows = 2`
- `archived_from_target_conflict_rows = 1`
- `updated_identity_rows = 25`
- `inserted_traits = 22`
- `deleted_old_traits = 25`
- `merged_trait_metadata_rows = 0`
- `merged_printing_metadata_rows = 69`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 75`
- `updated_external_mappings = 25`
- `updated_vault_items = 0`

## Sample Before / After Rows

- `877090df-ae61-43d6-823e-23587760efee / Shauna / 111 -> 09cec9bf-60a8-4e4d-a239-3e65a37a451a / Shauna / GV-PK-FCO-111A`
- `0eb4f292-c2d9-4a93-af1c-085a738216cd / Regirock EX / 43a -> b5b9f054-0c84-4e36-9c71-8427aed4e76f / Regirock-EX / GV-PK-FCO-43A`
- `5bf445a3-d099-49fa-86ec-90a2281cac35 / Alakazam EX / 125 -> 4d5ab28a-02b7-42c9-b7fc-e3909261f9cd / Alakazam-EX / GV-PK-FCO-125`

## Invariants Preserved

- canonical namespace unchanged
- no `gv_id` mutation
- exactly one active identity per canonical target
- no cross-set mapping
- no blocked residue

## Risks Checked

- incorrect fan-in active selection
- accidental archival outside the audited lanes
- FK collision during repoint or duplicate-printing merge
- unintended target reuse outside the two audited reused-target groups

## Result

`xy10` is fully canonical and closed under the existing identity model.
