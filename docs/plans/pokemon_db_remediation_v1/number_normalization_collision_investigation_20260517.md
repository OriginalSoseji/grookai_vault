# Number Normalization Collision Investigation - 2026-05-17

Status: no-write collision investigation. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Investigate the 256 Lane A number-normalization candidates that were blocked because the proposed TCGdex-derived number already collides with an existing `card_prints.number` or `card_prints.number_plain` in the same set.

This is the highest-risk hidden-corruption lane because a naive number update could make duplicate imported rows look legitimate instead of exposing the underlying ownership problem.

## Source Inputs

- `docs/plans/pokemon_db_remediation_v1/number_normalization_candidate_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_candidate_evidence_matrix_20260517.json`
- `live_read_only_supabase_evidence_2026-05-17`
- live read-only Supabase queries inside `begin transaction read only`

## Summary

| Metric | Count |
| --- | --- |
| Collision-blocked candidates investigated | 256 |
| Collision pairs investigated | 263 |
| Critical duplicate TCGdex ownership | 0 |
| Likely duplicate import rows | 154 |
| Same-card duplicate review | 27 |
| Same-number different-card ambiguity | 75 |
| Ambiguous collision review required | 0 |
| Candidates with user/market references | 2 |
| Recommended immediate writes | 0 |

Result: all 256 collision-blocked rows remain blocked from number-normalization writes. The collision lane is not a normalization problem first; it is an ownership/integrity investigation lane.

## Set Breakdown

| Set | Name | Blocked candidates | Class mix | Candidate user/market refs |
| --- | --- | --- | --- | --- |
| `me01` | Mega Evolution | 83 | LIKELY_DUPLICATE_IMPORT_ROW=83 | 6 |
| `svp` | Scarlet & Violet Black Star Promos | 72 | LIKELY_DUPLICATE_IMPORT_ROW=53; SAME_CARD_NUMBER_DUPLICATE_REVIEW=19 | 0 |
| `pl2` | Rising Rivals | 34 | SAME_CARD_NUMBER_DUPLICATE_REVIEW=2; SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=32 | 0 |
| `xy4` | Phantom Forces | 15 | LIKELY_DUPLICATE_IMPORT_ROW=15 | 0 |
| `pl4` | Arceus | 12 | LIKELY_DUPLICATE_IMPORT_ROW=3; SAME_CARD_NUMBER_DUPLICATE_REVIEW=3; SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=6 | 0 |
| `dp7` | Stormfront | 7 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=7 | 0 |
| `pl1` | Platinum | 7 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=7 | 0 |
| `pl3` | Supreme Victors | 7 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=7 | 0 |
| `bw11` | Legendary Treasures | 5 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=5 | 0 |
| `col1` | Call of Legends | 5 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=5 | 0 |
| `ex10` | Unseen Forces | 3 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=3 | 0 |
| `bw9` | Plasma Freeze | 2 | SAME_CARD_NUMBER_DUPLICATE_REVIEW=2 | 0 |
| `swsh4.5` | Shining Fates | 2 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=2 | 0 |
| `swsh2` | Rebel Clash | 1 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY=1 | 0 |
| `xy9` | BREAKpoint | 1 | SAME_CARD_NUMBER_DUPLICATE_REVIEW=1 | 0 |

## Collision Classes

- `CRITICAL_DUPLICATE_TCGDEX_OWNERSHIP`: candidate and existing row share the same TCGdex external id. Treat as source ownership corruption until proven otherwise.
- `LIKELY_DUPLICATE_IMPORT_ROW`: same normalized name and proposed number, candidate is TCGdex-only, and existing row has additional source ownership. Still no merge/delete without a separate ownership plan.
- `SAME_CARD_NUMBER_DUPLICATE_REVIEW`: same normalized name and proposed number, but source ownership does not prove an automatic winner.
- `SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY`: proposed number collides with a different normalized card name. This needs manual card identity review.
- `AMBIGUOUS_COLLISION_REVIEW_REQUIRED`: evidence is insufficient to classify more tightly.

## Highest-Risk Rows

| Set | Candidate | Number | Class | Refs | Colliding existing rows |
| --- | --- | --- | --- | --- | --- |
| `bw11` | Charmander | 17 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Charmander (17); Audino (RC17) |
| `bw11` | Serperior | 8 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Serperior (8); Ralts (RC8) |
| `bw11` | Swadloon | 11 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Swadloon (11); Meloetta-EX (RC11) |
| `bw11` | Tangrowth | 2 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Tangrowth (2); Servine (RC2) |
| `bw11` | Tepig | 25 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Tepig (25); Meloetta-EX (RC25) |
| `bw9` | Nidoran♀ | 40 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Nidoran ♀ (40) |
| `bw9` | Nidoran♂ | 43 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Nidoran ♂ (43) |
| `col1` | Clefable | 1 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Deoxys (SL1) |
| `col1` | Forretress | 5 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Ho-Oh (SL5) |
| `col1` | Groudon | 6 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Kyogre (SL6) |
| `col1` | Hitmontop | 8 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Palkia (SL8) |
| `col1` | Houndoom | 10 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Rayquaza (SL10) |
| `dp7` | Dusknoir | 96 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Dusknoir LV.X (96) |
| `dp7` | Empoleon | 2 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Duskull (SH2) |
| `dp7` | Heatran | 97 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Heatran LV.X (97) |
| `dp7` | Infernape | 3 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Voltorb (SH3) |
| `dp7` | Machamp | 98 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Machamp LV.X (98) |
| `dp7` | Raichu | 99 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Raichu LV.X (99) |
| `dp7` | Regigigas | 100 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Regigigas LV.X (100) |
| `ex10` | Entei Star | 113 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Entei ★ (113) |
| `ex10` | Raikou Star | 114 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Raikou ★ (114) |
| `ex10` | Suicune Star | 115 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Suicune ★ (115) |
| `me01` | Mega Camerupt ex | 22 | LIKELY_DUPLICATE_IMPORT_ROW | 3 | Mega Camerupt ex (22) |
| `me01` | Mega Lucario ex | 77 | LIKELY_DUPLICATE_IMPORT_ROW | 3 | Mega Lucario ex (77) |
| `pl1` | Dialga | 6 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Vulpix (SH6) |
| `pl1` | Dialga G | 122 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Dialga G LV.X (122) |
| `pl1` | Drapion | 123 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Drapion LV.X (123) |
| `pl1` | Giratina | 124 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Giratina LV.X (124) |
| `pl1` | Palkia G | 125 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Palkia G LV.X (125) |
| `pl1` | Shaymin | 127 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Shaymin LV.X (127) |
| `pl1` | Shaymin | 126 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Shaymin LV.X (126) |
| `pl2` | Alakazam 4 | 103 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Alakazam E4 LV.X (103) |
| `pl2` | Alakazam 4 | 38 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Alakazam E4 (38) |
| `pl2` | Arcanine | 1 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Fan Rotom (RT1) |
| `pl2` | Bronzong 4 | 16 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Bronzong E4 (16) |
| `pl2` | Darkrai G | 3 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Heat Rotom (RT3) |
| `pl2` | Drapion 4 | 17 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Drapion E4 (17) |
| `pl2` | Espeon 4 | 18 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Espeon E4 (18) |
| `pl2` | Flareon 4 | 60 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Flareon E4 (60) |
| `pl2` | Floatzel GL | 104 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Floatzel GL LV.X (104) |
| `pl2` | Flygon | 5 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Wash Rotom (RT5) |
| `pl2` | Flygon | 105 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Flygon LV.X (105) |
| `pl2` | Gallade 4 | 20 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Gallade E4 (20) |
| `pl2` | Gallade 4 | 106 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Gallade E4 LV.X (106) |
| `pl2` | Gliscor 4 | 62 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Gliscor E4 (62) |
| `pl2` | Golem 4 | 23 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Golem E4 (23) |
| `pl2` | Heracross 4 | 24 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Heracross E4 (24) |
| `pl2` | Hippowdon | 107 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Hippowdon LV.X (107) |
| `pl2` | Hippowdon 4 | 42 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Hippowdon E4 (42) |
| `pl2` | Houndoom 4 | 65 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Houndoom E4 (65) |
| `pl2` | Infernape 4 | 108 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Infernape E4 LV.X (108) |
| `pl2` | Infernape 4 | 43 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Infernape E4 (43) |
| `pl2` | Luxray GL | 109 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Luxray GL LV.X (109) |
| `pl2` | Mismagius GL | 110 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Mismagius GL LV.X (110) |
| `pl2` | Mr. Mime 4 | 28 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Mr. Mime E4 (28) |
| `pl2` | Nidoran♀ | 71 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Nidoran ♀ (71) |
| `pl2` | Nidoran♂ | 72 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Nidoran ♂ (72) |
| `pl2` | Rapidash 4 | 47 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Rapidash E4 (47) |
| `pl2` | Rhyperior 4 | 32 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Rhyperior E4 (32) |
| `pl2` | Scizor 4 | 48 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Scizor E4 (48) |
| `pl2` | Snorlax | 111 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Snorlax LV.X (111) |
| `pl2` | Team Galactic's Invention G-107 Technical Machine | 95 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Team Galactic's Invention G-107 Technical Machine G (95) |
| `pl2` | Vespiquen 4 | 35 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Vespiquen E4 (35) |
| `pl2` | Whiscash 4 | 54 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Whiscash E4 (54) |
| `pl2` | Yanmega 4 | 37 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Yanmega E4 (37) |
| `pl3` | Absol G | 141 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Absol G LV.X (141) |
| `pl3` | Blaziken FB | 142 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Blaziken FB LV.X (142) |
| `pl3` | Charizard G | 143 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Charizard G LV.X (143) |
| `pl3` | Electivire FB | 144 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Electivire FB LV.X (144) |
| `pl3` | Garchomp C | 145 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Garchomp C LV.X (145) |
| `pl3` | Rayquaza C | 146 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Rayquaza C LV.X (146) |
| `pl3` | Staraptor FB | 147 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Staraptor FB LV.X (147) |
| `pl4` | Arceus LV. X | 94 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Arceus LV.X (94) |
| `pl4` | Arceus LV. X | 96 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Arceus LV.X (96) |
| `pl4` | Arceus LV. X | 95 | SAME_CARD_NUMBER_DUPLICATE_REVIEW | 0 | Arceus LV.X (95) |
| `pl4` | Beedrill | 53 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Beedrill G (53) |
| `pl4` | Charizard | 1 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Arceus (AR1) |
| `pl4` | Mothim | 6 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Arceus (AR6) |
| `pl4` | Porygon-Z | 26 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Porygon-Z G (26) |
| `pl4` | Swalot | 9 | SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY | 0 | Arceus (AR9) |

Additional rows are in the JSON matrix. High-risk table is capped at 80 rows.

## Raw Import Evidence

No raw-import rows could be linked by external ID in this schema. The live `raw_imports` table has payload/status timing fields but no row-level `external_id` column, so source ownership conclusions rely on `card_prints.external_ids` and active mapping tables in this pass.

## Conclusions

- Do not include any of the 256 collision-blocked rows in a number-normalization write plan.
- The 248 clean Lane A rows remain the only possible future number-normalization write-plan lane.
- Collision rows need a separate duplicate/source-ownership investigation, likely by set, before any merge, deactivation, mapping transfer, or number update is considered.
- Rows with user, vault, shared, slab, pricing, or variant references need stricter ownership handling because deleting or merging them would have user-facing blast radius.
- Missing-card backfill must continue to treat these rows as blockers because they may already represent imported checklist coverage under duplicate rows.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No card movement.
- No set changes.
- No identity rewrites.
- No mapping movement.
- No missing-card backfill.
- No variant changes.
