# 2012BW_ALIAS_COLLAPSE_TO_MCD12_V1

## 1. Context

`2012bw` was initially treated as a numeric-promotion surface before the MCD year namespace contract was corrected.

Once the live builder started deriving `GV-PK-MCD-2012-*`, the correct identity truth became explicit:

- unresolved `2012bw` parents = `12`
- canonical `mcd12` parents with live `GV-PK-MCD-2012-*` = `12`
- the unresolved `2012bw` surface mapped `1:1` onto canonical `mcd12`
- promotion was no longer lawful because the canonical 2012 namespace already existed

This phase executed the alias collapse from `2012bw` into canonical `mcd12`.

No new `gv_id` was created.
No canonical `gv_id` changed.
No unrelated set entered scope.

Artifacts for this phase:

- [backend/identity/2012bw_alias_collapse_apply_v1.mjs](/C:/grookai_vault/backend/identity/2012bw_alias_collapse_apply_v1.mjs)
- [docs/sql/2012bw_alias_collapse_dry_run_v1.sql](/C:/grookai_vault/docs/sql/2012bw_alias_collapse_dry_run_v1.sql)
- [backups/2012bw_alias_collapse_preapply_schema.sql](/C:/grookai_vault/backups/2012bw_alias_collapse_preapply_schema.sql)
- [backups/2012bw_alias_collapse_preapply_data.sql](/C:/grookai_vault/backups/2012bw_alias_collapse_preapply_data.sql)

## 2. Alias vs Canonical Truth

The apply preserved this identity truth:

- `2012bw` = alias/source lane
- `mcd12` = canonical 2012 McDonald's promo lane
- canonical `mcd12` already owned the correct public namespace: `GV-PK-MCD-2012-*`

Why collapse was lawful:

- promotion would have attempted to recreate the exact same year-qualified namespace already owned by `mcd12`
- every unresolved `2012bw` row matched one and only one canonical `mcd12` row
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
- target set code must be `mcd12`

Representative samples before apply:

- first: `Servine / 1` old `701dfb15-46fb-4f58-9680-e1cb2ef9f646` -> canonical `dfdb5d89-696c-4982-a392-ad082b20b3be` / `GV-PK-MCD-2012-1`
- middle: `Woobat / 7` old `8702d170-65f2-4098-98d2-57cbfeb492b7` -> canonical `d9eb1596-2c15-4109-8b0d-d965b49144b7` / `GV-PK-MCD-2012-7`
- last: `Axew / 12` old `4950f92f-952d-4141-a527-b993d16e3d1b` -> canonical `ba12910d-12b8-48ea-9623-d717bfb211d1` / `GV-PK-MCD-2012-12`

## 4. FK Movement Summary

Old-reference inventory before apply:

- `card_print_identity = 12`
- `card_print_traits = 12`
- `card_printings = 7`
- `external_mappings = 12`
- `vault_items = 0`

Collision audit passed:

- trait conflicting non-identical rows = `0`
- external mapping conflicts = `0`
- target identity occupancy before apply = `0`
- printing finish conflicts = `0`
- printing mergeable metadata-only conflicts = `0`
- printing conflicting non-identical rows = `0`

Net movement in the single apply batch:

- `updated_identity_rows = 12`
- `inserted_traits = 12`
- `deleted_old_traits = 12`
- `merged_printing_metadata_rows = 0`
- `moved_unique_printings = 7`
- `deleted_redundant_printings = 0`
- `updated_external_mappings = 12`
- `updated_vault_items = 0`

## 5. Risks And Controls

Primary risks were:

- accidentally treating `2012bw` as promotion after namespace correction
- reusing a canonical target more than once
- leaving old parent references behind after repoint
- mutating canonical `mcd12` `gv_id` values

Controls used:

- hard stop on any count drift, multiple matches, reused canonical targets, unmatched rows, or same-number different-name overlaps
- hard stop on any occupied target identity rows
- hard stop on any unsupported referencing table with live rows
- hard stop on any non-identical trait, printing, or mapping conflict
- post-apply `gv_id` drift check on canonical targets
- pre-apply schema and data backups written before the live apply

## 6. Verification Results

Post-apply truth:

- `deleted_old_parent_rows = 12`
- `remaining_unresolved_null_gvid_rows_for_2012bw = 0`
- `canonical_target_count = 12`
- `target_gv_id_drift_count = 0`
- `target_any_identity_rows = 12`
- `target_active_identity_rows = 12`
- `route_resolvable_target_rows = 12`
- `active_identity_total_before = 10613`
- `active_identity_total_after = 10613`

Sample after apply:

- `Servine / 1`: old parent removed, canonical `GV-PK-MCD-2012-1` preserved, active identity rows on target = `1`
- `Woobat / 7`: old parent removed, canonical `GV-PK-MCD-2012-7` preserved, active identity rows on target = `1`
- `Axew / 12`: old parent removed, canonical `GV-PK-MCD-2012-12` preserved, active identity rows on target = `1`

## 7. Final Post-Apply Truth

The unresolved `2012bw` alias lane no longer exists.

McDonald's 2012 now resolves entirely through canonical `mcd12`, with:

- canonical year-qualified namespace unchanged
- canonical parent count unchanged
- no new `gv_id` minted
- no remaining unresolved `2012bw` null-`gv_id` parents

## Status

APPLY COMPLETE
