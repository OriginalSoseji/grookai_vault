# English Master Index Post-Collexy Source Acquisition Queue V1

No-write acquisition queue for the remaining stamped/special rows.

## Summary

| metric | value |
| --- | ---: |
| acquisition_rows | 154 |
| source_targets_per_row | 7 |
| total_source_urls | 1078 |
| write_ready_now | 0 |

## Safety

- No DB writes.
- No migrations.
- No apply, cleanup, delete, parent insert, child insert, or identity insert.
- This queue is for source acquisition only.

## Acceptance Rule

Accept evidence only when one source proves set + card number + card name + exact stamp/variant + active finish on the same listing, page, checklist, or scan.

## First 40 Rows

| rank | set | number | card | stamp | blocker |
| ---: | --- | --- | --- | --- | --- |
| 1 | bw1 | 111 | Darkness Energy | Play! Pokemon Stamp | individual_event_scan_needed |
| 2 | col1 | 88 | Grass Energy | Player Rewards Crosshatch Stamp | individual_event_scan_needed |
| 3 | ex10 | 29 | Lugia | Pokemon Rocks America Stamped; 2005 | individual_event_scan_needed |
| 4 | ex11 | 61 | Ditto | Origins Game Fair Stamped; 200 | individual_event_scan_needed |
| 5 | ex11 | 64 | Ditto | Games Expo Stamped; 2007 | individual_event_scan_needed |
| 6 | ex12 | 5 | Gengar | Gym Challenge Stamped; 2006 2007 | individual_event_scan_needed |
| 7 | ex9 | 60 | Pikachu | San Diego Comic Con International Stamped; 2005 | individual_event_scan_needed |
| 8 | ex9 | 70 | Treecko | Indianapolis GenCon Stamped; 2005 | individual_event_scan_needed |
| 9 | hgss1 | 40 | Donphan | Player Rewards Crosshatch Stamp | individual_event_scan_needed |
| 10 | hgss2 | 24 | Steelix | Player Rewards Crosshatch Stamp | individual_event_scan_needed |
| 11 | me02 | 26 | Suicune | EB Games Stamp | individual_event_scan_needed |
| 12 | pl3 | 136 | Cynthia's Guidance | PokéBall Stamped, Player Rewards Promo; 2009 2010 | individual_event_scan_needed |
| 13 | sm10 | 129 | Melmetal | Unbroken Bonds Stamp | individual_event_scan_needed |
| 14 | sm8 | 59 | Suicune | Legendary PokéMon Stamp | individual_event_scan_needed |
| 15 | sm9 | 19 | Moltres | Team Up Stamp | individual_event_scan_needed |
| 16 | smp | SM86 | Pikachu | Alolan Raichu Half Deck 14 Stamp | individual_event_scan_needed |
| 17 | sv10 | 51 | Team Rocket's Articuno | Destined Rivals Stamp | individual_event_scan_needed |
| 18 | sv10 | 70 | Team Rocket's Zapdos | Destined Rivals Stamp | individual_event_scan_needed |
| 19 | swsh11 | 76 | Hisuian Zoroark | Lost Origin Stamp | individual_event_scan_needed |
| 20 | swsh12 | 131 | Dragonite | Silver Tempest Stamp | individual_event_scan_needed |
| 21 | swsh3 | 150 | Bunnelby | Play! PokéMon, Thank You Stamp | individual_event_scan_needed |
| 22 | swsh3 | 172 | Turbo Patch | Play! PokéMon, Thank You Stamp | individual_event_scan_needed |
| 23 | swsh3 | 36 | Galarian Mr. Rime | Play! PokéMon, Thank You Stamp | individual_event_scan_needed |
| 24 | swsh3 | 78 | Dedenne | Play! PokéMon, Thank You Stamp | individual_event_scan_needed |
| 25 | swsh3 | 83 | Polteageist | Play! PokéMon, Thank You Stamp | individual_event_scan_needed |
| 26 | swsh4 | 131 | Snorlax | Vivid Voltage Stamp | individual_event_scan_needed |
| 27 | swsh5 | 82 | Sandaconda | EB Games Stamp | individual_event_scan_needed |
| 28 | xy6 | 20 | Pikachu | McDonald's Stamp | individual_event_scan_needed |
| 29 | bw10 | 5 | Tropius | League Stamp | exact_finish_binding_missing |
| 30 | bw11 | 97 | Deino | League Stamp | exact_finish_binding_missing |
| 31 | bw7 | 38 | Delibird | League Stamp | exact_finish_binding_missing |
| 32 | dp1 | 3 | Electivire | League Stamp | exact_finish_binding_missing |
| 33 | dp1 | 7 | Luxray | League Stamp | exact_finish_binding_missing |
| 34 | ex12 | 6 | Golem | League Stamp | exact_finish_binding_missing |
| 35 | ex14 | 14 | Blastoise | League Stamp | exact_finish_binding_missing |
| 36 | ex5 | 9 | Machamp | League Stamp | exact_finish_binding_missing |
| 37 | ex8 | 16 | Deoxys | League Stamp | exact_finish_binding_missing |
| 38 | ex8 | 22 | Rayquaza | League Stamp | exact_finish_binding_missing |
| 39 | ex9 | 3 | Exploud | League Stamp | exact_finish_binding_missing |
| 40 | hgss2 | 7 | Politoed | League Stamp | exact_finish_binding_missing |

CSV: `docs\audits\verified_master_set_index_v1\english_master_index_v1\english_master_index_post_collexy_source_acquisition_queue_v1.csv`

Fingerprint: `87d55e14d70e6335096fd2271c8c7cdaaf3f9f193297ae0fed57b79e5b6aefe0`
