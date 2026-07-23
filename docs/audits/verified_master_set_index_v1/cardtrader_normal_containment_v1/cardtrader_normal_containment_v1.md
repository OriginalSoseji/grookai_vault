# CardTrader Normal Containment V1

Generated: 2026-07-23T02:09:42.255Z

Status: **fail_closed_rebuild_and_review_required**

Read-only audit. No database writes, migrations, automatic deletions, public hiding, or deployment occurred.

## Outcome

The legacy CardTrader fixture corpus contains no explicit Normal or Non-Holo descriptors. Every stored Normal was inferred from an unqualified rarity or product label. The repaired loader now fail-closes those rows to unknown finish, but the checked-in Master Index predates that repair and must be rebuilt and reviewed.

This audit does not claim that every affected Normal printing is physically false. It proves that CardTrader cannot serve as its finish evidence. ME04 is the bounded confirmed-false cohort; the remaining facts require reclassification or independent evidence.

## Summary

| metric | count |
| --- | --- |
| fixture files scanned | 80 |
| fixture records scanned | 1297 |
| raw Normal records | 1206 |
| explicit Normal / Non-Holo records | 0 |
| unqualified inferred Normal records | 1206 |
| canonical contaminated Normal facts | 1099 |
| canonical sets affected | 58 |
| alias duplicate occurrences collapsed | 107 |
| current Master Index matches | 1099 |
| confirmed false ME04 Normals | 45 |

## Current Master Source Combinations

| sources | facts |
| --- | --- |
| cardtrader_blueprint_index + tcgdex | 1095 |
| cardtrader_blueprint_index + pokemontcg_api | 2 |
| cardtrader_blueprint_index | 1 |
| cardtrader_blueprint_index + thepricedex_price_list | 1 |

## Projected Status After Rebuild

| status | facts |
| --- | --- |
| candidate_unconfirmed | 1052 |
| suppressed_reviewed | 45 |
| human_source_verified | 1 |
| no_qualified_finish_evidence | 1 |

## Required Dispositions

| disposition | facts |
| --- | --- |
| human_checklist_reverification_required | 1052 |
| confirmed_false_suppression | 45 |
| independent_verification_required | 1 |
| second_authority_required | 1 |

## Invariant Checks

| check | expected | actual | result |
| --- | --- | --- | --- |
| normal_records_are_partitioned | 1206 | 1206 | PASS |
| canonicalization_only_collapses_alias_occurrences | 1206 | 1206 | PASS |
| every_unqualified_normal_is_fail_closed_by_loader | 1099 | 1099 | PASS |
| every_contaminated_fact_is_located_in_current_master_index | 1099 | 1099 | PASS |
| every_current_match_carries_cardtrader_evidence | 1099 | 1099 | PASS |
| me04_confirmed_false_normal_cohort_is_exact | 45 | 45 | PASS |

## Affected Sets

| set_key | set_name | facts | fixture_rows | alias_dupes | confirmed_false | candidate | human_only | no_evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sma | Hidden Fates Shiny Vault | 94 | 94 | 0 | 0 | 94 | 0 | 0 |
| sm12 | Cosmic Eclipse | 77 | 77 | 0 | 0 | 77 | 0 | 0 |
| sm11 | Unified Minds | 61 | 61 | 0 | 0 | 61 | 0 | 0 |
| sm10 | Unbroken Bonds | 58 | 58 | 0 | 0 | 58 | 0 | 0 |
| sm8 | Lost Thunder | 54 | 54 | 0 | 0 | 54 | 0 | 0 |
| sm3 | Burning Shadows | 53 | 53 | 0 | 0 | 53 | 0 | 0 |
| sm2 | Guardians Rising | 51 | 51 | 0 | 0 | 51 | 0 | 0 |
| sm9 | Team Up | 49 | 49 | 0 | 0 | 49 | 0 | 0 |
| me04 | Chaos Rising | 45 | 90 | 45 | 45 | 0 | 0 | 0 |
| sm7 | Celestial Storm | 43 | 43 | 0 | 0 | 43 | 0 | 0 |
| sm5 | Ultra Prism | 40 | 40 | 0 | 0 | 40 | 0 | 0 |
| sm1 | Sun & Moon | 37 | 37 | 0 | 0 | 37 | 0 | 0 |
| sm6 | Forbidden Light | 35 | 35 | 0 | 0 | 35 | 0 | 0 |
| sm4 | Crimson Invasion | 32 | 32 | 0 | 0 | 32 | 0 | 0 |
| swsh4.5 | Shining Fates | 25 | 50 | 25 | 0 | 25 | 0 | 0 |
| xy5 | Primal Clash | 20 | 20 | 0 | 0 | 20 | 0 | 0 |
| sm7.5 | Dragon Majesty | 19 | 38 | 19 | 0 | 19 | 0 | 0 |
| sm3.5 | Shining Legends | 17 | 34 | 17 | 0 | 17 | 0 | 0 |
| xy10 | Fates Collide | 15 | 15 | 0 | 0 | 15 | 0 | 0 |
| xy7 | Ancient Origins | 15 | 15 | 0 | 0 | 15 | 0 | 0 |
| bw11 | Legendary Treasures | 14 | 14 | 0 | 0 | 14 | 0 | 0 |
| bw9 | Plasma Freeze | 14 | 14 | 0 | 0 | 14 | 0 | 0 |
| sm115 | Hidden Fates | 13 | 13 | 0 | 0 | 13 | 0 | 0 |
| swsh8 | Fusion Strike | 13 | 13 | 0 | 0 | 13 | 0 | 0 |
| xy6 | Roaring Skies | 13 | 13 | 0 | 0 | 13 | 0 | 0 |
| bw8 | Plasma Storm | 12 | 12 | 0 | 0 | 12 | 0 | 0 |
| xy8 | BREAKthrough | 12 | 12 | 0 | 0 | 12 | 0 | 0 |
| col1 | Call of Legends | 11 | 11 | 0 | 0 | 11 | 0 | 0 |
| bw10 | Plasma Blast | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| bw4 | Next Destinies | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| bw6 | Dragons Exalted | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| bw7 | Boundaries Crossed | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| xy11 | Steam Siege | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| xy2 | Flashfire | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| xy3 | Furious Fists | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| xy4 | Phantom Forces | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| bw5 | Dark Explorers | 9 | 9 | 0 | 0 | 9 | 0 | 0 |
| xy1 | XY | 9 | 9 | 0 | 0 | 9 | 0 | 0 |
| xy12 | Evolutions | 9 | 9 | 0 | 0 | 9 | 0 | 0 |
| xy9 | BREAKpoint | 9 | 9 | 0 | 0 | 9 | 0 | 0 |
| neo4 | Neo Destiny | 8 | 8 | 0 | 0 | 8 | 0 | 0 |
| bw3 | Noble Victories | 6 | 6 | 0 | 0 | 6 | 0 | 0 |
| bw1 | Black & White | 3 | 3 | 0 | 0 | 3 | 0 | 0 |
| ecard2 | Aquapolis | 3 | 3 | 0 | 0 | 3 | 0 | 0 |
| ex3 | Dragon | 3 | 3 | 0 | 0 | 3 | 0 | 0 |
| bw2 | Emerging Powers | 2 | 2 | 0 | 0 | 2 | 0 | 0 |
| dc1 | Double Crisis | 2 | 2 | 0 | 0 | 2 | 0 | 0 |
| ex4 | Team Magma vs Team Aqua | 2 | 2 | 0 | 0 | 2 | 0 | 0 |
| neo3 | Neo Revelation | 2 | 2 | 0 | 0 | 2 | 0 | 0 |
| swsh7 | Evolving Skies | 2 | 2 | 0 | 0 | 1 | 1 | 0 |
| base5 | Team Rocket | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| ex6 | FireRed & LeafGreen | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| ex9 | Emerald | 1 | 1 | 0 | 0 | 0 | 0 | 1 |
| hgss1 | HeartGold & SoulSilver | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| hgss2 | HS—Unleashed | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| hgss3 | HS—Undaunted | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| sv08.5 | Prismatic Evolutions | 1 | 2 | 1 | 0 | 1 | 0 | 0 |
| swshp | SWSH Black Star Promos | 1 | 1 | 0 | 0 | 1 | 0 | 0 |

## Confirmed False ME04 Normal Facts

| set_key | number | card | finish |
| --- | --- | --- | --- |
| me04 | 003 | Beedrill ex | normal |
| me04 | 015 | Mega Pyroar ex | normal |
| me04 | 022 | Mega Greninja ex | normal |
| me04 | 035 | Mega Floette ex | normal |
| me04 | 041 | Gourgeist ex | normal |
| me04 | 048 | Mega Gallade ex | normal |
| me04 | 055 | Krookodile ex | normal |
| me04 | 064 | Cobalion ex | normal |
| me04 | 065 | Mega Dragalge ex | normal |
| me04 | 073 | Cinccino ex | normal |
| me04 | 087 | Chespin | normal |
| me04 | 088 | Froakie | normal |
| me04 | 089 | Frogadier | normal |
| me04 | 090 | Ampharos | normal |
| me04 | 091 | Xerneas | normal |
| me04 | 092 | Claydol | normal |
| me04 | 093 | Crobat | normal |
| me04 | 094 | Metang | normal |
| me04 | 095 | Sliggoo | normal |
| me04 | 096 | Tauros | normal |
| me04 | 097 | Watchog | normal |
| me04 | 098 | Beedrill ex | normal |
| me04 | 099 | Mega Pyroar ex | normal |
| me04 | 100 | Mega Greninja ex | normal |
| me04 | 101 | Mega Floette ex | normal |
| me04 | 102 | Gourgeist ex | normal |
| me04 | 103 | Cobalion ex | normal |
| me04 | 104 | Mega Dragalge ex | normal |
| me04 | 105 | Cinccino ex | normal |
| me04 | 106 | AZ's Tranquility | normal |
| me04 | 107 | Emma | normal |
| me04 | 108 | Energy Retrieval | normal |
| me04 | 110 | Philippe | normal |
| me04 | 111 | Prism Tower | normal |
| me04 | 112 | Roxie's Performance | normal |
| me04 | 113 | Special Red Card | normal |
| me04 | 114 | Surfing Beach | normal |
| me04 | 115 | Tool Scrapper | normal |
| me04 | 116 | Mega Greninja ex | normal |
| me04 | 117 | Mega Floette ex | normal |
| me04 | 118 | Mega Dragalge ex | normal |
| me04 | 119 | Cinccino ex | normal |
| me04 | 120 | AZ's Tranquility | normal |
| me04 | 121 | Roxie's Performance | normal |
| me04 | 122 | Mega Greninja ex | normal |

## No Remaining Qualified Finish Evidence

| set_key | number | card | current_status | current_sources |
| --- | --- | --- | --- | --- |
| ex9 | 107 | Farfetch'd | human_source_verified | cardtrader_blueprint_index |

## Safety Boundary And Next Gate

1. Rebuild the Master Index in an isolated output directory with the repaired loader.
2. Diff all 1,099 facts by exact canonical identity and projected status.
3. Keep the 45 ME04 false Normals suppressed by reviewed exact-fact governance.
4. Send the remaining facts through set-scoped source replacement; do not bulk-delete them.
5. Produce a precommit plan and live dependency readback before any production mutation.

The complete 1099-fact ledger, fixture occurrence traceability, evidence URLs, aliases, and dispositions are in cardtrader_normal_containment_v1.json.
