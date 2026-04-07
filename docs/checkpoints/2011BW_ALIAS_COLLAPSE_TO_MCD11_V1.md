# 2011BW_ALIAS_COLLAPSE_TO_MCD11_V1

## 1. Context

`2011bw` was previously misclassified as numeric promotion before the MCD year namespace contract was corrected.

Once the builder started deriving `GV-PK-MCD-2011-*`, the live truth became clear:

- unresolved `2011bw` parents = `12`
- canonical `mcd11` parents with live `GV-PK-MCD-2011-*` = `12`
- the unresolved `2011bw` surface maps `1:1` onto canonical `mcd11`
- no lawful standalone promotion remains

This phase executed the alias collapse from `2011bw` into canonical `mcd11`.

No new `gv_id` was created.
No builder behavior was changed.
No unrelated set entered scope.

Artifacts for this phase:

- [backend/identity/2011bw_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/2011bw_alias_collapse_apply_v1.mjs)
- [docs/sql/2011bw_alias_collapse_dry_run_v1.sql](/C:/grookai_vault/docs/sql/2011bw_alias_collapse_dry_run_v1.sql)

## 2. Alias vs Canonical Truth

The apply preserved this identity truth:

- `2011bw` = alias/source lane
- `mcd11` = canonical 2011 McDonald's promo lane
- canonical `mcd11` already owned the correct public namespace: `GV-PK-MCD-2011-*`

Why collapse was lawful:

- promotion would have attempted to recreate the exact same year-qualified namespace already owned by `mcd11`
- every unresolved `2011bw` row matched one and only one canonical `mcd11` row
- there were no unmatched rows and no same-number different-name conflicts

## 3. Frozen Mapping Proof

Hard gates all passed:

- `unresolved_count = 12`
- `numeric_unresolved = 12`
- `non_numeric_unresolved = 0`
- `canonical_target_count = 12`
- `map_count = 12`
- `distinct_old_count = 12`
- `distinct_new_count = 12`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `same_number_same_name_count = 12`
- `same_number_different_name_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`

Mapping rule:

- same normalized digits
- same normalized name
- target set code must be `mcd11`

Representative samples before apply:

- first: `Snivy / 1` old `99555f58-22ae-44ce-a4b3-57a2e41635ac` -> canonical `e0fd3359-fbc5-47c3-9cba-a184f3d88bac` / `GV-PK-MCD-2011-1`
- middle: `Munna / 7` old `a357528d-c789-416d-8b65-84edf7cacb9d` -> canonical `5e9fef92-65af-41f8-a2cd-fc3f6342fc8c` / `GV-PK-MCD-2011-7`
- last: `Audino / 12` old `9f3878be-5c08-47ed-bf7c-101c052c9eca` -> canonical `fe281cd0-3005-4c95-b7e7-555aa783a7ba` / `GV-PK-MCD-2011-12`

## 4. FK Movement Summary

Old-reference inventory before apply:

- `card_print_identity = 12`
- `card_print_traits = 12`
- `card_printings = 11`
- `external_mappings = 12`
- `vault_items = 0`

Collision audit passed:

- trait conflicting non-identical rows = `0`
- external mapping conflicts = `0`
- target identity occupancy before apply = `0`
- printing finish conflicts = `1`
- printing mergeable metadata-only conflicts = `1`
- printing conflicting non-identical rows = `0`

Net movement in the single apply batch:

- `updated_identity_rows = 12`
- `inserted_traits = 12`
- `deleted_old_traits = 12`
- `merged_printing_metadata_rows = 1`
- `moved_unique_printings = 10`
- `deleted_redundant_printings = 1`
- `updated_external_mappings = 12`
- `updated_vault_items = 0`

## 5. Risks And Controls

Primary risks were:

- accidentally treating `2011bw` as promotion after namespace correction
- reusing a canonical target more than once
- leaving old parent references behind after repoint
- mutating canonical `mcd11` `gv_id` values

Controls used:

- hard stop on any count drift, multiple matches, reused canonical targets, unmatched rows, or same-number different-name overlaps
- hard stop on any occupied target identity rows
- hard stop on any unsupported referencing table with live rows
- hard stop on any non-identical trait or printing conflict
- post-apply `gv_id` drift check on canonical targets

## 6. Verification Results

Post-apply truth:

- `deleted_old_parent_rows = 12`
- `remaining_unresolved_null_gvid_rows_for_2011bw = 0`
- `canonical_target_count = 12`
- `target_gv_id_drift_count = 0`
- `target_any_identity_rows = 12`
- `target_active_identity_rows = 12`
- `route_resolvable_target_rows = 12`
- `active_identity_total_before = 10613`
- `active_identity_total_after = 10613`

Sample after apply:

- `Snivy / 1`: old parent removed, canonical `GV-PK-MCD-2011-1` preserved, active identity rows on target = `1`
- `Munna / 7`: old parent removed, canonical `GV-PK-MCD-2011-7` preserved, active identity rows on target = `1`
- `Audino / 12`: old parent removed, canonical `GV-PK-MCD-2011-12` preserved, active identity rows on target = `1`

## 7. Final Post-Apply Truth

The unresolved `2011bw` alias lane no longer exists.

McDonald's 2011 now resolves entirely through canonical `mcd11`, with:

- canonical year-qualified namespace unchanged
- canonical parent count unchanged
- no new `gv_id` minted
- no remaining unresolved `2011bw` null-`gv_id` parents

## Status

APPLY COMPLETE
