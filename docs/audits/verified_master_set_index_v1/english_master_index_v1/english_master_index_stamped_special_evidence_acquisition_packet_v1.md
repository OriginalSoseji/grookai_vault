# Stamped/Special Evidence Acquisition Packet V1

Audit-only acquisition packet for the remaining stamped/special blocker rows.

## Summary

| metric | value |
| --- | --- |
| rows_in_packet | 171 |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| fingerprint_sha256 | `683daa70a40d0c680833483c2ac7644d4e7ae07b0f5001e3ce5b8ee889c258a1` |

## Priority Order

| rank | bucket | rows | why this is next | evidence required |
| --- | --- | --- | --- | --- |
| 1 | league_finish_exact_source | 56 | Largest evidence-blocked bucket; many rows already have variant evidence but lack exact finish binding. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 2 | small_custom_stamp_exact_source | 31 | Good candidate for exact collector-reference pages or scans; lower row count but likely high collector value. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 3 | prize_pack_second_source | 35 | High-value modern stamp lane; requires second-source confirmation instead of broad Prize Pack assumptions. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 4 | event_staff_exact_source | 19 | High collector-significance event/staff lane; needs exact event and finish proof. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 5 | second_source_needed | 10 | Closest to promotion after a second independent exact source is found. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 6 | prerelease_exact_finish_source | 10 | Known stamp family, but exact finish evidence is still required. | Exact set + card number + card name + stamp/variant + finish + source URL. |
| 7 | professor_program_exact_finish_source | 10 | Specific program stamp lane; exact finish proof required. | Exact set + card number + card name + stamp/variant + finish + source URL. |

## Top Sets To Search

| set | rows |
| --- | --- |
| swsh1 | 11 |
| swshp | 11 |
| swsh5 | 8 |
| sv10 | 7 |
| swsh3 | 7 |
| bw5 | 5 |
| swsh2 | 5 |
| bw1 | 4 |
| dp1 | 4 |
| sm8 | 4 |

## Top Variants To Search

| variant | rows |
| --- | --- |
| league_stamp | 48 |
| prize_pack_stamp | 35 |
| prerelease_stamp | 10 |
| professor_program_stamp | 10 |
| league_cup_staff_stamp | 8 |
| staff_stamp | 6 |
| play_pok_mon_thank_you_stamp | 5 |
| player_rewards_crosshatch_stamp | 4 |
| eb_games_stamp | 3 |
| finalist_stamp | 3 |

## First 40 Search Targets

| rank | bucket | set | number | card | stamp | query |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | league_finish_exact_source | bw10 | 5 | Tropius | League Stamp | "Tropius" "5" "Plasma Blast" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw11 | 97 | Deino | League Stamp | "Deino" "97" "Legendary Treasures" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw3 | 8 | Karrablast | League Stamp | "Karrablast" "8" "Noble Victories" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw3 | 11 | Shelmet | League Stamp | "Shelmet" "11" "Noble Victories" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw5 | 4 | Scyther | League Stamp | "Scyther" "4" "Dark Explorers" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw5 | 12 | Flareon | League Stamp | "Flareon" "12" "Dark Explorers" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw7 | 38 | Delibird | League Stamp | "Delibird" "38" "Boundaries Crossed" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw8 | 118 | Colress | League Stamp | "Colress" "118" "Plasma Storm" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw8 | 123 | Hypnotoxic Laser | League Stamp | "Hypnotoxic Laser" "123" "Plasma Storm" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw9 | 11 | Leafeon | League Stamp | "Leafeon" "11" "Plasma Freeze" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | bw9 | 23 | Glaceon | League Stamp | "Glaceon" "23" "Plasma Freeze" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | dp1 | 3 | Electivire | League Stamp | "Electivire" "3" "Diamond & Pearl" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | dp1 | 7 | Luxray | League Stamp | "Luxray" "7" "Diamond & Pearl" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex12 | 6 | Golem | League Stamp | "Golem" "6" "Legend Maker" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex14 | 14 | Blastoise | League Stamp | "Blastoise" "14" "Crystal Guardians" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex5 | 9 | Machamp | League Stamp | "Machamp" "9" "Hidden Legends" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex8 | 16 | Deoxys | League Stamp | "Deoxys" "16" "Deoxys" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex8 | 22 | Rayquaza | League Stamp | "Rayquaza" "22" "Deoxys" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | ex9 | 3 | Exploud | League Stamp | "Exploud" "3" "Emerald" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | hgss2 | 7 | Politoed | League Stamp | "Politoed" "7" "HS—Unleashed" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | hgss3 | 79 | Darkness Energy | League Stamp | "Darkness Energy" "79" "HS—Undaunted" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | hgss3 | 80 | Metal Energy | League Stamp | "Metal Energy" "80" "HS—Undaunted" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | hgss4 | 85 | Black Belt | League Stamp | "Black Belt" "85" "HS—Triumphant" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | hgss4 | 88 | Seeker | League Stamp | "Seeker" "88" "HS—Triumphant" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | pl2 | 96 | Team Galactic's Invention G-109 SP Radar | League Stamp | "Team Galactic's Invention G-109 SP Radar" "96" "Rising Rivals" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | pl3 | 5 | Garchomp | League Stamp | "Garchomp" "5" "Supreme Victors" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm1 | 20 | Tsareena | League Stamp | "Tsareena" "20" "Sun & Moon" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm1 | 123 | Nest Ball | League Cup Staff Stamp | "Nest Ball" "123" "Sun & Moon" "League Cup Staff Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm2 | 55 | Oricorio | League Stamp | "Oricorio" "55" "Guardians Rising" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm2 | 119 | Aqua Patch | League Cup Staff Stamp | "Aqua Patch" "119" "Guardians Rising" "League Cup Staff Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm3 | 41 | Raichu | League Stamp | "Raichu" "41" "Burning Shadows" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm3 | 113 | Bodybuilding Dumbbells | League Cup Staff Stamp | "Bodybuilding Dumbbells" "113" "Burning Shadows" "League Cup Staff Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm4 | 91 | Counter Catcher | League Cup Staff Stamp | "Counter Catcher" "91" "Crimson Invasion" "League Cup Staff Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm5 | 83 | Magnezone | League Stamp | "Magnezone" "83" "Ultra Prism" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm5 | 122 | Escape Board | League Cup Staff Stamp | "Escape Board" "122" "Ultra Prism" "League Cup Staff Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm7 | 24 | Magcargo | League Stamp | "Magcargo" "24" "Celestial Storm" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm7 | 142 | Rare Candy | League Stamp | "Rare Candy" "142" "Celestial Storm" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm7 | 145 | Steven's Resolve | League Stamp | "Steven's Resolve" "145" "Celestial Storm" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm8 | 82 | Zebstrika | League Stamp | "Zebstrika" "82" "Lost Thunder" "League Stamp" Pokemon card finish |
| 1 | league_finish_exact_source | sm8 | 172 | Electropower | League Cup Staff Stamp | "Electropower" "172" "Lost Thunder" "League Cup Staff Stamp" Pokemon card finish |

## Guardrails

- No DB writes.
- No migrations.
- No parent inserts.
- No child inserts.
- No generic stamped promotion.
- No single-source promotion where second-source evidence is required.
- No finish inference from broad stamp family or era assumptions.
