# LC_IDENTITY_AUDIT_V1

## 1. Context

The global remaining identity audit classified `lc` as `CLASS C — FAMILY REALIGNMENT` with `110` unresolved null-`gv_id` rows.

That global result already implied:

- `lc` is not a simple duplicate-collapse surface
- `lc` is not a numeric-promotion surface
- `lc` is not a TG-family mixed-collapse surface
- `lc` likely collides with an already-live canonical namespace

This phase was audit-only.

No `gv_id` values were written.
No parent rows were promoted.
No duplicate collapse was applied.

Artifacts for this phase:

- [backend/identity/lc_identity_audit_v1.mjs](/C:/grookai_vault/backend/identity/lc_identity_audit_v1.mjs)
- [docs/sql/lc_identity_audit_v1.sql](/C:/grookai_vault/docs/sql/lc_identity_audit_v1.sql)
- [docs/checkpoints/lc_identity_audit_v1.json](/C:/grookai_vault/docs/checkpoints/lc_identity_audit_v1.json)

## 2. Problem

The `lc` identity surface had to answer a narrower question than the prior mixed-collapse sets:

- does `lc` have a lawful canonical lane of its own
- does it duplicate an already-canonical lane
- does the public `gv_id` namespace already belong to another set code
- or is the surface still too ambiguous to execute safely

The global audit already suggested the relevant conflict:

- `lc` would derive `GV-PK-LC-*`
- live canon already exposes `GV-PK-LC-*` under `base6`

This audit had to prove whether that is an identity-family realignment case or a blocked surface.

## 3. Unresolved Counts

The live unresolved surface matched the global audit exactly:

- `total_unresolved = 110`
- `numeric_unresolved = 110`
- `non_numeric_unresolved = 0`

All remaining unresolved `lc` rows are numeric-only.

## 4. Canonical Surface Findings

Canonical `lc` itself is empty:

- `canonical_lc_count = 0`
- `canonical_lc_non_null_gvid_count = 0`

The conflicting live canonical surface is `base6`:

- `canonical_base6_count = 110`
- `canonical_base6_non_null_gvid_count = 110`

Representative canonical `base6` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `fd852708-bb5d-4a35-8c1a-10756ed4747d` | `GV-PK-LC-1` | `Alakazam` | `1` | `base6` |
| `0c2945c5-28f7-41b8-bb86-1fd8ab38cd72` | `GV-PK-LC-2` | `Articuno` | `2` | `base6` |
| `6e180172-3fdb-4278-ad21-dfba4c400e3e` | `GV-PK-LC-3` | `Charizard` | `3` | `base6` |
| `f443a31c-1740-4dde-9319-a779dd857646` | `GV-PK-LC-4` | `Dark Blastoise` | `4` | `base6` |
| `03151ac4-c239-438b-808e-c723454f2c4c` | `GV-PK-LC-5` | `Dark Dragonite` | `5` | `base6` |

Interpretation:

- there is no canonical `lc` lane to promote into
- the live Legendary Collection namespace already exists under canonical `base6`

## 5. Strict Overlap Findings

Strict overlap against canonical `base6` using the existing DB-lane normalized names produced:

- `same_name_same_number_overlap_count = 108`
- `same_number_different_name_count = 2`
- `same_name_different_number_count = 0`
- `multiple_canonical_match_count = 0`
- `zero_canonical_match_count = 0`

The only strict anomalies are formatting variants:

| unresolved id | unresolved name | printed_number | canonical name | canonical gv_id |
| --- | --- | --- | --- | --- |
| `2862cf56-403e-4660-aae9-ced8dc3fe457` | `Nidoran♀` | `82` | `Nidoran ♀` | `GV-PK-LC-82` |
| `d0f217cc-7087-4bdd-be2c-6ed9279c0c19` | `Nidoran♂` | `83` | `Nidoran ♂` | `GV-PK-LC-83` |

Repo-standard normalization resolves those safely:

- `repo_normalized_same_name_same_number_count = 110`
- `repo_multiple_match_count = 0`
- `repo_zero_match_count = 0`

Interpretation:

- every unresolved `lc` row already has exactly one canonical `base6` target
- the two strict-name anomalies are symbol-formatting differences, not identity splits

## 6. Namespace / Collision Findings

If the live builder were asked to mint `gv_id` values for the unresolved `lc` rows, the result would collide completely with existing canon:

- `proposed_gvid_collision_count = 110`
- `collision_breakdown_by_target_set = { "base6": 110 }`
- `collision_same_name_same_number_count = 108`
- `collision_same_number_different_name_count = 2`

Representative collision proof:

| unresolved row | proposed gv_id | live collision target |
| --- | --- | --- |
| `Alakazam / 1` | `GV-PK-LC-1` | `base6 / Alakazam / 1` |
| `Articuno / 2` | `GV-PK-LC-2` | `base6 / Articuno / 2` |
| `Charizard / 3` | `GV-PK-LC-3` | `base6 / Charizard / 3` |

Interpretation:

- promotion is not lawful
- the public `LC` namespace is already occupied
- the only safe execution path is to preserve the live `base6` namespace and realign `lc` onto it

## 7. Printed Abbrev Findings

`lc` set metadata is present and stable:

- `printed_set_abbrev_present = true`
- `printed_set_abbrev = LC`
- `printed_total_present = true`
- `printed_total = 110`

That abbrev is shared by exactly two live set records:

- `base6`
- `lc`

The shared `LC` abbrev is the direct explanation for the global `CLASS C` result:

- both set records describe `Legendary Collection`
- both want the same public `GV-PK-LC-*` namespace
- only `base6` already owns that namespace canonically

## 8. Raw / Provenance Evidence

Raw provenance is strong enough to support the alias-family interpretation:

- `unresolved_tcgdex_mapping_count = 110`
- `unresolved_tcgdex_raw_link_count = 110`
- `raw_set_ids = ['lc']`
- `supports_alias_family_realign_hypothesis = true`

Representative unresolved raw rows:

| unresolved row | tcgdex external id | raw_set_id | raw_local_id |
| --- | --- | --- | --- |
| `Alakazam / 1` | `lc-1` | `lc` | `1` |
| `Articuno / 2` | `lc-2` | `lc` | `2` |
| `Charizard / 3` | `lc-3` | `lc` | `3` |

Interpretation:

- unresolved rows are genuinely coming from the `tcgdex` alias set code `lc`
- they are not random duplicates or missing metadata rows
- the conflict is between two lanes representing the same Legendary Collection namespace

## 9. Final Classification

### OUTCOME C — FAMILY REALIGNMENT

This confirms the global `CLASS C — FAMILY REALIGNMENT` result rather than overriding it.

Why it is not `OUTCOME A — DUPLICATE COLLAPSE`:

- there is no canonical `lc` lane to collapse into

Why it is not `OUTCOME B — NUMERIC PROMOTION`:

- minting `GV-PK-LC-*` for `lc` would collide `110 / 110` times with live canonical `base6`

Why it is not `OUTCOME D — BLOCKED`:

- every unresolved row has exactly one canonical `base6` target
- repo-standard normalization resolves the only two name-format anomalies
- set metadata and raw provenance both support the alias explanation

## 10. Exact Recommended Next Phase For `lc`

Exact next lawful execution mode:

- `LC_ALIAS_REALIGNMENT_COLLAPSE_TO_BASE6`

Operational recommendation:

1. Build a set-scoped `lc` realignment / collapse runner.
2. Freeze a one-to-one map from unresolved `lc` parents to canonical `base6` parents by:
   - same printed number
   - repo-normalized same name
   - zero multiple matches
   - zero unmatched rows
3. Repoint FK surfaces from the unresolved `lc` parents onto canonical `base6`.
4. Preserve canonical `base6` rows and existing `GV-PK-LC-*` values.

Do not run:

- numeric promotion for `lc`
- canonical `lc` `gv_id` minting
- any execution path that would create a second public `LC` namespace

## Status

AUDIT COMPLETE
