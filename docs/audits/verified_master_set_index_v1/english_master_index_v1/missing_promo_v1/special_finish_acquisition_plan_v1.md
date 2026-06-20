# Special Finish Acquisition Plan V1

Read-only plan for the remaining childless special/stamped parent rows. This does not write to the database, create migrations, insert child printings, or promote any finish claims.

## Safety

| check | value |
| --- | --- |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| real_apply_performed | false |

## Summary

| metric | value |
| --- | --- |
| remaining_childless_special_parent_rows | 735 |
| ready_child_printing_rows_now | 0 |
| blocked_rows | 735 |
| rows_with_existing_evidence_urls | 142 |
| rows_without_existing_evidence_urls | 593 |

## Family Execution Plan

| priority | family | rows | with evidence | route | acceptance rule |
| --- | --- | --- | --- | --- | --- |
| 1 | wotc_stamp | 1 | 1 | wotc_stamp_exact_product | Exact WOTC stamp and active finish. |
| 2 | staff_stamp | 13 | 8 | bulbapedia_staff_plus_marketplace_exact_product | Exact staff/prerelease stamp and finish; no generic staff stamp without finish. |
| 2 | championship_stamp | 12 | 3 | bulbapedia_championship_plus_marketplace_exact_product | Exact City/State/National/Regional championship stamp plus active finish. |
| 2 | league_stamp | 16 | 1 | pokemon_league_exact_product | Exact League stamp and active finish. |
| 2 | other_variant_or_modifier | 4 | 1 | manual_variant_family_governance | Govern variant family before finish acquisition. |
| 3 | battle_road_stamp | 12 | 0 | battle_road_marketplace_exact_product | Exact Battle Road stamp and active finish. |
| 3 | winner_stamp | 9 | 0 | battle_road_winner_marketplace_exact_product | Exact Winner/Battle Road stamp and active finish. |
| 3 | worlds_stamp | 4 | 0 | world_championship_archive_exact_product | Exact Worlds stamp and active finish. |
| 4 | prerelease_stamp | 129 | 0 | bulbapedia_prerelease_plus_marketplace_exact_product | Exact set + card number + name + prerelease/staff stamp + active finish text. |
| 5 | other_stamp | 535 | 128 | variant_family_identification_first | First identify stamp family; then require exact finish evidence before child insert. |

## Recommended Next Move

- Do not build an apply package yet. Current ready child-printing count is zero.
- Start with the smallest/highest-signal lanes: WOTC stamp, Winner/Battle Road/Worlds, League, Championship, and Staff.
- For each row, require exact set + card number + card name + stamp/variant + active finish evidence.
- Marketplace/title-only evidence is review context unless it explicitly proves the exact finish.
- Generic stamp identity is not enough; exact finish evidence is required before child creation.

## First 40 Queue Rows

| priority | set | number | name | family | variant/modifier | first action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | base4 | 63 | Wartortle | wotc_stamp | wotc_stamp | extract_exact_finish_from_existing_sources |
| 2 | bw5 | 37 | Jolteon | championship_stamp | regional_championships_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 001 | Meganium | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 002 | Inteleon | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 003 | Alakazam | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 004 | Lunatone | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 014 | Ceruledge | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 015 | Zacian | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 016 | Flygon | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 017 | Toxtricity | staff_stamp | staff_stamp | extract_exact_finish_from_existing_sources |
| 2 | mep | 028 | Celebratory Fanfare | league_stamp | league_stamp | extract_exact_finish_from_existing_sources |
| 2 | sm6 | 105 | Diantha | championship_stamp | regional_championships_stamp | extract_exact_finish_from_existing_sources |
| 2 | swsh8 | 43 | Cinderace V | other_variant_or_modifier | battle_academy_deck_mark | extract_exact_finish_from_existing_sources |
| 2 | xy10 | 94 | Chaos Tower | championship_stamp | national_championships_stamp | extract_exact_finish_from_existing_sources |
| 2 | bw1 | 53 | Whirlipede | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bw1 | 79 | Watchog | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bw1 | 81 | Lillipup | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bw2 | 82 | Unfezant | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bw3 | 32 | Cryogonal | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bw8 | 120 | Escape Rope | league_stamp | league_stamp | find_two_exact_sources |
| 2 | bwp | 28 | Tropical Beach | staff_stamp | worlds_11_staff_stamp | find_two_exact_sources |
| 2 | dp3 | 106 | Shellos East Sea | staff_stamp | origins_game_fair_2008_staff_stamp | find_two_exact_sources |
| 2 | dp3 | 107 | Shellos West Sea | staff_stamp | sdcc_2007_staff_stamp | find_two_exact_sources |
| 2 | ex11 | 49 | Metang δ | other_variant_or_modifier | delta_species | find_two_exact_sources |
| 2 | ex13 | 41 | Exeggutor δ | other_variant_or_modifier | delta_species | find_two_exact_sources |
| 2 | ex15 | 28 | Dragonair δ | other_variant_or_modifier | delta_species | find_two_exact_sources |
| 2 | hgss1 | 39 | Delibird | league_stamp | league_stamp | find_two_exact_sources |
| 2 | np | 008 | Torchic | league_stamp | e_league_stamp | find_two_exact_sources |
| 2 | np | 010 | Mudkip | league_stamp | e_league_stamp | find_two_exact_sources |
| 2 | np | 022 | Beldum | league_stamp | e_league_stamp | find_two_exact_sources |
| 2 | np | 024 | Chimecho | league_stamp | e_league_stamp | find_two_exact_sources |
| 2 | np | 025 | Flygon | league_stamp | e_league_stamp | find_two_exact_sources |
| 2 | np | 036 | Tropical Tidal Wave | championship_stamp | 2006_world_championships_staff_stamp | find_two_exact_sources |
| 2 | sm1 | 135 | Ultra Ball | championship_stamp | oceania_championships_staff_stamp | find_two_exact_sources |
| 2 | sm4 | 95 | Gladion | championship_stamp | regional_championships_staff_stamp | find_two_exact_sources |
| 2 | sm5 | 119a | Cynthia | championship_stamp | regional_championships_stamp | find_two_exact_sources |
| 2 | sm6 | 102a | Beast Ring | league_stamp | league_stamp | find_two_exact_sources |
| 2 | sm6 | 105 | Diantha | championship_stamp | regional_championships_staff_stamp | find_two_exact_sources |
| 2 | smp | SM148 | Champions Festival | championship_stamp | world_championships_2018_staff_stamp | find_two_exact_sources |
| 2 | smp | SM158 | Charizard | staff_stamp | staff_stamp | find_two_exact_sources |

