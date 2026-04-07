# SM75_ALIAS_REALIGNMENT_V1

## 1. Context

`sm7.5` was audited as an alias-family realignment case, not a lawful standalone canonical set.

Proven pre-apply truth:

- unresolved `sm7.5` parents = `78`
- canonical `sm75` parents with live `GV-PK-DRM-*` = `78`
- canonical `sm7.5` parents with live `gv_id` = `0`
- every unresolved `sm7.5` row mapped one-to-one to canonical `sm75`

This phase executed the realignment by collapsing the `sm7.5` alias lane into canonical `sm75`.

No new `gv_id` was created.
No namespace was rewritten.
Canonical `sm75` remained the live owner of `GV-PK-DRM-*`.

Artifacts for this phase:

- [backend/identity/sm75_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/sm75_alias_collapse_apply_v1.mjs)
- [docs/sql/sm75_alias_collapse_dry_run_v1.sql](/C:/grookai_vault/docs/sql/sm75_alias_collapse_dry_run_v1.sql)
- [backups/sm75_alias_preapply_schema.sql](/C:/grookai_vault/backups/sm75_alias_preapply_schema.sql)
- [backups/sm75_alias_preapply_data.sql](/C:/grookai_vault/backups/sm75_alias_preapply_data.sql)

## 2. Alias vs Canonical Explanation

The apply preserved this identity truth:

- `sm7.5` = alias lane for Dragon Majesty
- `sm75` = canonical lane that already owns `GV-PK-DRM-*`

Why apply was lawful:

- promotion would have collided with the live `GV-PK-DRM-*` namespace
- canonical `sm7.5` did not exist
- canonical `sm75` already covered the full `1` through `78` surface

## 3. Audit Proof Frozen At Apply

The upstream audit established the namespace conflict:

- `same_name_same_number_overlap_count = 61`
- `same_number_different_name_count = 17`
- `same_name_different_number_count = 14`
- `multiple_canonical_match_count = 0`
- `zero_canonical_match_count = 0`

The apply runner then enforced the canon-aware proof gates:

- `total_unresolved = 78`
- `canonical_sm75_count = 78`
- `canonical_match_count = 78`
- `map_count = 78`
- `distinct_old_count = 78`
- `distinct_new_count = 78`
- `unmatched_count = 0`
- `multiple_match_old_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`
- `out_of_scope_new_target_count = 0`

Canon-aware repair count:

- `canon_aware_name_repair_count = 17`

Representative repair rows:

| old parent | canonical parent |
| --- | --- |
| `Reshiram GX / 11` | `Reshiram-GX / 11 / GV-PK-DRM-11` |
| `Kingdra GX / 18` | `Kingdra-GX / 18 / GV-PK-DRM-18` |
| `Blaine’s Last Stand / 58` | `Blaine's Last Stand / 58 / GV-PK-DRM-58` |

## 4. Collapse Map Proof

Collapse rule:

- same printed number
- same canon-aware normalized name via `normalizeCardNameV1(rawName, { canonName })`
- target set code must be `sm75`

Representative normal sample:

- old parent `031eed6f-007d-49a4-bbc9-5cb93d43c189`
- `Charmander / 1`
- canonical target `a592c487-4e07-4d38-963b-768dba841fee`
- canonical `GV-PK-DRM-1`

Representative repair sample:

- old parent `1c13d0b8-d7ba-421f-b0b9-de99d1b74571`
- `Reshiram GX / 11`
- canonical target `906ae840-2dc7-47e5-93e8-1bb972ae82c3`
- canonical `GV-PK-DRM-11`

## 5. FK Movement Summary

Old-reference inventory before apply:

- `card_print_identity = 78`
- `card_print_traits = 78`
- `card_printings = 234`
- `external_mappings = 78`
- `vault_items = 0`

Collision audit passed:

- trait conflicting non-identical rows = `0`
- printing conflicting non-identical rows = `0`
- external mapping conflict rows = `0`
- target identity rows before apply = `0`

Executed in `1` batch:

- batch `1`: `78` parents

Net FK movement:

- `updated_identity_rows = 78`
- `inserted_traits = 78`
- `deleted_old_traits = 78`
- `merged_printing_metadata_rows = 234`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 234`
- `updated_external_mappings = 78`
- `updated_vault_items = 0`

## 6. Risks And Controls

Primary risks were:

- accidentally treating `sm7.5` as a promotable standalone set
- mutating canonical `sm75` `gv_id` values
- collapsing the `17` formatting-variant rows incorrectly
- leaving old parent references behind in child tables

Controls used:

- pre-apply schema and data backups written before any row moves
- hard stop on unmatched rows, multiple matches, target identity occupancy, or out-of-scope targets
- canon-aware mapping proof frozen before apply
- batch-level zero-reference checks after every repoint batch
- post-apply `gv_id` drift check on canonical targets

## 7. Execution Steps

1. Build unresolved `sm7.5` source surface and canonical `sm75` target surface.
2. Freeze canon-aware `sm7.5.old_id -> sm75.new_id` map.
3. Write pre-apply schema and data backups.
4. Repoint `card_print_identity`.
5. Merge / move `card_print_traits`.
6. Merge redundant `card_printings` onto canonical finish keys.
7. Repoint `external_mappings`.
8. Repoint `vault_items` if any.
9. Verify zero old references remain.
10. Delete old null-`gv_id` parent rows from `card_prints`.

## 8. Verification Results

Post-apply truth:

- `deleted_old_parent_rows = 78`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_sm75_count = 78`
- `target_gv_id_drift_count = 0`
- `target_any_identity_rows = 78`
- `target_active_identity_rows = 78`

Zero remaining FK references were confirmed on all supported touched tables.

Sample after apply:

- `Charmander / 1`: old parent removed, canonical `GV-PK-DRM-1` preserved, active identity rows on target = `1`
- `Reshiram GX / 11`: old parent removed, canonical `GV-PK-DRM-11` preserved, active identity rows on target = `1`

## 9. Final Post-Apply Truth

The `sm7.5` alias lane no longer exists as unresolved null-`gv_id` parents.

Dragon Majesty now resolves entirely through canonical `sm75`, with:

- public namespace unchanged
- canonical parent count unchanged
- no new `gv_id` minted
- no remaining alias parents

## Status

APPLY COMPLETE
