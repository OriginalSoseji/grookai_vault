# MEE-05B Raw Evidence Gap Analysis V1

Generated: 2026-06-25T13:32:16.980Z

## Boundary

- Local gap analysis only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.

## Summary

- reviewed_target_count: 5000
- no_match_target_count: 847
- candidate_evidence_count: 19359
- ambiguous_or_blocked_candidate_count: 7897
- csv_pokemon_card_rows: 73149
- acquisition: docs/audits/market_evidence_engine_v1/mee_04d_pricecharting_csv_raw_evidence_2026-06-25T05-53-31-341Z.json
- csv: tmp/pricecharting/pokemon_cards_pricecharting.csv
- json: docs/audits/market_evidence_engine_v1/mee_05b_raw_evidence_gap_analysis_2026-06-25T13-32-16-980Z.json

## No-Match Gap Reasons

| Reason | Count |
| --- | ---: |
| name_present_prefixed_number_gap | 371 |
| name_present_number_missing | 218 |
| name_number_present_set_alias_or_variant_gap | 193 |
| no_name_in_pricecharting_csv | 65 |

## No-Match Set Codes

| Set code | Count |
| --- | ---: |
| smp | 275 |
| me02.5 | 122 |
| bwp | 98 |
| ecard1 | 69 |
| dpp | 47 |
| me03 | 46 |
| ex6 | 40 |
| me01 | 39 |
| ex4 | 30 |
| exu | 24 |
| pl2 | 14 |
| np | 11 |
| col1 | 5 |
| dp6 | 4 |
| pl4 | 4 |
| sv01 | 3 |
| dp3 | 2 |
| gym1 | 2 |
| neo4 | 2 |
| pgo | 2 |
| sm11 | 2 |
| sv02 | 2 |
| dp7 | 1 |
| hgss1 | 1 |
| sm2 | 1 |
| sv03.5 | 1 |

## Ambiguous Or Blocked Dispositions

| Disposition | Count |
| --- | ---: |
| review_ambiguous_variant | 6803 |
| blocked_wrong_print_run | 1094 |

## Ambiguous Or Blocked Variant Labels

| Variant label | Count |
| --- | ---: |
| Reverse Holo | 5014 |
| 1st Edition | 956 |
| Holo | 538 |
| Cosmos Holo | 198 |
| Prize Pack | 178 |
| 1999-2000 | 94 |
| Cracked Ice | 93 |
| Prerelease | 87 |
| Prerelease Staff | 74 |
| Stamped | 74 |
| Gold Star | 57 |
| Master Ball | 56 |
| No Symbol | 48 |
| Jumbo | 42 |
| Cracked Ice Holo | 29 |
| Pokemon League | 29 |
| Shadowless | 24 |
| EB Games | 16 |
| League | 15 |
| Regional Championships | 13 |
| Crosshatch Holo | 12 |
| Double Holo Error | 12 |
| 1st Edition Double Holo Error | 11 |
| GameStop | 11 |
| National Championships | 11 |
| Reverse | 10 |
| Cosmos | 9 |
| Pre-Release | 9 |
| 1st Place League | 7 |
| National Championships Staff | 7 |
| Pre-Release Staff | 6 |
| Prize Pack Cosmos Holo | 6 |
| Non-Holo | 5 |
| Crosshatch Pokemon League | 4 |
| Holiday Calendar | 4 |
| Horizons | 4 |
| Metal | 4 |
| Regional Championship Staff | 4 |
| Stamped Asia Promo | 4 |
| 1st Edition Error | 3 |

## Sample Prefix-Number Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | GV-PK-PR-BLW-BW04 | Reshiram | bwp | 04 | name_present_prefixed_number_gap | 57 | 0 | 1 | Reshiram #BW004 |
| 2 | GV-PK-PR-BLW-BW05 | Zekrom | bwp | 05 | name_present_prefixed_number_gap | 54 | 0 | 2 | Zekrom #TG05; Zekrom #BW005 |
| 3 | GV-PK-PR-BLW-BW07 | Tepig | bwp | 07 | name_present_prefixed_number_gap | 47 | 0 | 1 | Tepig #BW07 |
| 4 | GV-PK-PR-BLW-BW08 | Oshawott | bwp | 08 | name_present_prefixed_number_gap | 49 | 0 | 1 | Oshawott #BW08 |
| 5 | GV-PK-PR-BLW-BW09 | Zoroark | bwp | 09 | name_present_prefixed_number_gap | 74 | 0 | 1 | Zoroark #BW09 |
| 6 | GV-PK-PR-BLW-BW10 | Axew | bwp | 10 | name_present_prefixed_number_gap | 46 | 0 | 1 | Axew #BW10 |
| 7 | GV-PK-PR-BLW-BW101 | Genesect | bwp | 101 | name_present_prefixed_number_gap | 34 | 0 | 1 | Genesect #BW101 |
| 8 | GV-PK-PR-BLW-BW11 | Pansage | bwp | 11 | name_present_prefixed_number_gap | 52 | 0 | 1 | Pansage #BW11 |
| 9 | GV-PK-PR-BLW-BW12 | Zorua | bwp | 12 | name_present_prefixed_number_gap | 81 | 0 | 1 | Zorua #BW12 |
| 10 | GV-PK-PR-BLW-BW14 | Pansage | bwp | 14 | name_present_prefixed_number_gap | 52 | 0 | 1 | Pansage #BW14 |
| 11 | GV-PK-PR-BLW-BW15 | Pidove | bwp | 15 | name_present_prefixed_number_gap | 47 | 0 | 1 | Pidove #BW15 |
| 12 | GV-PK-PR-BLW-BW16 | Axew | bwp | 16 | name_present_prefixed_number_gap | 46 | 0 | 1 | Axew #BW16 |
| 13 | GV-PK-PR-BLW-BW18 | Darumaka | bwp | 18 | name_present_prefixed_number_gap | 42 | 0 | 1 | Darumaka #BW18 |
| 14 | GV-PK-PR-BLW-BW20 | Serperior | bwp | 20 | name_present_prefixed_number_gap | 31 | 0 | 1 | Serperior #BW20 |
| 15 | GV-PK-PR-BLW-BW21 | Emboar | bwp | 21 | name_present_prefixed_number_gap | 40 | 0 | 1 | Emboar #BW21 |
| 16 | GV-PK-PR-BLW-BW23 | Reshiram | bwp | 23 | name_present_prefixed_number_gap | 57 | 0 | 1 | Reshiram #BW23 |
| 17 | GV-PK-PR-BLW-BW24 | Zekrom | bwp | 24 | name_present_prefixed_number_gap | 54 | 0 | 1 | Zekrom #BW24 |
| 18 | GV-PK-PR-BLW-BW26 | Axew | bwp | 26 | name_present_prefixed_number_gap | 46 | 0 | 1 | Axew #BW26 |
| 19 | GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP | Tropical Beach | bwp | 28 | name_present_prefixed_number_gap | 13 | 0 | 5 | Tropical Beach #BW28; Tropical Beach [Semi-Finalist] #BW28; Tropical Beach [Top Sixteen] #BW28; Tropical Beach [Top Thirty-Two] #BW28; Tropical Beach [Worlds 11 Staff] #BW28 |
| 20 | GV-PK-PR-BLW-28-WORLDS-11-TOP-16-STAMP | Tropical Beach | bwp | 28 | name_present_prefixed_number_gap | 13 | 0 | 5 | Tropical Beach #BW28; Tropical Beach [Semi-Finalist] #BW28; Tropical Beach [Top Sixteen] #BW28; Tropical Beach [Top Thirty-Two] #BW28; Tropical Beach [Worlds 11 Staff] #BW28 |
| 21 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [3rd Place] #BW29 |
| 22 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [3rd Place] #BW29 |
| 23 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [3rd Place] #BW29 |
| 24 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [3rd Place] #BW29 |
| 25 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [2nd Place] #BW30 |
| 26 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [2nd Place] #BW30 |
| 27 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [2nd Place] #BW30 |
| 28 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [2nd Place] #BW30 |
| 29 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [1st Place] #BW31 |
| 30 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [1st Place] #BW31 |
| 31 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [1st Place] #BW31 |
| 32 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | name_present_prefixed_number_gap | 4 | 0 | 1 | Victory Cup [1st Place] #BW31 |
| 33 | GV-PK-PR-BLW-BW35 | Meowth | bwp | 35 | name_present_prefixed_number_gap | 151 | 0 | 1 | Meowth #BW35 |
| 34 | GV-PK-PR-BLW-BW36 | Reshiram-EX | bwp | 36 | name_present_prefixed_number_gap | 25 | 0 | 1 | Reshiram EX #BW36 |
| 35 | GV-PK-PR-BLW-BW37 | Kyurem-EX | bwp | 37 | name_present_prefixed_number_gap | 28 | 0 | 1 | Kyurem EX #BW37 |
| 36 | GV-PK-PR-BLW-BW38 | Zekrom-EX | bwp | 38 | name_present_prefixed_number_gap | 20 | 0 | 1 | Zekrom EX #BW38 |
| 37 | GV-PK-PR-BLW-BW39 | Battle City | bwp | 39 | name_present_prefixed_number_gap | 2 | 0 | 1 | Battle City #BW39 |
| 38 | GV-PK-PR-BLW-40-PRERELEASE-STAMP | Volcarona | bwp | 40 | name_present_prefixed_number_gap | 62 | 0 | 2 | Volcarona #BW40; Volcarona [Staff] #BW40 |
| 39 | GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | Volcarona | bwp | 40 | name_present_prefixed_number_gap | 62 | 0 | 2 | Volcarona #BW40; Volcarona [Staff] #BW40 |
| 40 | GV-PK-PR-BLW-BW41 | Thundurus | bwp | 41 | name_present_prefixed_number_gap | 48 | 0 | 1 | Thundurus #BW41 |
| 41 | GV-PK-PR-BLW-BW42 | Tornadus | bwp | 42 | name_present_prefixed_number_gap | 44 | 0 | 1 | Tornadus #BW42 |
| 42 | GV-PK-PR-BLW-BW43 | Landorus | bwp | 43 | name_present_prefixed_number_gap | 45 | 0 | 1 | Landorus #BW43 |
| 43 | GV-PK-PR-BLW-BW44 | Kyurem | bwp | 44 | name_present_prefixed_number_gap | 35 | 0 | 1 | Kyurem #BW44 |
| 44 | GV-PK-PR-BLW-BW46 | Darkrai-EX | bwp | 46 | name_present_prefixed_number_gap | 19 | 0 | 1 | Darkrai EX #BW46 |
| 45 | GV-PK-PR-BLW-48-PRERELEASE-STAMP | Altaria | bwp | 48 | name_present_prefixed_number_gap | 89 | 0 | 2 | Altaria #BW48; Altaria [Staff] #BW48 |
| 46 | GV-PK-PR-BLW-48-STAFF-PRERELEASE-STAMP | Altaria | bwp | 48 | name_present_prefixed_number_gap | 89 | 0 | 2 | Altaria #BW48; Altaria [Staff] #BW48 |
| 47 | GV-PK-PR-BLW-BW49 | Lilligant | bwp | 49 | name_present_prefixed_number_gap | 38 | 0 | 1 | Lilligant #BW49 |
| 48 | GV-PK-PR-BLW-50-WORLDS-12-STAMP | Tropical Beach | bwp | 50 | name_present_prefixed_number_gap | 13 | 0 | 7 | Tropical Beach #BW50; Tropical Beach [Finalist] #BW50; Tropical Beach [Semi-Finalist] #BW50; Tropical Beach [Staff] #BW50; Tropical Beach #BW50 |
| 49 | GV-PK-PR-BLW-50-WORLDS-12-TOP-32-STAMP | Tropical Beach | bwp | 50 | name_present_prefixed_number_gap | 13 | 0 | 7 | Tropical Beach #BW50; Tropical Beach [Finalist] #BW50; Tropical Beach [Semi-Finalist] #BW50; Tropical Beach [Staff] #BW50; Tropical Beach #BW50 |
| 50 | GV-PK-PR-BLW-BW52 | Lillipup | bwp | 52 | name_present_prefixed_number_gap | 47 | 0 | 1 | Lillipup #BW52 |

## Sample Set Alias Or Variant Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | GV-PK-PR-BLW-BW01 | Snivy | bwp | 01 | name_number_present_set_alias_or_variant_gap | 42 | 19 | 22 | Snivy #1; Snivy [Cosmos Holo] #1; Snivy [Crosshatch Reverse Holo] #1; Snivy [Reverse Holo] #1; Snivy #1 |
| 2 | GV-PK-PR-BLW-BW03 | Oshawott | bwp | 03 | name_number_present_set_alias_or_variant_gap | 49 | 1 | 3 | Oshawott [Jumbo] #3 |
| 3 | GV-PK-PR-BLW-BW06 | Snivy | bwp | 06 | name_number_present_set_alias_or_variant_gap | 42 | 2 | 3 | Snivy #6; Snivy [Reverse Holo] #6 |
| 4 | GV-PK-PR-BLW-BW17 | Ducklett | bwp | 17 | name_number_present_set_alias_or_variant_gap | 49 | 3 | 4 | Ducklett #17; Ducklett [1st Edition] #17; Ducklett #17 |
| 5 | GV-PK-PR-BLW-BW19 | Zoroark | bwp | 19 | name_number_present_set_alias_or_variant_gap | 74 | 1 | 3 | Zoroark [Jumbo] #19 |
| 6 | GV-PK-PR-BLW-BW22 | Samurott | bwp | 22 | name_number_present_set_alias_or_variant_gap | 38 | 1 | 2 | Samurott #22 |
| 7 | GV-PK-PR-BLW-BW27 | Litwick | bwp | 27 | name_number_present_set_alias_or_variant_gap | 64 | 2 | 3 | Litwick #27; Litwick [Reverse Holo] #27 |
| 8 | GV-PK-PR-BLW-BW32 | Victini | bwp | 32 | name_number_present_set_alias_or_variant_gap | 85 | 1 | 2 | Victini [Jumbo] #32 |
| 9 | GV-PK-PR-BLW-BW33 | Riolu | bwp | 33 | name_number_present_set_alias_or_variant_gap | 98 | 2 | 3 | Riolu #33; Riolu [1st Edition] #33 |
| 10 | GV-PK-PR-BLW-BW45 | Mewtwo-EX | bwp | 45 | name_number_present_set_alias_or_variant_gap | 54 | 2 | 3 | Mewtwo EX #45; Mewtwo EX [1st Edition] #45 |
| 11 | GV-PK-PR-BLW-51-STAFF-PRERELEASE-STAMP | Crobat | bwp | 51 | name_number_present_set_alias_or_variant_gap | 84 | 1 | 3 | Crobat [Reverse Holo] #51 |
| 12 | GV-PK-PR-BLW-51-PRERELEASE-STAMP | Crobat | bwp | 51 | name_number_present_set_alias_or_variant_gap | 84 | 1 | 3 | Crobat [Reverse Holo] #51 |
| 13 | GV-PK-PR-BLW-53-PRERELEASE-STAMP | Flygon | bwp | 53 | name_number_present_set_alias_or_variant_gap | 62 | 3 | 5 | Flygon #53; Flygon [Holo] #53; Flygon [Reverse Holo] #53 |
| 14 | GV-PK-PR-BLW-53-STAFF-PRERELEASE-STAMP | Flygon | bwp | 53 | name_number_present_set_alias_or_variant_gap | 62 | 3 | 5 | Flygon #53; Flygon [Holo] #53; Flygon [Reverse Holo] #53 |
| 15 | GV-PK-PR-BLW-BW54 | Pikachu | bwp | 54 | name_number_present_set_alias_or_variant_gap | 533 | 5 | 6 | Pikachu [2026 Pizza Hong Kong] #54; Pikachu #54; Pikachu #54; Pikachu #54; Pikachu [Reverse Holo] #54 |
| 16 | GV-PK-PR-BLW-BW55 | Elgyem | bwp | 55 | name_number_present_set_alias_or_variant_gap | 37 | 2 | 3 | Elgyem #55; Elgyem [Reverse Holo] #55 |
| 17 | GV-PK-PR-BLW-BW56 | Empoleon | bwp | 56 | name_number_present_set_alias_or_variant_gap | 47 | 3 | 4 | Empoleon #56; Empoleon [Reverse Holo] #56; Empoleon #56 |
| 18 | GV-PK-PR-BLW-BW57 | Haxorus | bwp | 57 | name_number_present_set_alias_or_variant_gap | 39 | 2 | 3 | Haxorus #57; Haxorus [1st Edition] #57 |
| 19 | GV-PK-PR-BLW-BW61 | Keldeo-EX | bwp | 61 | name_number_present_set_alias_or_variant_gap | 24 | 2 | 3 | Keldeo EX #61; Keldeo EX [1st Edition] #61 |
| 20 | GV-PK-PR-BLW-BW62 | Black Kyurem-EX | bwp | 62 | name_number_present_set_alias_or_variant_gap | 15 | 2 | 3 | Black Kyurem EX #62; Black Kyurem EX [1st Edition] #62 |
| 21 | GV-PK-PR-BLW-BW64 | Drifblim | bwp | 64 | name_number_present_set_alias_or_variant_gap | 55 | 2 | 3 | Drifblim #64; Drifblim [Reverse Holo] #64 |
| 22 | GV-PK-PR-BLW-BW65 | Jigglypuff | bwp | 65 | name_number_present_set_alias_or_variant_gap | 112 | 4 | 5 | Jigglypuff #65; Jigglypuff [Reverse Holo] #65; Jigglypuff #65; Jigglypuff [Reverse Holo] #65 |
| 23 | GV-PK-PR-BLW-75-PRERELEASE-STAMP | Metagross | bwp | 75 | name_number_present_set_alias_or_variant_gap | 69 | 2 | 4 | Metagross [Gold Star 1st Edition] #75; Metagross #75 |
| 24 | GV-PK-PR-BLW-75-STAFF-PRERELEASE-STAMP | Metagross | bwp | 75 | name_number_present_set_alias_or_variant_gap | 69 | 2 | 4 | Metagross [Gold Star 1st Edition] #75; Metagross #75 |
| 25 | GV-PK-COL-SL1 | Deoxys | col1 | 1 | name_number_present_set_alias_or_variant_gap | 91 | 2 | 3 | Deoxys #1; Deoxys [Reverse Holo] #1 |
| 26 | GV-PK-COL-SL10 | Rayquaza | col1 | 10 | name_number_present_set_alias_or_variant_gap | 66 | 1 | 2 | Rayquaza #10 |
| 27 | GV-PK-COL-SL6 | Kyogre | col1 | 6 | name_number_present_set_alias_or_variant_gap | 51 | 2 | 3 | Kyogre #6; Kyogre [Reverse Holo] #6 |
| 28 | GV-PK-COL-SL8 | Palkia | col1 | 8 | name_number_present_set_alias_or_variant_gap | 35 | 1 | 2 | Palkia #8 |
| 29 | GV-PK-PR-DPP-DP01 | Turtwig | dpp | 01 | name_number_present_set_alias_or_variant_gap | 53 | 7 | 8 | Turtwig #1; Turtwig [1st Edition] #1; Turtwig #1/PPP; Turtwig #1; Turtwig #1 |
| 30 | GV-PK-PR-DPP-DP03 | Piplup | dpp | 03 | name_number_present_set_alias_or_variant_gap | 77 | 1 | 2 | Piplup #3 |
| 31 | GV-PK-PR-DPP-DP04 | Pachirisu | dpp | 04 | name_number_present_set_alias_or_variant_gap | 52 | 1 | 2 | Pachirisu #4 |
| 32 | GV-PK-PR-DPP-DP13 | Buizel | dpp | 13 | name_number_present_set_alias_or_variant_gap | 48 | 2 | 3 | Buizel #13; Buizel [1st Edition] #13 |
| 33 | GV-PK-PR-DPP-DP16 | Pikachu | dpp | 16 | name_number_present_set_alias_or_variant_gap | 533 | 6 | 8 | Pikachu #16; Pikachu #16; Pikachu #16; Pikachu [1st Edition] #16; Pikachu #16 |
| 34 | GV-PK-PR-DPP-DP20 | Magmortar | dpp | 20 | name_number_present_set_alias_or_variant_gap | 48 | 2 | 3 | Magmortar #20; Magmortar [Reverse Holo] #20 |
| 35 | GV-PK-PR-DPP-DP21 | Raichu | dpp | 21 | name_number_present_set_alias_or_variant_gap | 192 | 2 | 3 | Raichu #21; Raichu [1st Edition] #21 |
| 36 | GV-PK-PR-DPP-DP24 | Darkrai | dpp | 24 | name_number_present_set_alias_or_variant_gap | 55 | 2 | 4 | Darkrai #24; Darkrai [Jumbo] #24 |
| 37 | GV-PK-PR-DPP-DP26 | Dialga | dpp | 26 | name_number_present_set_alias_or_variant_gap | 49 | 1 | 3 | Dialga [Jumbo] #26 |
| 38 | GV-PK-PR-DPP-DP40 | Regigigas | dpp | 40 | name_number_present_set_alias_or_variant_gap | 50 | 1 | 2 | Regigigas [Jumbo] #40 |
| 39 | GV-PK-PR-DPP-DP50 | Arceus | dpp | 50 | name_number_present_set_alias_or_variant_gap | 41 | 1 | 3 | Arceus [Jumbo] #50 |
| 40 | GV-PK-EX-10 | Dugtrio | ecard1 | 10 | name_number_present_set_alias_or_variant_gap | 85 | 2 | 2 | Dugtrio #10; Dugtrio [Reverse Holo] #10 |
| 41 | GV-PK-EX-11 | Fearow | ecard1 | 11 | name_number_present_set_alias_or_variant_gap | 72 | 2 | 2 | Fearow #11; Fearow [Reverse Holo] #11 |
| 42 | GV-PK-EX-12 | Feraligatr | ecard1 | 12 | name_number_present_set_alias_or_variant_gap | 78 | 2 | 2 | Feraligatr #12; Feraligatr [Reverse Holo] #12 |
| 43 | GV-PK-EX-13 | Gengar | ecard1 | 13 | name_number_present_set_alias_or_variant_gap | 134 | 3 | 3 | Gengar #13; Gengar [Reverse Holo] #13; Gengar #13 |
| 44 | GV-PK-EX-14 | Golem | ecard1 | 14 | name_number_present_set_alias_or_variant_gap | 63 | 2 | 2 | Golem #14; Golem [Reverse Holo] #14 |
| 45 | GV-PK-EX-15 | Kingler | ecard1 | 15 | name_number_present_set_alias_or_variant_gap | 48 | 2 | 2 | Kingler #15; Kingler [Reverse Holo] #15 |
| 46 | GV-PK-EX-158 | Darkness Energy | ecard1 | 158 | name_number_present_set_alias_or_variant_gap | 70 | 3 | 3 | Darkness Energy [Holo] #158; Darkness Energy #158; Darkness Energy [Reverse Holo] #158 |
| 47 | GV-PK-EX-159 | Metal Energy | ecard1 | 159 | name_number_present_set_alias_or_variant_gap | 66 | 3 | 3 | Metal Energy [Holo] #159; Metal Energy #159; Metal Energy [Reverse Holo] #159 |
| 48 | GV-PK-EX-16 | Machamp | ecard1 | 16 | name_number_present_set_alias_or_variant_gap | 116 | 4 | 4 | Machamp #16; Machamp [Reverse Holo] #16; Machamp #16; Machamp [Reverse Holo] #16 |
| 49 | GV-PK-EX-17 | Magby | ecard1 | 17 | name_number_present_set_alias_or_variant_gap | 36 | 2 | 2 | Magby #17; Magby [Reverse Holo] #17 |
| 50 | GV-PK-EX-18 | Meganium | ecard1 | 18 | name_number_present_set_alias_or_variant_gap | 53 | 2 | 2 | Meganium #18; Meganium [Reverse Holo] #18 |

## Sample Ambiguous Or Blocked Candidates

| # | ID | Raw title | Disposition | Variant label | Flags |
| ---: | --- | --- | --- | --- | --- |
| 1 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 2 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 3 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 4 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 5 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 6 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 7 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 8 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 9 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 10 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 11 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 12 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 13 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 14 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 15 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 16 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 17 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 18 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 19 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 20 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 21 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 22 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 23 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 24 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 25 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 26 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 27 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 28 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 29 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 30 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 31 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 32 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 33 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 34 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 35 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 36 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 37 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 38 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 39 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1999-2000 | ambiguous_variant, manual_review_required, wrong_print_run |
| 40 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 41 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 42 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 43 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 44 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 45 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 46 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | blocked_wrong_print_run | Shadowless | ambiguous_variant, manual_review_required, wrong_print_run |
| 47 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | blocked_wrong_print_run | Shadowless | ambiguous_variant, manual_review_required, wrong_print_run |
| 48 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | blocked_wrong_print_run | Shadowless | ambiguous_variant, manual_review_required, wrong_print_run |
| 49 | GV-PK-BS-18 | Dragonair [1st Edition] #18 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |
| 50 | GV-PK-BS-18 | Dragonair [1st Edition] #18 \| Pokemon Base Set | blocked_wrong_print_run | 1st Edition | ambiguous_variant, manual_review_required, wrong_print_run |

## Recommendations

- number_prefix_alias_matching: Add governed source-number aliases such as BW01 -> 01 for promo-style lanes before rerunning acquisition.
- set_alias_matching: Add approved set aliases before widening source coverage.
- variant_lane_review: Keep variant-labeled PriceCharting rows review-gated; do not promote as market truth.
