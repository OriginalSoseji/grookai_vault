# CAMEO_SEARCH_V1 Phase 3 Set Alias Replay Dry Run

Date: 2026-05-20

## Scope

No-write deterministic card matching replay for only the source rows classified as `SOURCE_ROW_READY_FOR_CARD_MATCH_DRY_RUN` in Phase 1, with source-owned set aliases loaded from the Phase 3 alias file.

## Alias File

- Path: `data\cameo_search_v1\source_set_aliases_v1.json`
- Hash: `b6e1d8df6c74530c218d46cd459fdf13f6828563c7aab2fe616c4b492910940f`
- Active aliases: 11
- Intentionally unmapped aliases: 7

## Summary

- Source rows loaded: 3875
- Match-ready rows evaluated: 2393
- Approved matches: 1360
- Ambiguous card matches: 47
- Set alias missing: 396
- Card not found: 44
- Manual review: 546
- Approved lift vs Phase 2: 106
- Set-alias-missing reduction vs Phase 2: 168
- Card-not-found delta vs Phase 2: 32
- Ambiguous-card delta vs Phase 2: 30

## Classification Counts

| Classification | Rows |
| --- | ---: |
| APPROVED_MATCH | 1360 |
| NEEDS_MANUAL_REVIEW | 546 |
| BLOCKED_SET_ALIAS_MISSING | 396 |
| BLOCKED_CARD_NOT_FOUND | 44 |
| BLOCKED_AMBIGUOUS_CARD | 47 |

## Top Missing Set Aliases

| Source set | Rows |
| --- | ---: |
| SM-P Promos | 98 |
| SV Promos | 57 |
| XY-P Promos | 44 |
| SV-P Promos | 34 |
| S-P Promos | 27 |
| Ash vs Team Rocket | 18 |
| Chaos Rising | 13 |
| DPt-P Promos | 13 |
| BW-P Promos | 11 |
| PCG-P Promos | 11 |
| Movie Commemoration Random Pack | 9 |
| P Promos | 7 |
| T Promos | 7 |
| L-P Promos | 6 |
| Movie Random Pack | 4 |
| VS: Sky-Splitting Deoxys | 4 |
| ADV-P Promos | 3 |
| PokéPark Forest | 3 |
| Start Deck 100 CoroCiao Version | 3 |
| Tag All Stars | 3 |
| VS | 3 |
| 2023 World Championship Deck | 2 |
| EX Battle Boost | 2 |
| Gem Pack Vol. 1 | 2 |
| Movie Commemoration VS Pack | 2 |
| Theatre VS Pack | 2 |
| Gem Pack Vol. 5 | 1 |
| GG End | 1 |
| Great Detective Pikachu | 1 |
| McDonald's Minimum Pack | 1 |

## Top Card-Not-Found Sets

| Source set | Rows |
| --- | ---: |
| MEP Promos | 32 |
| Platinum | 5 |
| SM Promos | 2 |
| Forbidden Light | 1 |
| Paldea Evolved | 1 |
| Perfect Order | 1 |
| Primal Clash | 1 |
| SWSH Promos | 1 |

## Sample Approved Matches

| Source tab/row | Cameo | Source card | Matched GV-ID |
| --- | --- | --- | --- |
| Gen 1:3 | Bulbasaur | Town Volunteers Aquapolis #136 | GV-PK-AQ-136 |
| Gen 1:4 | Bulbasaur | Venture Bomb Team Rocket Returns #93 | GV-PK-TRR-93 |
| Gen 1:5 | Bulbasaur | Rattata Pokémon Rumble #15 | GV-PK-RU-15 |
| Gen 1:12 | Bulbasaur | Ditto Delta Species #36 | GV-PK-DS-36 |
| Gen 1:13 | Bulbasaur | Team Rocket's Meowth Wizards Promos #18 | GV-PK-PR-18 |
| Gen 1:15 | Bulbasaur | Champions Festival SM Promos #231 | GV-PK-SM-SM231 |
| Gen 1:16 | Ivysaur | Togepi Southern Islands #4 | GV-PK-SI-4 |
| Gen 1:17 | Ivysaur | Raticate Southern Islands #6 | GV-PK-SI-6 |
| Gen 1:22 | Venusaur | Charizard V Brilliant Stars #154 | GV-PK-BRS-154 |
| Gen 1:23 | Venusaur | Charizard V SWSH Promos #260 | GV-PK-PR-SW-SWSH260 |
| Gen 1:27 | Mega Venusaur | Venusaur Spirit Link Evolutions #89 | GV-PK-EVO-89 |
| Gen 1:30 | Charmander | Weakness Guard Aquapolis #141 | GV-PK-AQ-141 |
| Gen 1:38 | Charmander | Ditto Delta Species #37 | GV-PK-DS-37 |
| Gen 1:39 | Charmander | Ditto Delta Species #61 | GV-PK-DS-61 |
| Gen 1:41 | Charmander | Champions Festival SM Promos #231 | GV-PK-SM-SM231 |
| Gen 1:42 | Charmeleon | Swablu Legendary Treasures #103 | GV-PK-LTR-103 |
| Gen 1:44 | Charizard | Mew Southern Islands #1 | GV-PK-SI-1 |
| Gen 1:46 | Charizard | Lucky Stadium Wizards Promos #41 | GV-PK-PR-41 |
| Gen 1:47 | Charizard | Special Delivery Bidoof SWSH Promos #177 | GV-PK-PR-SW-SWSH177 |
| Gen 1:56 | Charizard | Team Rocket's Meowth Wizards Promos #18 | GV-PK-PR-18 |
| Gen 1:61 | Mega Charizard X | Charizard Spirit Link Evolutions #75 | GV-PK-EVO-75 |
| Gen 1:63 | Mega Charizard Y | Charizard Spirit Link Evolutions #75 | GV-PK-EVO-75 |
| Gen 1:70 | Squirtle | Misty's Tears Gym Challenge #118 | GV-PK-G2-118 |
| Gen 1:71 | Squirtle | Town Volunteers Aquapolis #136 | GV-PK-AQ-136 |
| Gen 1:77 | Squirtle | Team Rocket's Meowth Wizards Promos #18 | GV-PK-PR-18 |

## Decision

Cameo search remains viable, but promotion should only include approved matches after a reviewed schema/write plan. Missing set aliases and card-not-found rows need a separate alias/remediation plan.

Rows that became `BLOCKED_CARD_NOT_FOUND` or `BLOCKED_AMBIGUOUS_CARD` after alias resolution remain blocked. The alias file only resolves set labels; it does not loosen card-name or number matching.

## Confirmations

- No DB writes.
- No migrations.
- No search integration.
- No app changes.
- No Species Dex denominator changes.
- No scanner changes.
