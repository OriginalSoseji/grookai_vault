# SWSH9_IDENTITY_AUDIT_V1

## 1. Context

`swsh9` is the next unresolved null-`gv_id` identity surface after four proven execution patterns:

- strict duplicate collapse for exact duplicate parent lanes
- numeric-only promotion where no canonical overlap existed
- family realignment for mixed-family namespace corrections
- mixed collapse for `swsh10`, where base-lane duplicates and TG-family duplicates resolved onto different canonical lanes

This phase was audit-only.

No `gv_id` values were written.
No parents were promoted.
No duplicate collapse was applied.

Artifacts for this phase:

- [backend/identity/swsh9_identity_audit_v1.mjs](/C:/grookai_vault/backend/identity/swsh9_identity_audit_v1.mjs)
- [docs/sql/swsh9_identity_audit_v1.sql](/C:/grookai_vault/docs/sql/swsh9_identity_audit_v1.sql)
- [docs/checkpoints/swsh9_identity_audit_v1.json](/C:/grookai_vault/docs/checkpoints/swsh9_identity_audit_v1.json)

## 2. Problem

The remaining unresolved `swsh9` null-parent surface was expected to be mixed:

- base/main rows
- TG-family rows

The audit had to determine whether those rows were:

- duplicate canonical rows
- missing canonical rows
- TG-family rows already represented elsewhere
- or a mixed surface requiring different lawful execution modes per subset

## 3. Audited Counts

Starting unresolved truth matched the prior audit exactly:

- total unresolved null-`gv_id` rows in `swsh9` = `120`
- numeric-only unresolved rows = `90`
- non-numeric unresolved rows = `30`

The `30` non-numeric rows are exactly:

- `TG01` through `TG30`

## 4. Numeric-Lane Findings

Exact overlap against canonical `swsh9` using `card_prints.number = printed_number`:

- `numeric_with_canonical_match_count = 0`
- `numeric_without_canonical_match_count = 90`
- `numeric_same_name_same_number_overlap_count = 0`

Strict exact matching therefore says the numeric rows do not already exist canonically inside `swsh9`.

Normalized-digit audit changes the classification:

- `numeric_normalized_digit_match_count = 90`
- `numeric_normalized_digit_same_name_overlap_count = 90`
- `numeric_duplicate_collapse_ready_count = 90`
- `numeric_normalized_digit_multiple_match_count = 0`

Interpretation:

- all `90` numeric unresolved rows are one-to-one duplicate parents of canonical `swsh9` base rows
- the mismatch is zero padding, not card identity
- example: unresolved `001 / Exeggcute` maps one-to-one to canonical `1 / Exeggcute`

Why numeric promotion is not lawful:

- `buildCardPrintGvIdV1` would derive `GV-PK-BRS-001` for unresolved `001`
- live canon already represents that same physical card as `GV-PK-BRS-1`
- promotion would create a second public identity for an already-canonical base card

## 5. Non-Numeric / TG Findings

Exact overlap against canonical `swsh9`:

- `tg_with_swsh9_canonical_match_count = 0`
- `tg_without_swsh9_canonical_match_count = 30`
- `tg_same_name_same_number_overlap_count = 0`

Canonical `swsh9` currently has:

- `canonical_swsh9_non_numeric_rows = 0`

So TG rows are not canonically represented inside `swsh9` itself.

But TG rows are not missing-canon promotions either.

Family-lane overlap against canonical `swsh9tg`:

- `tg_with_swsh9tg_canonical_match_count = 30`
- `tg_without_swsh9tg_canonical_match_count = 0`
- `tg_with_swsh9tg_strict_same_name_same_number_overlap_count = 30`
- `tg_with_swsh9tg_multiple_match_count = 0`

Derived `gv_id` audit:

- `non_numeric_live_gvid_collision_count = 30`
- every derived TG `gv_id` (`GV-PK-BRS-TG01` ... `GV-PK-BRS-TG30`) is already live
- every collision target is a canonical `swsh9tg` parent

Interpretation:

- the unresolved TG subset belongs to an already-existing TG family lane
- that family is not missing
- it already owns the public TG namespace under `swsh9tg`

## 6. Canonical Overlap Findings

Canonical `swsh9` snapshot:

- `canonical_swsh9_total_rows = 186`
- `canonical_swsh9_numeric_rows = 186`
- `canonical_swsh9_non_numeric_rows = 0`

Canonical `swsh9tg` snapshot:

- `canonical_swsh9tg_total_rows = 30`

First 25 numeric canonical `swsh9` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `2b4c5fdd-8d44-48e0-976c-7dff17f77882` | `GV-PK-BRS-1` | `Exeggcute` | `1` | `swsh9` |
| `87a52ac1-c8a5-4469-9e29-10d2a285612c` | `GV-PK-BRS-2` | `Exeggutor` | `2` | `swsh9` |
| `30f87cb6-5590-4e5d-b50b-ae6c8e618ddf` | `GV-PK-BRS-3` | `Shroomish` | `3` | `swsh9` |
| `d8d6b417-4f94-4097-bd4e-baec07ec9f72` | `GV-PK-BRS-4` | `Breloom` | `4` | `swsh9` |
| `dafdce62-9fde-47b6-a2fd-53257f6d25d7` | `GV-PK-BRS-5` | `Tropius` | `5` | `swsh9` |
| `71252e4f-cc68-44f8-b7a5-c7b2c4677d7c` | `GV-PK-BRS-6` | `Turtwig` | `6` | `swsh9` |
| `beda43fc-cfe9-4008-93fb-ef74ed7660b2` | `GV-PK-BRS-7` | `Grotle` | `7` | `swsh9` |
| `6b32f4eb-384f-4c5a-8a7b-725d0cb45cb3` | `GV-PK-BRS-8` | `Torterra` | `8` | `swsh9` |
| `cdf2741a-35e1-4723-9785-0d780aa2f929` | `GV-PK-BRS-9` | `Burmy` | `9` | `swsh9` |
| `8131e5dd-db69-467f-b828-b154248e66fe` | `GV-PK-BRS-10` | `Wormadam` | `10` | `swsh9` |
| `028087d1-3e10-4f0e-b63e-68228f104fbf` | `GV-PK-BRS-11` | `Mothim` | `11` | `swsh9` |
| `70f94fb1-56fc-4667-ae93-4efe89d1e924` | `GV-PK-BRS-12` | `Cherubi` | `12` | `swsh9` |
| `ce9e9ef9-305a-4181-9007-48f7b22ecca6` | `GV-PK-BRS-13` | `Shaymin V` | `13` | `swsh9` |
| `741d7d14-b71a-4190-9ac7-b8117b6dffbe` | `GV-PK-BRS-14` | `Shaymin VSTAR` | `14` | `swsh9` |
| `96aeb302-26c7-436c-813b-fbbadd224f1a` | `GV-PK-BRS-15` | `Karrablast` | `15` | `swsh9` |
| `f12c01c8-1414-4bab-9f49-ac745dbf6fcc` | `GV-PK-BRS-16` | `Zarude V` | `16` | `swsh9` |
| `f85524e4-bf17-4f28-bbbf-1dba52ce0c95` | `GV-PK-BRS-17` | `Charizard V` | `17` | `swsh9` |
| `f26611be-6390-4dd8-8234-8c646a48e871` | `GV-PK-BRS-18` | `Charizard VSTAR` | `18` | `swsh9` |
| `e16a7fb8-879e-40d4-853f-a7ebcc1a06d8` | `GV-PK-BRS-19` | `Magmar` | `19` | `swsh9` |
| `39398077-6a5d-4f6a-a27a-0156ec599d88` | `GV-PK-BRS-20` | `Magmortar` | `20` | `swsh9` |
| `ebfadb7f-c6ee-4a8d-a386-b6ac91d88f44` | `GV-PK-BRS-21` | `Moltres` | `21` | `swsh9` |
| `20037671-7ce3-435e-8cbe-4ce24f0a1742` | `GV-PK-BRS-22` | `Entei V` | `22` | `swsh9` |
| `b9685496-6068-44ed-8cc6-c2baa41d659d` | `GV-PK-BRS-23` | `Torkoal` | `23` | `swsh9` |
| `1d537521-54e1-4d16-81c7-795b995ff41f` | `GV-PK-BRS-24` | `Chimchar` | `24` | `swsh9` |
| `13e752eb-466d-4823-9fc9-08d0dee0c8ac` | `GV-PK-BRS-025` | `Monferno` | `025` | `swsh9` |

First 25 non-numeric canonical `swsh9` rows:

- none

First 25 canonical `swsh9tg` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `d163f11d-57a4-4be6-a859-627db7a72fee` | `GV-PK-BRS-TG01` | `Flareon` | `TG01` | `swsh9tg` |
| `2dd09bc0-59a9-4cb0-a69b-648c24afd27f` | `GV-PK-BRS-TG02` | `Vaporeon` | `TG02` | `swsh9tg` |
| `adf70654-38b8-482a-8542-1d5495346c82` | `GV-PK-BRS-TG03` | `Octillery` | `TG03` | `swsh9tg` |
| `9aa11e7f-86e9-4684-aa5a-ed054bb120d3` | `GV-PK-BRS-TG04` | `Jolteon` | `TG04` | `swsh9tg` |
| `799dc6b6-eb88-4ffe-b0cc-fb8f5d1a3c15` | `GV-PK-BRS-TG05` | `Zekrom` | `TG05` | `swsh9tg` |
| `dcf73b18-e442-45b4-be3c-2818fb4a0b80` | `GV-PK-BRS-TG06` | `Dusknoir` | `TG06` | `swsh9tg` |
| `26cd2796-589e-485d-80bd-72d391791fa0` | `GV-PK-BRS-TG07` | `Dedenne` | `TG07` | `swsh9tg` |
| `ed03ad3b-232c-4001-8ae9-c82c0d925d26` | `GV-PK-BRS-TG08` | `Alcremie` | `TG08` | `swsh9tg` |
| `478d1194-3cb9-4c33-952c-c76fe686378f` | `GV-PK-BRS-TG09` | `Ariados` | `TG09` | `swsh9tg` |
| `5266628f-e4a2-4c49-a0d5-c93d61b19e48` | `GV-PK-BRS-TG10` | `Houndoom` | `TG10` | `swsh9tg` |
| `b7ec85c7-84a6-44dd-aab7-59ba1a4c4686` | `GV-PK-BRS-TG11` | `Eevee` | `TG11` | `swsh9tg` |
| `c998e5a2-ff6c-420f-876d-01e2f74c6bcf` | `GV-PK-BRS-TG12` | `Oranguru` | `TG12` | `swsh9tg` |
| `33d72a59-1bb4-4812-a0cd-75dc3018f30e` | `GV-PK-BRS-TG13` | `Boltund V` | `TG13` | `swsh9tg` |
| `6c988da5-9d32-4892-8f39-72d74695ad05` | `GV-PK-BRS-TG14` | `Sylveon V` | `TG14` | `swsh9tg` |
| `68bdd0c6-0c9c-4f1a-b1f3-539469cddb94` | `GV-PK-BRS-TG15` | `Sylveon VMAX` | `TG15` | `swsh9tg` |
| `d4bd33fb-2e78-49cb-80f4-1e7b8d22b2c6` | `GV-PK-BRS-TG16` | `Mimikyu V` | `TG16` | `swsh9tg` |
| `8a3762fb-bffb-4ff3-a3f8-9a8fbe1ab696` | `GV-PK-BRS-TG17` | `Mimikyu VMAX` | `TG17` | `swsh9tg` |
| `dd18da59-6571-4985-9215-7aebea3d2432` | `GV-PK-BRS-TG18` | `Single Strike Urshifu V` | `TG18` | `swsh9tg` |
| `04db0fe6-15fe-4007-b20c-d5be36ae4607` | `GV-PK-BRS-TG19` | `Single Strike Urshifu VMAX` | `TG19` | `swsh9tg` |
| `ec084c89-b90b-45f4-b77b-a80b84b542b8` | `GV-PK-BRS-TG20` | `Rapid Strike Urshifu V` | `TG20` | `swsh9tg` |
| `acdfa368-aedb-4297-ba7d-cb43f8d1baec` | `GV-PK-BRS-TG21` | `Rapid Strike Urshifu VMAX` | `TG21` | `swsh9tg` |
| `f98caead-d0f8-406d-88d4-e53eb13506f9` | `GV-PK-BRS-TG22` | `Umbreon V` | `TG22` | `swsh9tg` |
| `cf0de59c-1d77-4709-8e2f-f8e1d8199df8` | `GV-PK-BRS-TG23` | `Umbreon VMAX` | `TG23` | `swsh9tg` |
| `1d69e9d0-b86e-4d8d-bce5-80d956c5c6c9` | `GV-PK-BRS-TG24` | `Acerola's Premonition` | `TG24` | `swsh9tg` |
| `ec2067ea-66ab-4f06-a085-c618b38e23cb` | `GV-PK-BRS-TG25` | `Café Master` | `TG25` | `swsh9tg` |

## 7. Strict Same-Name Same-Number Findings

Inside canonical `swsh9`, strict same-name same-number overlap is zero for the exact lane:

- `strict_numeric_overlap_count = 0`
- `multiple_canonical_match_row_count = 0`
- `zero_canonical_match_row_count = 120`
- `canonical_match_but_different_name_row_count = 0`

Against canonical `swsh9tg`, strict TG family overlap is complete:

- `strict_tg_family_overlap_count = 30`
- `family_multiple_canonical_match_row_count = 0`
- `family_zero_canonical_match_row_count = 0`
- `family_canonical_match_but_different_name_row_count = 0`

Consequence:

- the existing strict duplicate-collapse runner is not lawful for the numeric subset as-is
- exact-number matching would miss all `90` numeric duplicates because the live canonical base lane uses unpadded numbers
- the TG subset is already one-to-one collapse-ready against canonical `swsh9tg`

## 8. Raw / Family Evidence

TG-family proof is strong and direct.

Source linkage:

- `tcgdex_active_external_mapping_count = 30`
- `tcgdex_raw_link_count = 30`
- every unresolved non-numeric row has an active `tcgdex` mapping
- every unresolved non-numeric row links to a `tcgdex` raw payload with:
  - `payload_set_id = swsh9`
  - `payload_local_id = TG01 ... TG30`
  - matching card name

Representative raw evidence:

- `Flareon / TG01` -> external id `swsh9-TG01`, raw local id `TG01`, raw set id `swsh9`
- `Vaporeon / TG02` -> external id `swsh9-TG02`, raw local id `TG02`, raw set id `swsh9`
- `Octillery / TG03` -> external id `swsh9-TG03`, raw local id `TG03`, raw set id `swsh9`

Canonical TG target surface:

- `canonical_swsh9tg_count = 30`
- `canonical_swsh9tg_with_active_identity_count = 0`
- `canonical_swsh9tg_without_active_identity_count = 30`

Interpretation:

- the unresolved TG rows are not missing new canon
- they are already represented by canonical `swsh9tg` parents
- those target parents are identity-empty, so a family-targeted collapse / rehome path is available

## 9. Final Classification

### OUTCOME D — MIXED EXECUTION

`swsh9` is a mixed surface containing two different execution subsets:

- `90` numeric rows are duplicate canonical base rows and require normalized-digit duplicate collapse onto canonical `swsh9`
- `30` TG rows are TG-family rows already canonically present under `swsh9tg` and require family-targeted realignment / collapse to that family

It is not:

- pure duplicate collapse
- pure promotion
- pure family realignment

## 10. Exact Recommended Next Phase For `swsh9`

Exact next lawful execution mode:

- `NUMERIC_DUPLICATE_COLLAPSE_BY_NORMALIZED_DIGITS + TG_FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH9TG`

Operational recommendation:

1. Build a set-scoped `swsh9` numeric duplicate-collapse dry run that maps zero-padded numeric unresolved rows to canonical `swsh9` parents using:
   - same normalized digits
   - same normalized name
   - one-to-one target proof
2. Build a TG-family realignment / collapse dry run that maps unresolved `swsh9` TG rows to canonical `swsh9tg` parents using:
   - exact same `TG##`
   - exact same normalized name
   - one-to-one target proof
   - confirmation that target `swsh9tg` parents currently have zero active identity rows

Do not run:

- Phase 2A-style numeric promotion for the `90` numeric rows
- direct TG promotion inside `swsh9`
- any unsuffixed / newly minted `GV-PK-BRS-TG##` apply

Why those are unlawful:

- numeric promotion would create second public identities for already-canonical base cards
- TG promotion would collide with the already-live canonical `swsh9tg` namespace

## Status

AUDIT COMPLETE
