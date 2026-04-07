# LC_ALIAS_REALIGNMENT_V1

## 1. Context

`lc` was audited as an alias-family realignment case, not a lawful standalone canonical set.

Proven pre-apply truth:

- unresolved `lc` parents = `110`
- canonical `base6` parents with live `GV-PK-LC-*` = `110`
- canonical `lc` parents with live `gv_id` = `0`
- every unresolved `lc` row mapped one-to-one to canonical `base6`

This phase executed the realignment by collapsing the `lc` alias lane into canonical `base6`.

No new `gv_id` was created.
No namespace was rewritten.
Canonical `base6` remained the live owner of `GV-PK-LC-*`.

Artifacts for this phase:

- [backend/identity/lc_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/lc_alias_collapse_apply_v1.mjs)
- [docs/sql/lc_alias_collapse_dry_run_v1.sql](/C:/grookai_vault/docs/sql/lc_alias_collapse_dry_run_v1.sql)
- [backups/lc_alias_preapply_schema.sql](/C:/grookai_vault/backups/lc_alias_preapply_schema.sql)
- [backups/lc_alias_preapply_data.sql](/C:/grookai_vault/backups/lc_alias_preapply_data.sql)

## 2. Alias vs Canonical Explanation

The apply preserved this identity truth:

- `lc` = alias lane for Legendary Collection
- `base6` = canonical lane that already owns `GV-PK-LC-*`

Why apply was lawful:

- promotion would have collided with the live `GV-PK-LC-*` namespace
- canonical `lc` did not exist
- canonical `base6` already covered the full `1` through `110` card surface

## 3. Audit Proof Frozen At Apply

Hard gates all passed:

- `total_unresolved = 110`
- `canonical_base6_count = 110`
- `canonical_match_count = 110`
- `map_count = 110`
- `distinct_old_count = 110`
- `distinct_new_count = 110`
- `unmatched_count = 0`
- `multiple_match_old_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`
- `out_of_scope_new_target_count = 0`

Repo-normalized repair count:

- `repo_name_repair_count = 2`

Those two repairs were formatting-only:

| old parent | canonical parent |
| --- | --- |
| `Nidoran♀ / 82` | `Nidoran ♀ / 82 / GV-PK-LC-82` |
| `Nidoran♂ / 83` | `Nidoran ♂ / 83 / GV-PK-LC-83` |

## 4. Collapse Map Proof

Collapse rule:

- same printed number
- same repo-normalized name via `normalizeCardNameV1()`
- target set code must be `base6`

Representative normal sample:

- old parent `b7eb52a7-9218-40de-a8af-252ac11d2798`
- `Alakazam / 1`
- canonical target `fd852708-bb5d-4a35-8c1a-10756ed4747d`
- canonical `GV-PK-LC-1`

Representative repair sample:

- old parent `2862cf56-403e-4660-aae9-ced8dc3fe457`
- `Nidoran♀ / 82`
- canonical target `ced4a7c4-34a4-4665-ad22-24d6db57eae2`
- canonical `GV-PK-LC-82`

## 5. FK Movement Summary

Old-reference inventory before apply:

- `card_print_identity = 110`
- `card_print_traits = 110`
- `card_printings = 223`
- `external_mappings = 110`
- `vault_items = 0`

Collision audit passed:

- trait conflicting non-identical rows = `0`
- printing conflicting non-identical rows = `0`
- external mapping conflict rows = `0`
- target identity rows before apply = `0`

Executed in `2` batches:

- batch `1`: `100` parents
- batch `2`: `10` parents

Net FK movement:

- `updated_identity_rows = 110`
- `inserted_traits = 110`
- `deleted_old_traits = 110`
- `merged_printing_metadata_rows = 223`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 223`
- `updated_external_mappings = 110`
- `updated_vault_items = 0`

## 6. Risks And Controls

Primary risks were:

- accidentally treating `lc` as a promotable standalone set
- mutating canonical `base6` `gv_id` values
- collapsing the two `Nidoran` symbol variants incorrectly
- leaving old parent references behind in child tables

Controls used:

- pre-apply schema and data backups written before any row moves
- hard stop on unmatched rows, multiple matches, target identity occupancy, or out-of-scope targets
- repo-normalized mapping proof frozen before apply
- batch-level zero-reference checks after every repoint batch
- post-apply `gv_id` drift check on canonical targets

## 7. Execution Steps

1. Build unresolved `lc` source surface and canonical `base6` target surface.
2. Freeze repo-normalized `lc.old_id -> base6.new_id` map.
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

- `deleted_old_parent_rows = 110`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_base6_count = 110`
- `target_gv_id_drift_count = 0`
- `target_any_identity_rows = 110`
- `target_active_identity_rows = 110`

Zero remaining FK references were confirmed on all supported touched tables.

Sample after apply:

- `Alakazam / 1`: old parent removed, canonical `GV-PK-LC-1` preserved, active identity rows on target = `1`
- `Nidoran♀ / 82`: old parent removed, canonical `GV-PK-LC-82` preserved, active identity rows on target = `1`

## 9. Final Post-Apply Truth

The `lc` alias lane no longer exists as unresolved null-`gv_id` parents.

Legendary Collection now resolves entirely through canonical `base6`, with:

- public namespace unchanged
- canonical parent count unchanged
- no new `gv_id` minted
- no remaining alias parents

## Status

APPLY COMPLETE
