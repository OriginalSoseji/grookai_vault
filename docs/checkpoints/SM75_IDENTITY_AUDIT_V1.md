# SM75_IDENTITY_AUDIT_V1

## 1. Context

The global remaining identity audit classified `sm7.5` as `CLASS C — FAMILY REALIGNMENT` with `78` unresolved null-`gv_id` rows.

That global result already implied:

- `sm7.5` is not a simple duplicate-collapse surface
- `sm7.5` is not a numeric-promotion surface
- `sm7.5` is not a TG-family mixed-collapse surface
- `sm7.5` likely collides with an already-live canonical Dragon Majesty namespace

This phase was audit-only.

No `gv_id` values were written.
No parent rows were promoted.
No duplicate collapse was applied.

Artifacts for this phase:

- [backend/identity/sm75_identity_audit_v1.mjs](/C:/grookai_vault/backend/identity/sm75_identity_audit_v1.mjs)
- [docs/sql/sm75_identity_audit_v1.sql](/C:/grookai_vault/docs/sql/sm75_identity_audit_v1.sql)
- [docs/checkpoints/sm75_identity_audit_v1.json](/C:/grookai_vault/docs/checkpoints/sm75_identity_audit_v1.json)

## 2. Problem

The `sm7.5` identity surface had to answer a narrower question than the prior mixed-collapse sets:

- does `sm7.5` have a lawful canonical lane of its own
- does it duplicate an already-canonical lane
- does the public `gv_id` namespace already belong to another set code
- or is the surface still too ambiguous to execute safely

The global audit already suggested the relevant conflict:

- `sm7.5` would derive `GV-PK-DRM-*`
- live canon already exposes `GV-PK-DRM-*` under `sm75`

This audit had to prove whether that is an identity-family realignment case or a blocked surface.

## 3. Unresolved Counts

The live unresolved surface matched the global audit exactly:

- `total_unresolved = 78`
- `numeric_unresolved = 78`
- `non_numeric_unresolved = 0`

All remaining unresolved `sm7.5` rows are numeric-only.

## 4. Canonical Surface Findings

Canonical `sm7.5` itself is empty:

- `canonical_sm7p5_count = 0`
- `canonical_sm7p5_non_null_gvid_count = 0`

The conflicting live canonical surface is `sm75`:

- `canonical_sm75_count = 78`
- `canonical_sm75_non_null_gvid_count = 78`

Representative canonical `sm75` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `a592c487-4e07-4d38-963b-768dba841fee` | `GV-PK-DRM-1` | `Charmander` | `1` | `sm75` |
| `906ae840-2dc7-47e5-93e8-1bb972ae82c3` | `GV-PK-DRM-11` | `Reshiram-GX` | `11` | `sm75` |
| `06fe2521-8ae3-4adf-82c8-fb98120c8352` | `GV-PK-DRM-18` | `Kingdra-GX` | `18` | `sm75` |
| `12332915-5d05-467b-a3da-91039f010cb2` | `GV-PK-DRM-37` | `Dragonite-GX` | `37` | `sm75` |
| `77d76145-4bca-4100-94fb-b6c6d2e691ce` | `GV-PK-DRM-41` | `Altaria-GX` | `41` | `sm75` |

Interpretation:

- there is no canonical `sm7.5` lane to promote into
- the live Dragon Majesty namespace already exists under canonical `sm75`

## 5. Strict Overlap Findings

Strict overlap against canonical `sm75` using the existing DB-lane normalized names produced:

- `same_name_same_number_overlap_count = 61`
- `same_number_different_name_count = 17`
- `same_name_different_number_count = 14`
- `multiple_canonical_match_count = 0`
- `zero_canonical_match_count = 0`

The `17` same-number different-name rows are formatting variants, not identity splits:

| unresolved name | printed_number | canonical name | canonical gv_id |
| --- | --- | --- | --- |
| `Reshiram GX` | `11` | `Reshiram-GX` | `GV-PK-DRM-11` |
| `Kingdra GX` | `18` | `Kingdra-GX` | `GV-PK-DRM-18` |
| `Dragonite GX` | `37` | `Dragonite-GX` | `GV-PK-DRM-37` |
| `Blaine’s Last Stand` | `58` | `Blaine's Last Stand` | `GV-PK-DRM-58` |
| `Ultra Necrozma GX` | `78` | `Ultra Necrozma-GX` | `GV-PK-DRM-78` |

The `same_name_different_number_count = 14` rows are repeated names that appear at multiple printed numbers inside Dragon Majesty, such as:

- `Horsea`
- `Dratini`
- `Swablu`
- `Zinnia`
- `Dragon Talon`
- `Fiery Flint`
- `Switch Raft`

Those repeated-name rows do not create execution ambiguity because exact-number matching remains one-to-one:

- `multiple_canonical_match_count = 0`
- `zero_canonical_match_count = 0`

Repo-standard canon-aware normalization resolves the formatting variants safely:

- `canon_aware_same_name_same_number_count = 78`
- `canon_aware_multiple_match_count = 0`
- `canon_aware_zero_match_count = 0`

Interpretation:

- every unresolved `sm7.5` row already has exactly one canonical `sm75` target
- the only same-number anomalies are formatting differences such as hyphen and apostrophe normalization
- repeated names elsewhere in the set do not block realignment

## 6. Namespace / Collision Findings

If the live builder were asked to mint `gv_id` values for the unresolved `sm7.5` rows, the result would collide completely with existing canon:

- `proposed_gvid_collision_count = 78`
- `collision_breakdown_by_target_set = { "sm75": 78 }`
- `collision_same_name_same_number_count = 61`
- `collision_same_number_different_name_count = 17`

Representative collision proof:

| unresolved row | proposed gv_id | live collision target |
| --- | --- | --- |
| `Charmander / 1` | `GV-PK-DRM-1` | `sm75 / Charmander / 1` |
| `Reshiram GX / 11` | `GV-PK-DRM-11` | `sm75 / Reshiram-GX / 11` |
| `Kingdra GX / 18` | `GV-PK-DRM-18` | `sm75 / Kingdra-GX / 18` |

Interpretation:

- promotion is not lawful
- the public `DRM` namespace is already occupied
- the safe execution path is to preserve the live `sm75` namespace and realign `sm7.5` onto it

## 7. Printed Abbrev Findings

`sm7.5` set metadata is present and stable:

- `printed_set_abbrev_present = true`
- `printed_set_abbrev = DRM`
- `printed_total_present = true`
- `printed_total = 70`

That abbrev is shared by exactly two live set records:

- `sm7.5`
- `sm75`

The shared `DRM` abbrev is the direct explanation for the global `CLASS C` result:

- both set records describe `Dragon Majesty`
- both want the same public `GV-PK-DRM-*` namespace
- only `sm75` already owns that namespace canonically

## 8. Raw / Provenance Evidence

Raw provenance is strong enough to support the alias-family interpretation:

- `unresolved_tcgdex_mapping_count = 78`
- `unresolved_tcgdex_raw_link_count = 78`
- `raw_set_ids = ['sm7.5']`
- `supports_alias_family_realign_hypothesis = true`

Representative unresolved raw rows:

| unresolved row | tcgdex external id | raw_set_id | raw_local_id |
| --- | --- | --- | --- |
| `Charmander / 1` | `sm7.5-1` | `sm7.5` | `1` |
| `Reshiram GX / 11` | `sm7.5-11` | `sm7.5` | `11` |
| `Kingdra GX / 18` | `sm7.5-18` | `sm7.5` | `18` |

Interpretation:

- unresolved rows are genuinely coming from the `tcgdex` alias set code `sm7.5`
- they are not random duplicate parents or missing metadata rows
- the conflict is between two lanes representing the same Dragon Majesty namespace

## 9. Final Classification

### OUTCOME C — FAMILY REALIGNMENT

This confirms the global `CLASS C — FAMILY REALIGNMENT` result rather than overriding it.

Why it is not `OUTCOME A — DUPLICATE COLLAPSE`:

- there is no canonical `sm7.5` lane to collapse into

Why it is not `OUTCOME B — NUMERIC PROMOTION`:

- minting `GV-PK-DRM-*` for `sm7.5` would collide `78 / 78` times with live canonical `sm75`

Why it is not `OUTCOME D — BLOCKED`:

- every unresolved row has exactly one canonical `sm75` target by printed number
- repo-standard canon-aware normalization resolves all `17` same-number formatting anomalies
- there are zero multiple matches and zero unmatched rows
- set metadata and raw provenance both support the alias explanation

## 10. Exact Recommended Next Phase For `sm7.5`

Exact next lawful execution mode:

- `SM75_ALIAS_REALIGNMENT_COLLAPSE_TO_SM75`

Operational recommendation:

1. Build a set-scoped `sm7.5` alias realignment / collapse runner.
2. Freeze a one-to-one map from unresolved `sm7.5` parents to canonical `sm75` parents by:
   - same printed number
   - repo-normalized same name
   - zero multiple matches
   - zero unmatched rows
3. Repoint FK surfaces from the unresolved `sm7.5` parents onto canonical `sm75`.
4. Preserve canonical `sm75` rows and existing `GV-PK-DRM-*` values.

Do not run:

- numeric promotion for `sm7.5`
- canonical `sm7.5` `gv_id` minting
- any execution path that would create a second public `DRM` namespace

## Status

AUDIT COMPLETE
