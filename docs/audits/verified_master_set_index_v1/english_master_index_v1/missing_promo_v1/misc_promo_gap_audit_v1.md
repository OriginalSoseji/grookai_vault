# Misc Promo Gap Audit V1

Read-only audit for miscellaneous promotional and special-case card completeness.

## Guardrails

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- Ancient Mew inserted: live status checked by DB query

## Source URLs

- bulbapedia_misc_1999_2008: https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29/1999-2008
- bulbapedia_ancient_mew: https://bulbapedia.bulbagarden.net/wiki/Ancient_Mew_%28The_Power_of_One_promo%29
- pkmncards_misc: https://pkmncards.com/set/miscellaneous/
- tcgplayer_ancient_mew: https://www.tcgplayer.com/product/108589/pokemon-miscellaneous-cards-and-products-ancient-mew

## High-Signal Candidate Status

| candidate | card | expected lane | variant/modifier | finish | status | db matches |
| --- | --- | --- | --- | --- | --- | --- |
| ancient_mew_movie_2000 | Ancient Mew | misc | base | cosmos | present_with_expected_child_printing | 1 |
| jungle_meowth_gold_border | Meowth | base2 | gold_border | normal | present_with_expected_child_printing | 1 |
| expedition_hoppip_japanese_back | Hoppip | ecard1 | japanese_card_back | normal | present_with_expected_child_printing | 1 |
| expedition_pichu_japanese_back | Pichu | ecard1 | japanese_card_back | normal | present_with_expected_child_printing | 1 |
| base_pikachu_e3_stamp | Pikachu | base1 | e3_stamp | normal | present_with_expected_child_printing | 1 |
| basep_rapidash_pcny_stamp | Rapidash | basep | pokemon_center_ny_stamp | normal | present_with_expected_child_printing | 1 |
| basep_ho_oh_pcny_stamp | Ho-oh | basep | pokemon_center_ny_stamp | normal | present_with_expected_child_printing | 1 |
| ex3_charmander_city_championships | Charmander | ex3 | city_championships_stamp | holo | present_with_expected_child_printing | 1 |
| ex3_charmeleon_state_championships | Charmeleon | ex3 | state_championships_stamp | holo | present_with_expected_child_printing | 1 |
| ex3_charizard_national_championships | Charizard | ex3 | national_championships_stamp | holo | present_with_expected_child_printing | 1 |

## Childless Special Parent Rows

Special/stamped parent rows with no child printing rows: 725

### By Family

| family | rows |
| --- | --- |
| other_stamp | 535 |
| prerelease_stamp | 129 |
| staff_stamp | 13 |
| battle_road_stamp | 12 |
| championship_stamp | 11 |
| winner_stamp | 9 |
| league_stamp | 7 |
| other_variant_or_modifier | 4 |
| worlds_stamp | 4 |
| wotc_stamp | 1 |

### By Set

| set | rows |
| --- | --- |
| smp | 97 |
| swsh10 | 38 |
| swsh9 | 36 |
| swsh11 | 33 |
| sv05 | 32 |
| me01 | 29 |
| swsh8 | 29 |
| bwp | 28 |
| swsh12 | 28 |
| sv10 | 26 |
| sv04 | 24 |
| sv06 | 24 |
| sv02 | 22 |
| swsh6 | 20 |
| sv07 | 19 |

## Recommended Next Steps

1. Treat already-applied high-signal candidates as closed only when live DB status is present_with_expected_child_printing.
2. Build child-printing readiness for already-present special/stamped parents with zero child rows.
3. Continue exact finish evidence acquisition for remaining childless special parents.
4. Keep jumbo-only items deprioritized unless collector policy changes.
