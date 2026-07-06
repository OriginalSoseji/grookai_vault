# MEE-05B Raw Evidence Gap Analysis V1

Generated: 2026-06-25T14:07:45.901Z

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
- no_match_target_count: 420
- candidate_evidence_count: 20918
- ambiguous_or_blocked_candidate_count: 8267
- csv_pokemon_card_rows: 73149
- acquisition: docs/audits/market_evidence_engine_v1/mee_04d_pricecharting_csv_raw_evidence_2026-06-25T13-47-56-814Z.json
- csv: tmp/pricecharting/pokemon_cards_pricecharting.csv
- json: docs/audits/market_evidence_engine_v1/mee_05b_raw_evidence_gap_analysis_2026-06-25T14-07-45-901Z.json

## No-Match Gap Reasons

| Reason | Count |
| --- | ---: |
| name_present_number_missing | 218 |
| name_number_present_set_alias_or_variant_gap | 129 |
| no_name_in_pricecharting_csv | 65 |
| name_present_prefixed_number_gap | 8 |

## No-Match Set Codes

| Set code | Count |
| --- | ---: |
| me02.5 | 122 |
| ecard1 | 69 |
| me03 | 46 |
| ex6 | 40 |
| me01 | 39 |
| ex4 | 30 |
| exu | 24 |
| pl2 | 14 |
| col1 | 5 |
| dp6 | 4 |
| pl4 | 4 |
| smp | 4 |
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
| review_ambiguous_variant | 7173 |
| blocked_wrong_print_run | 1094 |

## Ambiguous Or Blocked Variant Labels

| Variant label | Count |
| --- | ---: |
| Reverse Holo | 5014 |
| 1st Edition | 956 |
| Holo | 543 |
| Cosmos Holo | 198 |
| Prerelease Staff | 186 |
| Prize Pack | 178 |
| Jumbo | 118 |
| 1999-2000 | 94 |
| Cracked Ice | 93 |
| Staff | 89 |
| Prerelease | 87 |
| Stamped | 79 |
| Gold Star | 57 |
| Master Ball | 56 |
| No Symbol | 48 |
| Cracked Ice Holo | 29 |
| Pokemon League | 29 |
| Shadowless | 24 |
| EB Games | 16 |
| League | 15 |
| Regional Championships | 13 |
| 1st Place | 12 |
| 2nd Place | 12 |
| 3rd Place | 12 |
| Crosshatch Holo | 12 |
| Double Holo Error | 12 |
| Pre-Release Staff | 12 |
| 1st Edition Double Holo Error | 11 |
| GameStop | 11 |
| National Championships | 11 |
| Reverse | 10 |
| Cosmos | 9 |
| Pre-Release | 9 |
| 1st Place League | 7 |
| National Championships Staff | 7 |
| All Nippon Airways | 6 |
| Prize Pack Cosmos Holo | 6 |
| Stamp | 6 |
| Non-Holo | 5 |
| Crosshatch Pokemon League | 4 |

## Sample Prefix-Number Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | GV-PK-COL-SL5 | Ho-Oh | col1 | 5 | name_present_prefixed_number_gap | 48 | 0 | 1 | Ho-Oh #SL5 |
| 2 | GV-PK-SF-SH2 | Duskull | dp7 | 2 | name_present_prefixed_number_gap | 84 | 0 | 1 | Duskull #SH2 |
| 3 | GV-PK-RR-RT1 | Fan Rotom | pl2 | 1 | name_present_prefixed_number_gap | 23 | 0 | 1 | Fan Rotom #RT1 |
| 4 | GV-PK-RR-RT3 | Heat Rotom | pl2 | 3 | name_present_prefixed_number_gap | 14 | 0 | 1 | Heat Rotom #RT3 |
| 5 | GV-PK-AR-AR1 | Arceus | pl4 | 1 | name_present_prefixed_number_gap | 41 | 0 | 1 | Arceus #AR1 |
| 6 | GV-PK-AR-SH12 | Shinx | pl4 | 12 | name_present_prefixed_number_gap | 79 | 0 | 1 | Shinx #SH12 |
| 7 | GV-PK-AR-AR6 | Arceus | pl4 | 6 | name_present_prefixed_number_gap | 41 | 0 | 1 | Arceus #AR6 |
| 8 | GV-PK-AR-AR9 | Arceus | pl4 | 9 | name_present_prefixed_number_gap | 41 | 0 | 1 | Arceus #AR9 |

## Sample Set Alias Or Variant Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | GV-PK-COL-SL1 | Deoxys | col1 | 1 | name_number_present_set_alias_or_variant_gap | 91 | 2 | 3 | Deoxys #1; Deoxys [Reverse Holo] #1 |
| 2 | GV-PK-COL-SL10 | Rayquaza | col1 | 10 | name_number_present_set_alias_or_variant_gap | 66 | 1 | 2 | Rayquaza #10 |
| 3 | GV-PK-COL-SL6 | Kyogre | col1 | 6 | name_number_present_set_alias_or_variant_gap | 51 | 2 | 3 | Kyogre #6; Kyogre [Reverse Holo] #6 |
| 4 | GV-PK-COL-SL8 | Palkia | col1 | 8 | name_number_present_set_alias_or_variant_gap | 35 | 1 | 2 | Palkia #8 |
| 5 | GV-PK-EX-10 | Dugtrio | ecard1 | 10 | name_number_present_set_alias_or_variant_gap | 85 | 2 | 2 | Dugtrio #10; Dugtrio [Reverse Holo] #10 |
| 6 | GV-PK-EX-11 | Fearow | ecard1 | 11 | name_number_present_set_alias_or_variant_gap | 72 | 2 | 2 | Fearow #11; Fearow [Reverse Holo] #11 |
| 7 | GV-PK-EX-12 | Feraligatr | ecard1 | 12 | name_number_present_set_alias_or_variant_gap | 78 | 2 | 2 | Feraligatr #12; Feraligatr [Reverse Holo] #12 |
| 8 | GV-PK-EX-13 | Gengar | ecard1 | 13 | name_number_present_set_alias_or_variant_gap | 134 | 3 | 3 | Gengar #13; Gengar [Reverse Holo] #13; Gengar #13 |
| 9 | GV-PK-EX-14 | Golem | ecard1 | 14 | name_number_present_set_alias_or_variant_gap | 63 | 2 | 2 | Golem #14; Golem [Reverse Holo] #14 |
| 10 | GV-PK-EX-15 | Kingler | ecard1 | 15 | name_number_present_set_alias_or_variant_gap | 48 | 2 | 2 | Kingler #15; Kingler [Reverse Holo] #15 |
| 11 | GV-PK-EX-158 | Darkness Energy | ecard1 | 158 | name_number_present_set_alias_or_variant_gap | 70 | 3 | 3 | Darkness Energy [Holo] #158; Darkness Energy #158; Darkness Energy [Reverse Holo] #158 |
| 12 | GV-PK-EX-159 | Metal Energy | ecard1 | 159 | name_number_present_set_alias_or_variant_gap | 66 | 3 | 3 | Metal Energy [Holo] #159; Metal Energy #159; Metal Energy [Reverse Holo] #159 |
| 13 | GV-PK-EX-16 | Machamp | ecard1 | 16 | name_number_present_set_alias_or_variant_gap | 116 | 4 | 4 | Machamp #16; Machamp [Reverse Holo] #16; Machamp #16; Machamp [Reverse Holo] #16 |
| 14 | GV-PK-EX-17 | Magby | ecard1 | 17 | name_number_present_set_alias_or_variant_gap | 36 | 2 | 2 | Magby #17; Magby [Reverse Holo] #17 |
| 15 | GV-PK-EX-18 | Meganium | ecard1 | 18 | name_number_present_set_alias_or_variant_gap | 53 | 2 | 2 | Meganium #18; Meganium [Reverse Holo] #18 |
| 16 | GV-PK-EX-19 | Mew | ecard1 | 19 | name_number_present_set_alias_or_variant_gap | 110 | 2 | 2 | Mew #19; Mew [Reverse Holo] #19 |
| 17 | GV-PK-EX-2 | Ampharos | ecard1 | 2 | name_number_present_set_alias_or_variant_gap | 81 | 2 | 2 | Ampharos #2; Ampharos [Reverse Holo] #2 |
| 18 | GV-PK-EX-20 | Mewtwo | ecard1 | 20 | name_number_present_set_alias_or_variant_gap | 128 | 2 | 2 | Mewtwo #20; Mewtwo [Reverse Holo] #20 |
| 19 | GV-PK-EX-21 | Ninetales | ecard1 | 21 | name_number_present_set_alias_or_variant_gap | 130 | 6 | 6 | Ninetales #21; Ninetales [Reverse Holo] #21; Ninetales #21; Ninetales [Reverse Holo] #21; Ninetales #21 |
| 20 | GV-PK-EX-22 | Pichu | ecard1 | 22 | name_number_present_set_alias_or_variant_gap | 58 | 2 | 2 | Pichu #22; Pichu [Reverse Holo] #22 |
| 21 | GV-PK-EX-23 | Pidgeot | ecard1 | 23 | name_number_present_set_alias_or_variant_gap | 66 | 4 | 4 | Pidgeot #23; Pidgeot [Reverse Holo] #23; Pidgeot #23; Pidgeot [1st Edition] #23 |
| 22 | GV-PK-EX-24 | Poliwrath | ecard1 | 24 | name_number_present_set_alias_or_variant_gap | 85 | 2 | 3 | Poliwrath #24; Poliwrath [Reverse Holo] #24 |
| 23 | GV-PK-EX-26 | Rapidash | ecard1 | 26 | name_number_present_set_alias_or_variant_gap | 100 | 2 | 2 | Rapidash #26; Rapidash [Reverse Holo] #26 |
| 24 | GV-PK-EX-27 | Skarmory | ecard1 | 27 | name_number_present_set_alias_or_variant_gap | 95 | 2 | 2 | Skarmory #27; Skarmory [Reverse Holo] #27 |
| 25 | GV-PK-EX-28 | Typhlosion | ecard1 | 28 | name_number_present_set_alias_or_variant_gap | 56 | 2 | 2 | Typhlosion #28; Typhlosion [Reverse Holo] #28 |
| 26 | GV-PK-EX-29 | Tyranitar | ecard1 | 29 | name_number_present_set_alias_or_variant_gap | 88 | 3 | 3 | Tyranitar #29; Tyranitar [Reverse Holo] #29; Tyranitar [1st Edition] #29 |
| 27 | GV-PK-EX-3 | Arbok | ecard1 | 3 | name_number_present_set_alias_or_variant_gap | 62 | 3 | 3 | Arbok #3; Arbok [Reverse Holo] #3; Arbok #3 |
| 28 | GV-PK-EX-30 | Venusaur | ecard1 | 30 | name_number_present_set_alias_or_variant_gap | 95 | 3 | 3 | Venusaur #30; Venusaur [Reverse Holo] #30; Venusaur #30 |
| 29 | GV-PK-EX-31 | Vileplume | ecard1 | 31 | name_number_present_set_alias_or_variant_gap | 82 | 4 | 5 | Vileplume #31; Vileplume [Reverse Holo] #31; Vileplume #31; Vileplume [1st Edition] #31 |
| 30 | GV-PK-EX-32 | Weezing | ecard1 | 32 | name_number_present_set_alias_or_variant_gap | 79 | 2 | 2 | Weezing #32; Weezing [Reverse Holo] #32 |
| 31 | GV-PK-EX-33 | Alakazam | ecard1 | 33 | name_number_present_set_alias_or_variant_gap | 66 | 5 | 5 | Alakazam #33; Alakazam [For Position Only] #33; Alakazam [Reverse Holo] #33; Alakazam [Gold Star 1st Edition] #33; Alakazam [Gold Star] #33 |
| 32 | GV-PK-EX-34 | Ampharos | ecard1 | 34 | name_number_present_set_alias_or_variant_gap | 81 | 5 | 5 | Ampharos #34; Ampharos [For Position Only] #34; Ampharos [Reverse Holo] #34; Ampharos #34; Ampharos [Reverse Holofoil] #34 |
| 33 | GV-PK-EX-35 | Arbok | ecard1 | 35 | name_number_present_set_alias_or_variant_gap | 62 | 3 | 3 | Arbok #35; Arbok [For Position Only] #35; Arbok [Reverse Holo] #35 |
| 34 | GV-PK-EX-36 | Blastoise | ecard1 | 36 | name_number_present_set_alias_or_variant_gap | 109 | 3 | 3 | Blastoise #36; Blastoise [For Position Only] #36; Blastoise [Reverse Holo] #36 |
| 35 | GV-PK-EX-37 | Blastoise | ecard1 | 37 | name_number_present_set_alias_or_variant_gap | 109 | 2 | 2 | Blastoise #37; Blastoise [Reverse Holo] #37 |
| 36 | GV-PK-EX-38 | Butterfree | ecard1 | 38 | name_number_present_set_alias_or_variant_gap | 88 | 2 | 2 | Butterfree #38; Butterfree [Reverse Holo] #38 |
| 37 | GV-PK-EX-39 | Charizard | ecard1 | 39 | name_number_present_set_alias_or_variant_gap | 178 | 4 | 4 | Charizard #39; Charizard #39; Charizard [For Position Only] #39; Charizard [Reverse Holo] #39 |
| 38 | GV-PK-EX-4 | Blastoise | ecard1 | 4 | name_number_present_set_alias_or_variant_gap | 109 | 2 | 3 | Blastoise #4; Blastoise [Reverse Holo] #4 |
| 39 | GV-PK-EX-40 | Charizard | ecard1 | 40 | name_number_present_set_alias_or_variant_gap | 178 | 2 | 2 | Charizard #40; Charizard [Reverse Holo] #40 |
| 40 | GV-PK-EX-41 | Clefable | ecard1 | 41 | name_number_present_set_alias_or_variant_gap | 98 | 3 | 3 | Clefable #41; Clefable [For Position Only] #41; Clefable [Reverse Holo] #41 |
| 41 | GV-PK-EX-42 | Cloyster | ecard1 | 42 | name_number_present_set_alias_or_variant_gap | 59 | 2 | 2 | Cloyster #42; Cloyster [Reverse Holo] #42 |
| 42 | GV-PK-EX-43 | Dragonite | ecard1 | 43 | name_number_present_set_alias_or_variant_gap | 99 | 4 | 4 | Dragonite #43; Dragonite [Reverse Holo] #43; Dragonite #43; Dragonite [1st Edition] #43 |
| 43 | GV-PK-EX-44 | Dugtrio | ecard1 | 44 | name_number_present_set_alias_or_variant_gap | 85 | 4 | 4 | Dugtrio #44; Dugtrio [For Position Only] #44; Dugtrio [Reverse Holo] #44; Dugtrio #44 |
| 44 | GV-PK-EX-45 | Fearow | ecard1 | 45 | name_number_present_set_alias_or_variant_gap | 72 | 2 | 2 | Fearow #45; Fearow [Reverse Holo] #45 |
| 45 | GV-PK-EX-46 | Feraligatr | ecard1 | 46 | name_number_present_set_alias_or_variant_gap | 78 | 2 | 2 | Feraligatr #46; Feraligatr [Reverse Holo] #46 |
| 46 | GV-PK-EX-48 | Gengar | ecard1 | 48 | name_number_present_set_alias_or_variant_gap | 134 | 3 | 3 | Gengar #48; Gengar [Reverse Holo] #48; Gengar #48 |
| 47 | GV-PK-EX-49 | Golem | ecard1 | 49 | name_number_present_set_alias_or_variant_gap | 63 | 2 | 2 | Golem #49; Golem [Reverse Holo] #49 |
| 48 | GV-PK-EX-5 | Butterfree | ecard1 | 5 | name_number_present_set_alias_or_variant_gap | 88 | 5 | 5 | Butterfree #5; Butterfree [Reverse Holo] #5; Butterfree #5; Butterfree [Reverse Holo] #5; Butterfree #5 |
| 49 | GV-PK-EX-50 | Kingler | ecard1 | 50 | name_number_present_set_alias_or_variant_gap | 48 | 2 | 2 | Kingler #50; Kingler [Reverse Holo] #50 |
| 50 | GV-PK-EX-51 | Machamp | ecard1 | 51 | name_number_present_set_alias_or_variant_gap | 116 | 6 | 6 | Machamp #51; Machamp [Reverse Holo] #51; Machamp #51; Machamp [1st Edition] #51; Machamp #51 |

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
