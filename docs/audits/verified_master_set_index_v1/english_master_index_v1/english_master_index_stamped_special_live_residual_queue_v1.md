# English Master Index Stamped/Special Live Residual Queue V1

Generated: 2026-06-22T17:11:49.169Z

This report reconciles the artifact queue against the live DB after recent stamped/special packages. It is read-only and exists to avoid repeating already-satisfied rows.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Summary

- source_queue_rows: 567
- live_satisfied_rows: 290
- remaining_open_rows: 277
- remaining_write_possible_rows: 177
- remaining_no_write_or_blocked_rows: 100

## Remaining By Bucket

| bucket | count |
| --- | --- |
| bucket_05_variant_family_source_acquisition_bulk | 132 |
| bucket_02_no_printing_write_battle_academy_display_metadata | 57 |
| bucket_04_prize_pack_finish_mapping_bulk | 35 |
| bucket_03a_base_parent_closed_stale_no_write | 19 |
| bucket_01_no_write_generic_stamped_suppression | 15 |
| bucket_06_second_source_acquisition_bulk | 10 |
| bucket_03b_base_parent_blocked_no_write | 9 |

## Remaining By Variant Family

| family | count |
| --- | --- |
| battle_academy | 62 |
| league | 57 |
| prize_pack | 40 |
| small_custom_stamp | 27 |
| championship_or_staff | 26 |
| generic_or_unknown | 23 |
| professor_program | 17 |
| prerelease | 11 |
| halloween | 9 |
| player_rewards_crosshatch | 5 |

## Recommended Next Lanes

| lane | open rows | reason | next action |
| --- | --- | --- | --- |
| league_exact_finish_source | 57 | Largest remaining active-finish source lane after no-write/display-only rows. | Acquire exact set+number+name+League Stamp+finish evidence before building a write package. |
| prize_pack_finish_mapping | 40 | Official PDFs and PriceCharting helped, but remaining rows need exact finish mapping. | Continue Prize Pack source acquisition; do not infer Standard Set/Foil labels. |
| championship_staff_exact_finish_source | 26 | High collector value and meaningful stamped identities. | Acquire event/staff source evidence with exact active finish. |

## Sample Open Write-Possible Rows

| set | number | card | stamp | finish | bucket |
| --- | --- | --- | --- | --- | --- |
| ex4 | 24 | Team Aqua's Cacnea | Prerelease Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex5 | 9 | Machamp | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex6 | 98 | Prof. Oak's Research | Professor Program Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex8 | 16 | Deoxys | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex8 | 22 | Rayquaza | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex9 | 3 | Exploud | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex9 | 60 | Pikachu | San Diego Comic Con International Stamped; 2005 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex9 | 70 | Treecko | Indianapolis GenCon Stamped; 2005 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex10 | 29 | Lugia | Pokemon Rocks America Stamped; 2005 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex11 | 61 | Ditto | Origins Game Fair Stamped; 200 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex11 | 64 | Ditto | Games Expo Stamped; 2007 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex12 | 5 | Gengar | Gym Challenge Stamped; 2006 2007 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex12 | 6 | Golem | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex14 | 14 | Blastoise | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| ex15 | 79 | Professor Elm's Training Method | Professor Program Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dp1 | 3 | Electivire | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dp1 | 7 | Luxray | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dpp | DP25 | Tropical Wind | Finalist Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dp3 | 122 | Professor Oak's Visit | Professor Program Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dp6 | 2 | Dragonite | Staff Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| dp6 | 130 | Buck's Training | Staff Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| pl2 | 96 | Team Galactic's Invention G-109 SP Radar | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| pl3 | 5 | Garchomp | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| pl3 | 136 | Cynthia's Guidance | PokéBall Stamped, Player Rewards Promo; 2009 2010 | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss1 | 40 | Donphan | Player Rewards Crosshatch Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss1 | 100 | Professor Elm's Training Method | Professor Program Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss2 | 7 | Politoed | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss2 | 24 | Steelix | Player Rewards Crosshatch Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss3 | 79 | Darkness Energy | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss3 | 80 | Metal Energy | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss4 | 85 | Black Belt | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| hgss4 | 88 | Seeker | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| col1 | 88 | Grass Energy | Player Rewards Crosshatch Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bwp | BW50 | Tropical Beach | Finalist Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bwp | BW75 | Metagross | Prerelease Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bwp | BW95 | Champions Festival | Quarter Finalist Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw1 | 15 | Tepig | Player Rewards Crosshatch Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw1 | 105 | Grass Energy | Play! Pokemon Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw1 | 106 | Fire Energy | Play! Pokemon Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw1 | 111 | Darkness Energy | Play! Pokemon Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw2 | 95 | Pokémon Catcher | Prize Pack Stamp | (needs finish) | bucket_04_prize_pack_finish_mapping_bulk |
| bw3 | 8 | Karrablast | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw3 | 11 | Shelmet | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw5 | 4 | Scyther | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw5 | 12 | Flareon | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw7 | 38 | Delibird | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw8 | 118 | Colress | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw8 | 123 | Hypnotoxic Laser | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw9 | 11 | Leafeon | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
| bw9 | 23 | Glaceon | League Stamp | (needs finish) | bucket_05_variant_family_source_acquisition_bulk |
