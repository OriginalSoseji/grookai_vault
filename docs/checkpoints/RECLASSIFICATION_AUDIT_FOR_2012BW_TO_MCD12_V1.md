# RECLASSIFICATION_AUDIT_FOR_2012BW_TO_MCD12_V1

## 1. Context

`2012bw` was previously treated as a numeric-promotion surface before the MCD namespace contract was corrected.

That classification became stale once the builder started enforcing year-qualified McDonald's IDs:

- old assumption: `GV-PK-MCD-1`
- corrected namespace: `GV-PK-MCD-2012-1`

After the contract change, the live audit needed to verify whether `2012bw` behaved like the already-resolved `2011bw` alias lane or remained a lawful standalone promotion surface.

## 2. Why The Old NUMERIC_PROMOTION Classification Became Stale

`2012bw` is not missing a lawful public namespace. The lawful namespace already exists on canonical `mcd12`.

The corrected builder now derives:

- `2012bw / 1 -> GV-PK-MCD-2012-1`
- `2012bw / 12 -> GV-PK-MCD-2012-12`

Those IDs are already owned by canonical `mcd12`, which means `2012bw` is an alias/source lane rather than a promotable standalone canonical lane.

## 3. Unresolved Counts

Live unresolved `2012bw` surface:

- `total_unresolved = 12`
- `numeric_unresolved = 12`
- `non_numeric_unresolved = 0`

All unresolved rows remain numeric-only and matched the expected live surface exactly.

## 4. Canonical MCD12 Target Summary

Canonical target lane:

- `card_prints.set_code = 'mcd12'`
- `canonical_mcd12_total_rows = 12`
- `canonical_mcd12_non_null_gvid_count = 12`

Representative canonical rows:

| id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `dfdb5d89-696c-4982-a392-ad082b20b3be` | `GV-PK-MCD-2012-1` | Servine | `1` | `mcd12` |
| `d9eb1596-2c15-4109-8b0d-d965b49144b7` | `GV-PK-MCD-2012-7` | Woobat | `7` | `mcd12` |
| `ba12910d-12b8-48ea-9623-d717bfb211d1` | `GV-PK-MCD-2012-12` | Axew | `12` | `mcd12` |

The canonical lane already owns the correct year-qualified namespace:

- `GV-PK-MCD-2012-*`

## 5. Strict Mapping Results

Mapping rule used:

- normalized digits (`001` vs `1`)
- normalized name

Strict mapping results:

- `mapping_candidate_count = 12`
- `distinct_old_count = 12`
- `distinct_new_count = 12`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `same_number_same_name_count = 12`
- `same_number_different_name_count = 0`

This proves the full unresolved surface maps one-to-one onto canonical `mcd12` with zero ambiguity.

Representative mappings:

| old_id | old_name | printed_number | new_id | new_name | number | gv_id | set_code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `701dfb15-46fb-4f58-9680-e1cb2ef9f646` | Servine | `1` | `dfdb5d89-696c-4982-a392-ad082b20b3be` | Servine | `1` | `GV-PK-MCD-2012-1` | `mcd12` |
| `8702d170-65f2-4098-98d2-57cbfeb492b7` | Woobat | `7` | `d9eb1596-2c15-4109-8b0d-d965b49144b7` | Woobat | `7` | `GV-PK-MCD-2012-7` | `mcd12` |
| `4950f92f-952d-4141-a527-b993d16e3d1b` | Axew | `12` | `ba12910d-12b8-48ea-9623-d717bfb211d1` | Axew | `12` | `GV-PK-MCD-2012-12` | `mcd12` |

## 6. Namespace Audit Results

The namespace audit checked two things:

1. canonical `mcd12` rows already follow the corrected year-qualified MCD namespace
2. unresolved `2012bw` rows would derive the same namespace under the live builder

Results:

- `canonical_namespace_match_count = 12`
- `namespace_conflict_count = 0`

Interpretation:

- all canonical `mcd12` rows already use the correct `GV-PK-MCD-2012-*` namespace
- unresolved `2012bw` rows would derive the exact same IDs
- no alternate namespace should be minted

## 7. Readiness Snapshot

Read-only FK inventory on unresolved `2012bw` old parents:

- `card_print_identity.card_print_id = 12`
- `card_print_traits.card_print_id = 12`
- `card_printings.card_print_id = 7`
- `external_mappings.card_print_id = 12`
- `vault_items.card_id = 0`

This is apply-readiness evidence only. No writes were performed in this phase.

## 8. Final Classification

`OUTCOME A — DUPLICATE_COLLAPSE_TO_MCD12`

Reason:

- all `12` unresolved `2012bw` rows map one-to-one onto canonical `mcd12`
- no multiple matches
- no unmatched rows
- no same-number different-name conflicts
- canonical `mcd12` already owns the correct year-qualified namespace

## 9. Exact Recommended Next Phase

`2012BW_ALIAS_COLLAPSE_TO_MCD12`

Exact action:

- treat `2012bw` as an alias/source lane for `mcd12`
- collapse the `12` null-`gv_id` `2012bw` parents into the existing canonical `mcd12` parents
- preserve canonical `GV-PK-MCD-2012-*`
- do not promote `2012bw`
- do not mint new `gv_id`

## Status

AUDIT COMPLETE
