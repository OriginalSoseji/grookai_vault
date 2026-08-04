# Special Variant Printing Authority V1

Generated: 2026-08-04T19:52:12.537Z

## Boundary

- Read-only service-role SELECT access: yes
- Database writes: none
- Canonical rows changed: 0
- Child printing rows changed: 0
- JustTCG authority: prohibited; discovery handle only
- Automatic apply authorization: none

## Authority Rule

A candidate requires an exact TCGCSV/TCGplayer catalog product, matching card name and full number, independently verified set denominator when present, explicit special-variant title, exact catalog finish subtype, agreement with discovery finish, and verified Master Index variant-or-finish support. JustTCG is discovery-only and can never qualify a row by itself.

## Summary

| Status | Rows |
| --- | --- |
| identity_or_finish_conflict | 381 |
| authoritative_candidate_ready_for_guarded_dry_run | 143 |
| variant_identity_corroborated_finish_needs_second_source | 38 |
| tcgcsv_product_missing | 1 |

- Queue rows: 563
- TCGCSV products found: 562
- Exact finish observations found: 542
- Guarded dry-run candidates: 143
- Blocked rows: 420

## Guarded Dry-Run Candidates

These rows have enough evidence to enter a separate no-write child-printing dry run. They are not applied by this audit.

| GV-ID | Card | Variant | Finish | TCGplayer Product | Source title |
| --- | --- | --- | --- | --- | --- |
| GV-PK-BLW-25-PRERELEASE-STAMP | Darmanitan 25 | prerelease_stamp | holo | 228483 | Darmanitan - 25/114 (Prerelease) |
| GV-PK-BLW-25-STAFF-PRERELEASE-STAMP | Darmanitan 25 | staff_prerelease_stamp | holo | 228485 | Darmanitan - 25/114 (Prerelease) [Staff] |
| GV-PK-NVI-43-PRERELEASE-STAMP | Victini 43 | prerelease_stamp | holo | 228499 | Victini - 43/101 (Prerelease) |
| GV-PK-NVI-43-STAFF-PRERELEASE-STAMP | Victini 43 | staff_prerelease_stamp | holo | 228500 | Victini - 43/101 (Prerelease) [Staff] |
| GV-PK-NXD-12-PRERELEASE-STAMP | Arcanine 12 | prerelease_stamp | holo | 230421 | Arcanine - 12/99 (Prerelease) |
| GV-PK-DP-52-PRERELEASE-STAMP | Luxio 52 | prerelease_stamp | normal | 220758 | Luxio - 52/130 (Prerelease) |
| GV-PK-DP-52-STAFF-PRERELEASE-STAMP | Luxio 52 | staff_prerelease_stamp | normal | 242915 | Luxio - 52/130 (Prerelease) [Staff] |
| GV-PK-MT-48-PRERELEASE-STAMP | Gabite 48 | prerelease_stamp | normal | 164204 | Gabite - 48/124 (Prerelease) |
| GV-PK-MT-48-STAFF-PRERELEASE-STAMP | Gabite 48 | staff_prerelease_stamp | normal | 164205 | Gabite - 48/123 (Prerelease) [Staff] |
| GV-PK-SW-106-ORIGINS-GAME-FAIR-2008-STAFF-STAMP | Shellos East Sea 106 | origins_game_fair_2008_staff_stamp | normal | 213027 | Shellos East Sea - 106/132 (Origins Game Fair 2008) [Staff] |
| GV-PK-MD-42-PRERELEASE-STAMP | Mothim 42 | prerelease_stamp | normal | 232881 | Mothim - 42/100 (Prerelease) |
| GV-PK-SF-46-PRERELEASE-STAMP | Piloswine 46 | prerelease_stamp | normal | 213015 | Piloswine - 46/100 (Prerelease) |
| GV-PK-SF-46-STAFF-PRERELEASE-STAMP | Piloswine 46 | staff_prerelease_stamp | normal | 213016 | Piloswine - 46/100 (Prerelease) [Staff] |
| GV-PK-DR-32-PRERELEASE-STAMP | Gyarados 32 | prerelease_stamp | normal | 239090 | Gyarados - 32/97 (Prerelease) |
| GV-PK-HS-28-PRERELEASE-STAMP | Pichu 28 | prerelease_stamp | holo | 213013 | Pichu - 28/123 (Prerelease) |
| GV-PK-UD-17-STAFF-PRERELEASE-STAMP | Leafeon 17 | staff_prerelease_stamp | holo | 228481 | Leafeon - 17/90 (Prerelease) [Staff] |
| GV-PK-MEG-064-MEGA-EVOLUTION-STAMP | Xerneas 064 | mega_evolution_stamp | holo | 655977 | Xerneas (Mega Evolution Stamped) |
| GV-PK-MEG-088-MEGA-EVOLUTION-STAMP | Yveltal 088 | mega_evolution_stamp | holo | 659592 | Yveltal (Mega Evolution Stamped) |
| GV-PK-PFL-017-PHANTASMAL-FLAMES-STAMP | Reshiram 017 | phantasmal_flames_stamp | holo | 664098 | Reshiram (Phantasmal Flames Stamped) |
| GV-PK-PR-NP-004-E-LEAGUE-WINNER-STAMP | Grovyle 004 | e_league_winner_stamp | normal | 85934 | Grovyle - 004 (e-League) [Winner] |
| GV-PK-PR-NP-008-E-LEAGUE-STAMP | Torchic 008 | e_league_stamp | reverse | 89948 | Torchic - 008 (e-League) |
| GV-PK-PR-NP-009-E-LEAGUE-WINNER-STAMP | Combusken 009 | e_league_winner_stamp | normal | 84399 | Combusken - 009 (e-League) [Winner] |
| GV-PK-PR-NP-010-E-LEAGUE-STAMP | Mudkip 010 | e_league_stamp | reverse | 87604 | Mudkip - 010 (e-League) |
| GV-PK-PR-NP-011-E-LEAGUE-WINNER-STAMP | Marshtomp 011 | e_league_winner_stamp | normal | 87231 | Marshtomp - 011 (e-League) [Winner] |
| GV-PK-PR-NP-022-E-LEAGUE-STAMP | Beldum 022 | e_league_stamp | normal | 83784 | Beldum - 022 (e-League) |
| GV-PK-PR-NP-024-E-LEAGUE-STAMP | Chimecho 024 | e_league_stamp | normal | 84293 | Chimecho - 024 (e-League) |
| GV-PK-PR-NP-024-E-LEAGUE-WINNER-STAMP | Chimecho 024 | e_league_winner_stamp | normal | 228153 | Chimecho - 024 (e-League) [Winner] |
| GV-PK-PR-NP-025-E-LEAGUE-STAMP | Flygon 025 | e_league_stamp | normal | 85523 | Flygon - 025 (e-League) |
| GV-PK-PR-NP-025-E-LEAGUE-WINNER-STAMP | Flygon 025 | e_league_winner_stamp | normal | 228158 | Flygon - 025 (e-League) [Winner] |
| GV-PK-PL-53-PRERELEASE-STAMP | Lucario 53 | prerelease_stamp | normal | 187215 | Lucario - 53/127 (Prerelease) |
| GV-PK-RR-52-PRERELEASE-STAMP | Tropius 52 | prerelease_stamp | normal | 213009 | Tropius - 52/111 (Prerelease) |
| GV-PK-RR-52-STAFF-PRERELEASE-STAMP | Tropius 52 | staff_prerelease_stamp | normal | 228597 | Tropius - 52/111 (Prerelease) [Staff] |
| GV-PK-SV-70-PRERELEASE-STAMP | Milotic 70 | prerelease_stamp | normal | 164213 | Milotic - 70/147 (Prerelease) |
| GV-PK-SV-70-STAFF-PRERELEASE-STAMP | Milotic 70 | staff_prerelease_stamp | normal | 164214 | Milotic - 70/147 (Prerelease) [Staff] |
| GV-PK-CEC-016-PRERELEASE-STAMP | Sawsbuck 016 | prerelease_stamp | normal | 202325 | Sawsbuck - 16/236 (Prerelease Kit Exclusive) |
| GV-PK-SM-SM10-PRERELEASE-STAMP | Shiinotic SM10 | prerelease_stamp | holo | 127181 | Shiinotic - SM10 (Prerelease) |
| GV-PK-SM-SM10-STAFF-PRERELEASE-STAMP | Shiinotic SM10 | staff_prerelease_stamp | holo | 127182 | Shiinotic - SM10 (Prerelease) [Staff] |
| GV-PK-SM-SM11-PRERELEASE-STAMP | Bruxish SM11 | prerelease_stamp | holo | 127184 | Bruxish - SM11 (Prerelease) |
| GV-PK-SM-SM11-STAFF-PRERELEASE-STAMP | Bruxish SM11 | staff_prerelease_stamp | holo | 127183 | Bruxish - SM11 (Prerelease) [Staff] |
| GV-PK-SM-SM115-PRERELEASE-STAMP | Pheromosa SM115 | prerelease_stamp | holo | 166288 | Pheromosa - SM115 (Prerelease) |
| GV-PK-SM-SM115-STAFF-PRERELEASE-STAMP | Pheromosa SM115 | staff_prerelease_stamp | holo | 166289 | Pheromosa - SM115 (Prerelease) [Staff] |
| GV-PK-SM-SM116-PRERELEASE-STAMP | Xurkitree SM116 | prerelease_stamp | holo | 166290 | Xurkitree - SM116 (Prerelease) |
| GV-PK-SM-SM116-STAFF-PRERELEASE-STAMP | Xurkitree SM116 | staff_prerelease_stamp | holo | 166291 | Xurkitree - SM116 (Prerelease) [Staff] |
| GV-PK-SM-SM117-PRERELEASE-STAMP | Malamar SM117 | prerelease_stamp | holo | 166292 | Malamar - SM117 (Prerelease) |
| GV-PK-SM-SM117-STAFF-PRERELEASE-STAMP | Malamar SM117 | staff_prerelease_stamp | holo | 166293 | Malamar - SM117 (Prerelease) [Staff] |
| GV-PK-SM-SM118-PRERELEASE-STAMP | Lycanroc SM118 | prerelease_stamp | holo | 166294 | Lycanroc - SM118 (Prerelease) |
| GV-PK-SM-SM118-STAFF-PRERELEASE-STAMP | Lycanroc SM118 | staff_prerelease_stamp | holo | 166295 | Lycanroc - SM118 (Prerelease) [Staff] |
| GV-PK-SM-SM12-PRERELEASE-STAMP | Passimian SM12 | prerelease_stamp | holo | 127185 | Passimian - SM12 (Prerelease) |
| GV-PK-SM-SM12-STAFF-PRERELEASE-STAMP | Passimian SM12 | staff_prerelease_stamp | holo | 127186 | Passimian - SM12 (Prerelease) [Staff] |
| GV-PK-SM-SM129-PRERELEASE-STAMP | Kyogre SM129 | prerelease_stamp | holo | 172930 | Kyogre - SM129 (Prerelease) |
| GV-PK-SM-SM129-STAFF-PRERELEASE-STAMP | Kyogre SM129 | staff_prerelease_stamp | holo | 172931 | Kyogre - SM129 (Prerelease) [Staff] |
| GV-PK-SM-SM13-PRERELEASE-STAMP | Oranguru SM13 | prerelease_stamp | holo | 127188 | Oranguru - SM13 (Prerelease) |
| GV-PK-SM-SM13-STAFF-PRERELEASE-STAMP | Oranguru SM13 | staff_prerelease_stamp | holo | 127187 | Oranguru - SM13 (Prerelease) [Staff] |
| GV-PK-SM-SM130-PRERELEASE-STAMP | Manectric SM130 | prerelease_stamp | holo | 172933 | Manectric - SM130 (Prerelease) |
| GV-PK-SM-SM130-STAFF-PRERELEASE-STAMP | Manectric SM130 | staff_prerelease_stamp | holo | 172932 | Manectric - SM130 (Prerelease) [Staff] |
| GV-PK-SM-SM131-PRERELEASE-STAMP | Celesteela SM131 | prerelease_stamp | holo | 172935 | Celesteela - SM131 (Prerelease) |
| GV-PK-SM-SM131-STAFF-PRERELEASE-STAMP | Celesteela SM131 | staff_prerelease_stamp | holo | 172934 | Celesteela - SM131 (Prerelease) [Staff] |
| GV-PK-SM-SM132-PRERELEASE-STAMP | Delcatty SM132 | prerelease_stamp | holo | 172937 | Delcatty - SM132 (Prerelease) |
| GV-PK-SM-SM132-STAFF-PRERELEASE-STAMP | Delcatty SM132 | staff_prerelease_stamp | holo | 172936 | Delcatty - SM132 (Prerelease) [Staff] |
| GV-PK-SM-SM148-WORLD-CHAMPIONSHIPS-2018-STAFF-STAMP | Champions Festival SM148 | world_championships_2018_staff_stamp | normal | 178755 | Champions Festival - SM148 (World Championships 2018) [Staff] |
| GV-PK-SM-SM149-PRERELEASE-STAMP | Suicune SM149 | prerelease_stamp | holo | 158255 | Suicune - SM149 (Prerelease) |
| GV-PK-SM-SM149-STAFF-PRERELEASE-STAMP | Suicune SM149 | staff_prerelease_stamp | holo | 178793 | Suicune - SM149 (Prerelease) [Staff] |
| GV-PK-SM-SM150-PRERELEASE-STAMP | Raikou SM150 | prerelease_stamp | holo | 158256 | Raikou - SM150 (Prerelease) |
| GV-PK-SM-SM150-STAFF-PRERELEASE-STAMP | Raikou SM150 | staff_prerelease_stamp | holo | 178794 | Raikou - SM150 (Prerelease) (Staff) |
| GV-PK-SM-SM151-PRERELEASE-STAMP | Giratina SM151 | prerelease_stamp | holo | 177903 | Giratina - SM151 (Prerelease) |
| GV-PK-SM-SM151-STAFF-PRERELEASE-STAMP | Giratina SM151 | staff_prerelease_stamp | holo | 178795 | Giratina - SM151 (Prerelease) [Staff] |
| GV-PK-SM-SM152-PRERELEASE-STAMP | Tapu Lele SM152 | prerelease_stamp | holo | 178796 | Tapu Lele - SM152 (Prerelease) |
| GV-PK-SM-SM152-STAFF-PRERELEASE-STAMP | Tapu Lele SM152 | staff_prerelease_stamp | holo | 178797 | Tapu Lele - SM152 (Prerelease) [Staff] |
| GV-PK-SM-SM158-STAFF-STAMP | Charizard SM158 | staff_stamp | holo | 183967 | Charizard - SM158 [Staff] |
| GV-PK-SM-SM159-PRERELEASE-STAMP | Zapdos SM159 | prerelease_stamp | holo | 183972 | Zapdos - SM159 (Prerelease) |
| GV-PK-SM-SM159-STAFF-PRERELEASE-STAMP | Zapdos SM159 | staff_prerelease_stamp | holo | 183973 | Zapdos - SM159 (Prerelease) [Staff] |
| GV-PK-SM-SM160-PRERELEASE-STAMP | Nidoqueen SM160 | prerelease_stamp | holo | 183970 | Nidoqueen - SM160 (Prerelease) |
| GV-PK-SM-SM160-STAFF-PRERELEASE-STAMP | Nidoqueen SM160 | staff_prerelease_stamp | holo | 183971 | Nidoqueen - SM160 (Prerelease) [Staff] |
| GV-PK-SM-SM179-PRERELEASE-STAMP | Volcanion SM179 | prerelease_stamp | holo | 189010 | Volcanion - SM179 (Prerelease) |
| GV-PK-SM-SM179-STAFF-PRERELEASE-STAMP | Volcanion SM179 | staff_prerelease_stamp | holo | 189455 | Volcanion - SM179 (Prerelease) [Staff] |
| GV-PK-SM-SM18-PRERELEASE-STAMP | Alolan Sandslash SM18 | prerelease_stamp | holo | 131091 | Alolan Sandslash - SM18 (Prerelease) |
| GV-PK-SM-SM18-STAFF-PRERELEASE-STAMP | Alolan Sandslash SM18 | staff_prerelease_stamp | holo | 131092 | Alolan Sandslash - SM18 (Prerelease) [Staff] |
| GV-PK-SM-SM180-PRERELEASE-STAMP | Stakataka SM180 | prerelease_stamp | holo | 189012 | Stakataka - SM180 (Prerelease) |
| GV-PK-SM-SM180-STAFF-PRERELEASE-STAMP | Stakataka SM180 | staff_prerelease_stamp | holo | 189456 | Stakataka - SM180 (Prerelease) [Staff] |
| GV-PK-SM-SM181-PRERELEASE-STAMP | Melmetal SM181 | prerelease_stamp | holo | 189021 | Melmetal - SM181 (Prerelease) |
| GV-PK-SM-SM181-STAFF-PRERELEASE-STAMP | Melmetal SM181 | staff_prerelease_stamp | holo | 189457 | Melmetal - SM181 (Prerelease) [Staff] |
| GV-PK-SM-SM182-PRERELEASE-STAMP | Persian SM182 | prerelease_stamp | holo | 189022 | Persian - SM182 (Prerelease) |
| GV-PK-SM-SM19-PRERELEASE-STAMP | Oricorio SM19 | prerelease_stamp | holo | 131089 | Oricorio - SM19 (Prerelease) |
| GV-PK-SM-SM19-STAFF-PRERELEASE-STAMP | Oricorio SM19 | staff_prerelease_stamp | holo | 131090 | Oricorio - SM19 (Prerelease) [Staff] |
| GV-PK-SM-SM20-PRERELEASE-STAMP | Mudsdale SM20 | prerelease_stamp | holo | 131085 | Mudsdale - SM20 (Prerelease) |
| GV-PK-SM-SM20-STAFF-PRERELEASE-STAMP | Mudsdale SM20 | staff_prerelease_stamp | holo | 131086 | Mudsdale - SM20 (Prerelease) [Staff] |
| GV-PK-SM-SM202-PRERELEASE-STAMP | Amoonguss SM202 | prerelease_stamp | holo | 196715 | Amoonguss - SM202 (Prerelease) |
| GV-PK-SM-SM202-STAFF-PRERELEASE-STAMP | Amoonguss SM202 | staff_prerelease_stamp | holo | 199609 | Amoonguss - SM202 (Prerelease) [Staff] |
| GV-PK-SM-SM203-PRERELEASE-STAMP | Tapu Fini SM203 | prerelease_stamp | holo | 196718 | Tapu Fini - SM203 (Prerelease) |
| GV-PK-SM-SM203-STAFF-PRERELEASE-STAMP | Tapu Fini SM203 | staff_prerelease_stamp | holo | 199611 | Tapu Fini - SM203 (Prerelease) [Staff] |
| GV-PK-SM-SM204-PRERELEASE-STAMP | Necrozma SM204 | prerelease_stamp | holo | 196716 | Necrozma - SM204 (Prerelease) |
| GV-PK-SM-SM204-STAFF-PRERELEASE-STAMP | Necrozma SM204 | staff_prerelease_stamp | holo | 199622 | Necrozma - SM204 (Prerelease) [Staff] |
| GV-PK-SM-SM205-PRERELEASE-STAMP | Terrakion SM205 | prerelease_stamp | holo | 196717 | Terrakion - SM205 (Prerelease) |
| GV-PK-SM-SM205-STAFF-PRERELEASE-STAMP | Terrakion SM205 | staff_prerelease_stamp | holo | 199617 | Terrakion - SM205 (Prerelease) [Staff] |
| GV-PK-SM-SM21-PRERELEASE-STAMP | Drampa SM21 | prerelease_stamp | holo | 131087 | Drampa - SM21 (Prerelease) |
| GV-PK-SM-SM21-STAFF-PRERELEASE-STAMP | Drampa SM21 | staff_prerelease_stamp | holo | 131088 | Drampa - SM21 (Prerelease) [Staff] |
| GV-PK-SM-SM218-PRERELEASE-STAMP | Buzzwole SM218 | prerelease_stamp | holo | 201940 | Buzzwole - SM218 (Prerelease) |
| GV-PK-SM-SM218-STAFF-PRERELEASE-STAMP | Buzzwole SM218 | staff_prerelease_stamp | holo | 201941 | Buzzwole - SM218 (Prerelease) [Staff] |
| GV-PK-SM-SM219-PRERELEASE-STAMP | Entei SM219 | prerelease_stamp | holo | 201943 | Entei - SM219 (Prerelease) |
| GV-PK-SM-SM219-STAFF-PRERELEASE-STAMP | Entei SM219 | staff_prerelease_stamp | holo | 201942 | Entei - SM219 (Prerelease) [Staff] |
| GV-PK-SM-SM220-PRERELEASE-STAMP | Phione SM220 | prerelease_stamp | holo | 201938 | Phione - SM220 (Prerelease) |
| GV-PK-SM-SM220-STAFF-PRERELEASE-STAMP | Phione SM220 | staff_prerelease_stamp | holo | 201939 | Phione - SM220 (Prerelease) [Staff] |
| GV-PK-SM-SM221-PRERELEASE-STAMP | Blacephalon SM221 | prerelease_stamp | holo | 201944 | Blacephalon - SM221 (Prerelease) |
| GV-PK-SM-SM221-STAFF-PRERELEASE-STAMP | Blacephalon SM221 | staff_prerelease_stamp | holo | 201945 | Blacephalon - SM221 (Prerelease) [Staff] |
| GV-PK-SM-SM46-PRERELEASE-STAMP | Seviper SM46 | prerelease_stamp | holo | 139088 | Seviper - SM46 (Prerelease) |
| GV-PK-SM-SM46-STAFF-PRERELEASE-STAMP | Seviper SM46 | staff_prerelease_stamp | holo | 139089 | Seviper - SM46 (Prerelease) [Staff] |
| GV-PK-SM-SM47-PRERELEASE-STAMP | Crabominable SM47 | prerelease_stamp | holo | 139095 | Crabominable - SM47 (Prerelease) |
| GV-PK-SM-SM47-STAFF-PRERELEASE-STAMP | Crabominable SM47 | staff_prerelease_stamp | holo | 139094 | Crabominable - SM47 (Prerelease) [Staff] |
| GV-PK-SM-SM48-PRERELEASE-STAMP | Zygarde SM48 | prerelease_stamp | holo | 139093 | Zygarde - SM48 (Prerelease) |
| GV-PK-SM-SM48-STAFF-PRERELEASE-STAMP | Zygarde SM48 | staff_prerelease_stamp | holo | 139092 | Zygarde - SM48 (Prerelease) [Staff] |
| GV-PK-SM-SM49-PRERELEASE-STAMP | Bewear SM49 | prerelease_stamp | holo | 139090 | Bewear - SM49 (Prerelease) |
| GV-PK-SM-SM49-STAFF-PRERELEASE-STAMP | Bewear SM49 | staff_prerelease_stamp | holo | 139091 | Bewear - SM49 (Prerelease) [Staff] |
| GV-PK-SM-SM72-PRERELEASE-STAMP | Alolan Raichu SM72 | prerelease_stamp | holo | 151701 | Alolan Raichu - SM72 (Prerelease) |
| GV-PK-SM-SM72-STAFF-PRERELEASE-STAMP | Alolan Raichu SM72 | staff_prerelease_stamp | holo | 151708 | Alolan Raichu - SM72 (Prerelease) [Staff] |
| GV-PK-SM-SM73-PRERELEASE-STAMP | Salazzle SM73 | prerelease_stamp | holo | 151702 | Salazzle - SM73 (Prerelease) |
| GV-PK-SM-SM73-STAFF-PRERELEASE-STAMP | Salazzle SM73 | staff_prerelease_stamp | holo | 151706 | Salazzle - SM73 (Prerelease) [Staff] |
| GV-PK-SM-SM74-PRERELEASE-STAMP | Regirock SM74 | prerelease_stamp | holo | 151703 | Regirock - SM74 (Prerelease) |
| GV-PK-SM-SM74-STAFF-PRERELEASE-STAMP | Regirock SM74 | staff_prerelease_stamp | holo | 151707 | Regirock - SM74 (Prerelease) [Staff] |
| GV-PK-SM-SM75-PRERELEASE-STAMP | Registeel SM75 | prerelease_stamp | holo | 151704 | Registeel - SM75 (Prerelease) |
| GV-PK-SM-SM75-STAFF-PRERELEASE-STAMP | Registeel SM75 | staff_prerelease_stamp | holo | 151705 | Registeel - SM75 (Prerelease) [Staff] |
| GV-PK-SM-SM94-PRERELEASE-STAMP | Wash Rotom SM94 | prerelease_stamp | holo | 158167 | Wash Rotom - SM94 (Prerelease) |
| GV-PK-SM-SM94-STAFF-PRERELEASE-STAMP | Wash Rotom SM94 | staff_prerelease_stamp | holo | 158168 | Wash Rotom - SM94 (Prerelease) [Staff] |
| GV-PK-SM-SM95-PRERELEASE-STAMP | Lucario SM95 | prerelease_stamp | holo | 158165 | Lucario - SM95 (Prerelease) |
| GV-PK-SM-SM96-PRERELEASE-STAMP | Heatran SM96 | prerelease_stamp | holo | 158171 | Heatran - SM96 (Prerelease) |
| GV-PK-SM-SM96-STAFF-PRERELEASE-STAMP | Heatran SM96 | staff_prerelease_stamp | holo | 158172 | Heatran - SM96 (Prerelease) [Staff] |
| GV-PK-SM-SM97-PRERELEASE-STAMP | Gumshoos SM97 | prerelease_stamp | holo | 158169 | Gumshoos - SM97 (Prerelease) |
| GV-PK-SM-SM97-STAFF-PRERELEASE-STAMP | Gumshoos SM97 | staff_prerelease_stamp | holo | 158170 | Gumshoos - SM97 (Prerelease) [Staff] |
| GV-PK-OBF-130-OBSIDIAN-FLAMES-STAMP | Umbreon 130 | obsidian_flames_stamp | reverse | 528230 | Umbreon (Obsidian Flames Stamped) |
| GV-PK-MEW-025-POKEMON-TOGETHER-STAMP | Pikachu 025 | pokemon_together_stamp | normal | 559566 | Pikachu - 025/165 (Pokemon Together) |
| GV-PK-PAR-066-PARADOX-RIFT-STAMP | Zekrom 066 | paradox_rift_stamp | holo | 664140 | Zekrom (Paradox Rift Stamped) |
| GV-PK-TWM-024-TWILIGHT-MASQUERADE-STAMP | Teal Mask Ogerpon 024 | twilight_masquerade_stamp | holo | 646871 | Teal Mask Ogerpon (Twilight Masquerade Stamp) |
| GV-PK-TWM-040-TWILIGHT-MASQUERADE-STAMP | Hearthflame Mask Ogerpon ex 040 | twilight_masquerade_stamp | holo | 645458 | Hearthflame Mask Ogerpon ex (Twilight Masquerade Stamp) |
| GV-PK-TWM-064-TWILIGHT-MASQUERADE-STAMP | Wellspring Mask Ogerpon ex 064 | twilight_masquerade_stamp | holo | 645415 | Wellspring Mask Ogerpon ex (Twilight Masquerade Stamp) |
| GV-PK-TWM-134-TWILIGHT-MASQUERADE-STAMP | Blissey ex 134 | twilight_masquerade_stamp | holo | 664088 | Blissey ex (Twilight Masquerade Stamped) |
| GV-PK-SCR-022-STELLAR-CROWN-STAMP | Reshiram 022 | stellar_crown_stamp | holo | 664136 | Reshiram (Stellar Crown Stamped) |
| GV-PK-SCR-041-STELLAR-CROWN-STAMP | Greninja ex 041 | stellar_crown_stamp | holo | 664056 | Greninja ex (Stellar Crown Stamped) |
| GV-PK-SCR-102-STELLAR-CROWN-STAMP | Meltan 102 | stellar_crown_stamp | holo | 664144 | Meltan (Stellar Crown Stamped) |
| GV-PK-SCR-105-STELLAR-CROWN-STAMP | Melmetal ex 105 | stellar_crown_stamp | holo | 664145 | Melmetal ex (Stellar Crown Stamped) |
| GV-PK-BLK-012-BLACK-BOLT-STAMP | Victini 012 | black_bolt_stamp | holo | 668956 | Victini (Black Bolt Stamped) |
| GV-PK-BLK-034-BLACK-BOLT-STAMP | Zekrom ex 034 | black_bolt_stamp | holo | 668957 | Zekrom ex (Black Bolt Stamped) |
| GV-PK-WHT-020-WHITE-FLARE-STAMP | Reshiram ex 020 | white_flare_stamp | holo | 668958 | Reshiram ex (White Flare Stamped) |
| GV-PK-WHT-062-WHITE-FLARE-STAMP | Zoroark 062 | white_flare_stamp | holo | 668959 | Zoroark (White Flare Stamped) |
| GV-PK-BRS-056-BRILLIANT-STARS-STAMP | Mewtwo 056 | brilliant_stars_stamp | holo | 277678 | Mewtwo - 056/172 (Brilliant Stars Stamped) |

## Blocked Queue

| GV-ID | Variant | Status | Blocker |
| --- | --- | --- | --- |
| GV-PK-FO-01-PRERELEASE-STAMP | prerelease_stamp | tcgcsv_product_missing | matching_tcgcsv_product_not_in_warehouse |
| GV-PK-NXD-12-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP | worlds_11_staff_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-28-WORLDS-11-TOP-16-STAMP | worlds_11_top_16_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | battle_road_autumn_2011_3rd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | battle_road_autumn_2012_3rd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | battle_road_spring_2012_3rd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | battle_road_spring_2013_3rd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | battle_road_autumn_2011_2nd_place_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | battle_road_autumn_2012_2nd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | battle_road_spring_2012_2nd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | battle_road_spring_2013_2nd_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | battle_road_autumn_2011_1st_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | battle_road_autumn_2012_1st_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | battle_road_spring_2012_1st_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | battle_road_spring_2013_1st_place_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-40-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-48-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-48-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-50-WORLDS-12-STAMP | worlds_12_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-50-WORLDS-12-TOP-32-STAMP | worlds_12_top_32_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-BLW-51-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-51-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-53-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-53-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-75-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-75-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-84-PRERELEASE-STAMP | prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-PR-BLW-84-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_exact_card_missing |
| GV-PK-SW-107-SDCC-2007-STAFF-STAMP | sdcc_2007_staff_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PR-DPP-05-WORLDS-07-STAMP | worlds_07_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-GEN-043-GENERATIONS-GEODUDE-STAMP | generations_geodude_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-HS-28-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-MEG-003-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-022-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-028-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-036-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-050-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-060-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-073-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-074-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-075-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-077-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-086-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-094-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-100-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-101-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-114-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-116-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-117-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-118-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-119-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-121-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-122-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-124-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-127-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-128-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-129-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEG-132-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PR-NP-036-2006-WORLD-CHAMPIONSHIPS-STAFF-STAMP | 2006_world_championships_staff_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-PGO-030-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | card_denominator_not_supported_by_verified_set_totals, special_variant_not_explicit_in_product_title |
| GV-PK-PGO-031-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | card_denominator_not_supported_by_verified_set_totals, special_variant_not_explicit_in_product_title |
| GV-PK-PL-53-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-SM-SM161-STAFF-STAMP | staff_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-SM-SM170-SM-PROMOS-DETECTIVE-PIKACHU-SM170-STAMP | sm_promos_detective_pikachu_sm170_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SM-SM182-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-SM-SM190-SM-PROMOS-DETECTIVE-PIKACHU-SM190-STAMP | sm_promos_detective_pikachu_sm190_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SM-SM95-STAFF-PRERELEASE-STAMP | staff_prerelease_stamp | variant_identity_corroborated_finish_needs_second_source | tcgcsv_exact_finish_subtype_missing |
| GV-PK-SVI-019-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-043-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-062-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-065-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-088-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-089-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-114-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-114-SCARLET-AND-VIOLET-STAMP | scarlet_and_violet_stamp | variant_identity_corroborated_finish_needs_second_source | master_index_has_no_variant_or_target_finish_support |
| GV-PK-SVI-123-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-127-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-131-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-134-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-143-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-151-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-158-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-179-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-SVI-182-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | card_number_mismatch, special_variant_not_explicit_in_product_title |
| GV-PK-SVI-195-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-015-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-037-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-071-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-089-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-093-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-097-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-127-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-153-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-159-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-171-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-173-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-177-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-181-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-189-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAL-191-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-OBF-022-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-OBF-066-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-OBF-092-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-OBF-095-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-OBF-189-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-MEW-085-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-038-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-058-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-072-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-089-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-093-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-108-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-126-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-137-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-139-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-159-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-160-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-163-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-164-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-166-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-167-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-170-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-171-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-176-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-177-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-178-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-179-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-180-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-PAR-181-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-012-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-021-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-041-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-078-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-085-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-097-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-108-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-114-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-141-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-142-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-144-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-145-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-147-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-148-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-151-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-152-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-154-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-155-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |
| GV-PK-TEF-156-PLAY-POKEMON-STAMP | play_pokemon_stamp | identity_or_finish_conflict | special_variant_not_explicit_in_product_title |

_270 additional rows are preserved in JSON._

## Next Gate

Generate a separate guarded, read-only child-printing dry-run manifest from only the accepted candidate rows. Before any write, require per-row invariants, collision checks, provenance payloads, rollback SQL, and exact post-apply readback design.
