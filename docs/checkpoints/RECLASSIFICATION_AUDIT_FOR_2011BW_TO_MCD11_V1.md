# RECLASSIFICATION_AUDIT_FOR_2011BW_TO_MCD11_V1

## 1. Context

`2011bw` was previously treated as a numeric-promotion surface before the MCD namespace contract was corrected.

That classification became stale once the builder started enforcing year-qualified McDonald's IDs:

- old assumption: `GV-PK-MCD-1`
- corrected namespace: `GV-PK-MCD-2011-1`

After the contract change, the dry-run no longer collided with legacy unsuffixed `GV-PK-MCD-*` rows. It collided with canonical `mcd11` rows using the exact same year-qualified namespace, which required a direct reclassification audit.

## 2. Why The Old NUMERIC_PROMOTION Classification Became Stale

`2011bw` is not missing a lawful public namespace. The lawful namespace already exists on canonical `mcd11`.

The corrected builder now derives:

- `2011bw / 1 -> GV-PK-MCD-2011-1`
- `2011bw / 12 -> GV-PK-MCD-2011-12`

Those IDs are already owned by canonical `mcd11`, which means `2011bw` is an alias/source lane rather than a promotable standalone canonical lane.

## 3. Unresolved Counts

Live unresolved `2011bw` surface:

- `total_unresolved = 12`
- `numeric_unresolved = 12`
- `non_numeric_unresolved = 0`

All unresolved rows remain numeric-only and matched the expected live surface exactly.

## 4. Canonical MCD11 Target Summary

Canonical target lane:

- `card_prints.set_code = 'mcd11'`
- `canonical_mcd11_total_rows = 12`
- `canonical_mcd11_non_null_gvid_count = 12`

Representative canonical rows:

| id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `e0fd3359-fbc5-47c3-9cba-a184f3d88bac` | `GV-PK-MCD-2011-1` | Snivy | `1` | `mcd11` |
| `5e9fef92-65af-41f8-a2cd-fc3f6342fc8c` | `GV-PK-MCD-2011-7` | Munna | `7` | `mcd11` |
| `fe281cd0-3005-4c95-b7e7-555aa783a7ba` | `GV-PK-MCD-2011-12` | Audino | `12` | `mcd11` |

The canonical lane already owns the correct year-qualified namespace:

- `GV-PK-MCD-2011-*`

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

This proves the full unresolved surface maps one-to-one onto canonical `mcd11` with zero ambiguity.

Representative mappings:

| old_id | old_name | printed_number | new_id | new_name | number | gv_id | set_code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `99555f58-22ae-44ce-a4b3-57a2e41635ac` | Snivy | `1` | `e0fd3359-fbc5-47c3-9cba-a184f3d88bac` | Snivy | `1` | `GV-PK-MCD-2011-1` | `mcd11` |
| `a357528d-c789-416d-8b65-84edf7cacb9d` | Munna | `7` | `5e9fef92-65af-41f8-a2cd-fc3f6342fc8c` | Munna | `7` | `GV-PK-MCD-2011-7` | `mcd11` |
| `9f3878be-5c08-47ed-bf7c-101c052c9eca` | Audino | `12` | `fe281cd0-3005-4c95-b7e7-555aa783a7ba` | Audino | `12` | `GV-PK-MCD-2011-12` | `mcd11` |

## 6. Namespace Audit Results

The namespace audit checked two things:

1. canonical `mcd11` rows already follow the corrected year-qualified MCD namespace
2. unresolved `2011bw` rows would derive the same namespace under the live builder

Results:

- `canonical_namespace_match_count = 12`
- `namespace_conflict_count = 0`

Interpretation:

- all canonical `mcd11` rows already use the correct `GV-PK-MCD-2011-*` namespace
- unresolved `2011bw` rows would derive the exact same IDs
- no alternate namespace should be minted

## 7. Readiness Snapshot

Read-only FK inventory on unresolved `2011bw` old parents:

- `card_print_identity.card_print_id = 12`
- `card_print_traits.card_print_id = 12`
- `card_printings.card_print_id = 11`
- `external_mappings.card_print_id = 12`
- `vault_items.card_id = 0`

This is apply-readiness evidence only. No writes were performed in this phase.

## 8. Final Classification

`OUTCOME A — DUPLICATE_COLLAPSE_TO_MCD11`

Reason:

- all `12` unresolved `2011bw` rows map one-to-one onto canonical `mcd11`
- no multiple matches
- no unmatched rows
- no same-number different-name conflicts
- canonical `mcd11` already owns the correct year-qualified namespace

## 9. Exact Recommended Next Phase

`2011BW_ALIAS_COLLAPSE_TO_MCD11`

Exact action:

- treat `2011bw` as an alias/source lane for `mcd11`
- collapse the `12` null-`gv_id` `2011bw` parents into the existing canonical `mcd11` parents
- preserve canonical `GV-PK-MCD-2011-*`
- do not promote `2011bw`
- do not mint new `gv_id`

## Status

AUDIT COMPLETE
