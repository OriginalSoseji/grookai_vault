# promo_family_identity_rule_v1

## Context
- Workflow: `PROMO_FAMILY_IDENTITY_RULE_V1`
- Input pool: the exact 48-row stamped-ready remainder from `stamped_ready_batch_3_v1.json`
- Scope stayed locked to contract definition plus backlog reclassification. No warehouse run, promotion, mapping, or image work executed.

## Audit Summary
- Audited rows: `48`
- New family rule covered rows: `37`
- Existing-rule rows: `11`
- Rebucketed counts: `48 READY_FOR_WAREHOUSE`, `0 NEEDS_RULE_EXTENSION`, `0 MANUAL_REVIEW`

## Identity Shapes
- BWP_PROMO_SLOT_PREFIX_EXISTING: 2
- DPP_PROMO_SLOT_PREFIX: 1
- NP_PROMO_SLOT_NUMERIC: 11
- PROMO_FAMILY_SLASH_TO_EXPANSION_DPP: 5
- PROMO_FAMILY_SLASH_TO_EXPANSION_NP: 20
- SAME_SET_SLASH_OVERLAY_EXISTING: 1
- SMP_PROMO_SLOT_PREFIX_EXISTING: 8

## Rule Result
- `diamond-and-pearl-promos-pokemon` is a mixed family: `DP###` rows stay on `dpp` promo-slot identity, while slash-number prerelease rows route to the unique underlying expansion base row.
- `nintendo-promos-pokemon` is also mixed: numeric promo-slot rows stay on `np`, while slash-number prerelease / E-League / event rows route to the unique underlying expansion base row.
- Worlds, E-League, staff, winner, and placement labels remain identity-bearing overlays in `variant_key`; they do not invent a synthetic canonical number.

## Rebucket Outcome
- The prior 25 `CONFLICT_REVIEW_REQUIRED` rows were conflicting because promo-family routing still treated them as same-family promo rows. Under the new family-aware rule, those slash-number rows resolve to unique underlying expansion bases.
- All 48 remaining rows are now explainable under a lawful identity model.
- Clean next batch size from this remainder: `48`

## Representative Rows
- black-and-white-promos-pokemon | Tropical Beach | BW50 | worlds_12_stamp | Worlds 12 Stamp | BWP_PROMO_SLOT_PREFIX_EXISTING | bwp | GV-PK-PR-BLW-BW50
- black-and-white-promos-pokemon | Tropical Beach | BW50 | worlds_12_top_32_stamp | Worlds 12 Top 32 Stamp | BWP_PROMO_SLOT_PREFIX_EXISTING | bwp | GV-PK-PR-BLW-BW50
- diamond-and-pearl-promos-pokemon | Tropical Wind | DP05 | worlds_07_stamp | Worlds 07 Stamp | DPP_PROMO_SLOT_PREFIX | dpp | GV-PK-PR-DPP-DP05
- diamond-and-pearl-promos-pokemon | Gabite | 48/123 | staff_prerelease_stamp | Staff Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_DPP | dp2 | GV-PK-MT-48
- diamond-and-pearl-promos-pokemon | Lucario | 53/127 | staff_prerelease_stamp | Staff Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_DPP | pl1 | GV-PK-PL-53
- diamond-and-pearl-promos-pokemon | Lucario | 53/127 | prerelease_stamp | Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_DPP | pl1 | GV-PK-PL-53
- diamond-and-pearl-promos-pokemon | Gabite | 48/124 | prerelease_stamp | Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_DPP | dp2 | GV-PK-MT-48
- diamond-and-pearl-promos-pokemon | Mothim | 42/100 | prerelease_stamp | Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_DPP | dp5 | GV-PK-MD-42
- generations-pokemon | Geodude | 043/083 | generations_geodude_stamp | Generations Geodude Stamp | SAME_SET_SLASH_OVERLAY_EXISTING | g1 | GV-PK-GEN-43
- nintendo-promos-pokemon | Tropical Tidal Wave | 036 | 2006_world_championships_staff_stamp | 2006 World Championships Staff Stamp | NP_PROMO_SLOT_NUMERIC | np | GV-PK-PR-NP-36
- nintendo-promos-pokemon | Leafeon | 17/90 | staff_prerelease_stamp | Staff Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_NP | hgss3 | GV-PK-UD-17
- nintendo-promos-pokemon | Dark Houndoom | 37/109 | prerelease_stamp | Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_NP | ex7 | GV-PK-TRR-37
- nintendo-promos-pokemon | Milotic | 70/147 | staff_prerelease_stamp | Staff Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_NP | pl3 | GV-PK-SV-70
- nintendo-promos-pokemon | Luxio | 52/130 | staff_prerelease_stamp | Staff Prerelease Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_NP | dp1 | GV-PK-DP-52
- nintendo-promos-pokemon | Salamence | 19/97 | e_league_winner_stamp | E-league Winner Stamp | PROMO_FAMILY_SLASH_TO_EXPANSION_NP | ex3 | GV-PK-DR-19

## Next Step
- The next clean execution step is the exact 48-row remainder batch, not another synthetic 250-row scale test.
