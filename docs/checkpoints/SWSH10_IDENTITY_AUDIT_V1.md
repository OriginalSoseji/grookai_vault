# SWSH10_IDENTITY_AUDIT_V1

## 1. Context

`swsh10` was the next unresolved null-`gv_id` identity surface after:

- strict duplicate collapse proved lawful for exact duplicate parent lanes
- numeric-only promotion proved lawful where no canonical overlap existed
- Paldean Fates proved that mixed-family surfaces require family-aware classification before apply

This phase was audit-only.

No `gv_id` values were written.
No parents were promoted.
No duplicate collapse was applied.

Artifacts for this phase:

- [backend/identity/swsh10_identity_audit_v1.mjs](/C:/grookai_vault/backend/identity/swsh10_identity_audit_v1.mjs)
- [docs/sql/swsh10_identity_audit_v1.sql](/C:/grookai_vault/docs/sql/swsh10_identity_audit_v1.sql)
- [docs/checkpoints/swsh10_identity_audit_v1.json](/C:/grookai_vault/docs/checkpoints/swsh10_identity_audit_v1.json)

## 2. Problem

The remaining unresolved `swsh10` null-parent surface was expected to be mixed:

- base/main rows
- TG-family rows

The audit had to determine whether those rows were:

- duplicate canonical rows
- missing canonical rows
- TG-family rows already represented elsewhere
- or a mixed surface requiring different execution modes per subset

## 3. Audited Counts

Starting unresolved truth matched the prior audit exactly:

- total unresolved null-`gv_id` rows in `swsh10` = `128`
- numeric-only unresolved rows = `98`
- non-numeric unresolved rows = `30`

The `30` non-numeric rows are exactly:

- `TG01` through `TG30`

## 4. Numeric-Lane Findings

Exact overlap against canonical `swsh10` using `card_prints.number = printed_number`:

- `numeric_with_canonical_match_count = 0`
- `numeric_without_canonical_match_count = 98`
- `numeric_same_name_same_number_overlap_count = 0`

Strict exact matching therefore says the numeric rows do **not** already exist canonically inside `swsh10`.

However, normalized-digit audit changes the classification:

- `numeric_duplicate_collapse_ready_count = 98`
- `numeric_normalized_digit_same_name_overlap_count = 98`
- `numeric_normalized_digit_multiple_match_count = 0`

Interpretation:

- all `98` numeric unresolved rows are one-to-one duplicate parents of canonical `swsh10` base rows
- the mismatch is zero padding, not card identity
- example: unresolved `001 / Beedrill V` maps one-to-one to canonical `1 / Beedrill V`

Why numeric promotion is not lawful:

- `buildCardPrintGvIdV1` would derive `GV-PK-ASR-001` for unresolved `001`
- live canon already represents that same physical card as `GV-PK-ASR-1`
- promotion would create a second public identity for an already-canonical base card

## 5. Non-Numeric / TG Findings

Exact overlap against canonical `swsh10`:

- `tg_with_canonical_match_count = 0`
- `tg_without_canonical_match_count = 30`
- `tg_same_name_same_number_overlap_count = 0`

Canonical `swsh10` currently has:

- `canonical_non_numeric_rows = 0`

So TG rows are **not** canonically represented inside `swsh10` itself.

But TG rows are not missing-canon promotions either.

Derived `gv_id` audit:

- `non_numeric_live_gvid_collision_count = 30`
- every derived TG `gv_id` (`GV-PK-ASR-TG01` ... `GV-PK-ASR-TG30`) is already live
- every collision target is a canonical `swsh10tg` parent

Interpretation:

- the unresolved TG subset belongs to an already-existing TG family lane
- that family is not missing
- it already owns the public TG namespace under `swsh10tg`

## 6. Canonical Overlap Findings

Canonical `swsh10` snapshot:

- `canonical_total_rows = 216`
- `canonical_numeric_rows = 216`
- `canonical_non_numeric_rows = 0`

First 25 numeric canonical `swsh10` rows:

| card_prints.id | gv_id | name | number | set_code |
| --- | --- | --- | --- | --- |
| `dfb3467f-aed2-415a-a430-71b7fa5dc00f` | `GV-PK-ASR-1` | `Beedrill V` | `1` | `swsh10` |
| `9d8c9876-ef83-4236-9642-24e15a0d07ba` | `GV-PK-ASR-2` | `Hisuian Voltorb` | `2` | `swsh10` |
| `0d13ab03-6d9f-4833-bed8-e49c218822f8` | `GV-PK-ASR-3` | `Hisuian Electrode` | `3` | `swsh10` |
| `e20f9135-89b3-4de2-8457-b604c50be9e7` | `GV-PK-ASR-4` | `Scyther` | `4` | `swsh10` |
| `9b9f1d9e-802c-4286-9be4-04b297ad6737` | `GV-PK-ASR-5` | `Scyther` | `5` | `swsh10` |
| `31f581db-569e-4100-bd8c-c4cfe08320df` | `GV-PK-ASR-6` | `Yanma` | `6` | `swsh10` |
| `17966620-6e0c-42d0-8763-6a272ef6a531` | `GV-PK-ASR-7` | `Yanmega` | `7` | `swsh10` |
| `1a868d5f-2fe2-48fc-9f4d-993ffee5a081` | `GV-PK-ASR-8` | `Heracross` | `8` | `swsh10` |
| `7075beaf-0d6b-4b77-a8c7-ed6ad67e364a` | `GV-PK-ASR-9` | `Kricketot` | `9` | `swsh10` |
| `1025b39f-ed4b-4713-9cc4-f2dd2cac6e46` | `GV-PK-ASR-10` | `Kricketune` | `10` | `swsh10` |
| `7c34866e-3306-4784-95fe-8e2c9c87948c` | `GV-PK-ASR-11` | `Combee` | `11` | `swsh10` |
| `119b7891-44fe-445d-9679-fad458c3d38e` | `GV-PK-ASR-12` | `Vespiquen` | `12` | `swsh10` |
| `4094547f-0c16-4caa-96b8-e458eb97c53d` | `GV-PK-ASR-013` | `Leafeon` | `013` | `swsh10` |
| `232ae712-f787-4472-a298-4b1ce6461e17` | `GV-PK-ASR-14` | `Shaymin` | `14` | `swsh10` |
| `30d47642-0fe1-49d2-8f33-956d09dd2845` | `GV-PK-ASR-15` | `Petilil` | `15` | `swsh10` |
| `e8fed3fa-439f-445a-a669-fa774a2eceba` | `GV-PK-ASR-16` | `Hisuian Lilligant` | `16` | `swsh10` |
| `05a3e4fc-15c7-460d-89ed-e463cb60d55b` | `GV-PK-ASR-17` | `Hisuian Lilligant V` | `17` | `swsh10` |
| `ea17be17-eb98-4550-9e31-5b52189cf67f` | `GV-PK-ASR-18` | `Hisuian Lilligant VSTAR` | `18` | `swsh10` |
| `5792238e-0c5f-4c4f-b95c-4a9218a9edea` | `GV-PK-ASR-19` | `Rowlet` | `19` | `swsh10` |
| `74ab5317-f3c5-4fe3-b4ab-4e60b9ff1ffd` | `GV-PK-ASR-20` | `Dartrix` | `20` | `swsh10` |
| `ef75d38d-d9c9-4dd4-a4fd-eabc26671c87` | `GV-PK-ASR-21` | `Ponyta` | `21` | `swsh10` |
| `e2d968c2-2234-44fd-b215-49c9ca2eaf9c` | `GV-PK-ASR-22` | `Rapidash` | `22` | `swsh10` |
| `fb267cee-adae-489f-82b9-750ed6a17ab6` | `GV-PK-ASR-23` | `Cyndaquil` | `23` | `swsh10` |
| `d6ee1e74-20a2-4ac3-8d01-1eb0a2388a19` | `GV-PK-ASR-24` | `Quilava` | `24` | `swsh10` |
| `0588afd0-7c29-449a-b874-9d9eeea777f4` | `GV-PK-ASR-25` | `Heatran V` | `25` | `swsh10` |

First 25 non-numeric canonical `swsh10` rows:

- none

## 7. Strict Same-Name Same-Number Findings

Inside canonical `swsh10`, strict same-name same-number overlap is zero for both lanes:

- `strict_numeric_overlap_count = 0`
- `strict_non_numeric_overlap_count = 0`

Additional exact audit:

- `multiple_canonical_match_row_count = 0`
- `zero_canonical_match_row_count = 128`
- `canonical_match_but_different_name_row_count = 0`

Consequence:

- the existing strict duplicate-collapse runner is **not** lawful for `swsh10` as-is
- exact-number matching would miss all `98` numeric duplicates because the live canonical lane uses unpadded numbers

## 8. Raw / Family Evidence

TG-family proof is strong and direct.

Source linkage:

- `tcgdex_active_external_mapping_count = 30`
- `tcgdex_raw_link_count = 30`
- every unresolved non-numeric row has an active `tcgdex` mapping
- every unresolved non-numeric row links to a `tcgdex` raw payload with:
  - `payload_set_id = swsh10`
  - `payload_local_id = TG01 ... TG30`
  - matching card name

Representative raw evidence:

- `Abomasnow / TG01` -> external id `swsh10-TG01`, raw local id `TG01`, raw set id `swsh10`
- `Flapple / TG02` -> external id `swsh10-TG02`, raw local id `TG02`, raw set id `swsh10`
- `Kingdra / TG03` -> external id `swsh10-TG03`, raw local id `TG03`, raw set id `swsh10`

Cross-family target proof:

- `tg_with_swsh10tg_canonical_match_count = 30`
- `tg_with_swsh10tg_strict_same_name_same_number_overlap_count = 30`
- `tg_with_swsh10tg_multiple_match_count = 0`

Canonical TG target surface:

- canonical `swsh10tg` rows with live `gv_id` = `30`
- canonical `swsh10tg` rows with active identity rows = `0`

Interpretation:

- the unresolved TG rows are not missing new canon
- they are already represented by canonical `swsh10tg` parents
- those target parents are identity-empty, so a family-targeted collapse / rehome path is available

## 9. Final Classification

### OUTCOME D — MIXED EXECUTION

`swsh10` is a mixed surface containing two different execution subsets:

- `98` numeric rows are duplicate canonical base rows and require normalized-digit duplicate collapse onto canonical `swsh10`
- `30` TG rows are TG-family rows already canonically present under `swsh10tg` and require family-targeted realignment / collapse to that family

It is **not**:

- pure duplicate collapse
- pure promotion
- pure family realignment

## 10. Exact Recommended Next Phase For `swsh10`

Exact next lawful execution mode:

- `NUMERIC_DUPLICATE_COLLAPSE_BY_NORMALIZED_DIGITS + TG_FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH10TG`

Operational recommendation:

1. Build a set-scoped `swsh10` numeric duplicate-collapse dry run that maps zero-padded numeric unresolved rows to canonical `swsh10` parents using:
   - same normalized digits
   - same normalized name
   - one-to-one target proof
2. Build a TG-family realignment / collapse dry run that maps unresolved `swsh10` TG rows to canonical `swsh10tg` parents using:
   - exact same `TG##`
   - exact same normalized name
   - one-to-one target proof
   - confirmation that target `swsh10tg` parents currently have zero active identity rows

Do not run:

- Phase 2A-style numeric promotion for the `98` numeric rows
- direct TG promotion inside `swsh10`
- any unsuffixed / newly minted `GV-PK-ASR-TG##` apply

Why those are unlawful:

- numeric promotion would create second public identities for already-canonical base cards
- TG promotion would collide with the already-live canonical `swsh10tg` namespace

## Status

AUDIT COMPLETE
