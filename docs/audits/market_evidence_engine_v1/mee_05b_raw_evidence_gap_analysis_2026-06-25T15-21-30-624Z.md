# MEE-05B Raw Evidence Gap Analysis V1

Generated: 2026-06-25T15:21:30.624Z

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
- no_match_target_count: 289
- candidate_evidence_count: 21623
- ambiguous_or_blocked_candidate_count: 8578
- csv_pokemon_card_rows: 73149
- acquisition: docs/audits/market_evidence_engine_v1/mee_04d_pricecharting_csv_raw_evidence_2026-06-25T14-58-48-293Z.json
- csv: tmp/pricecharting/pokemon_cards_pricecharting.csv
- json: docs/audits/market_evidence_engine_v1/mee_05b_raw_evidence_gap_analysis_2026-06-25T15-21-30-624Z.json

## No-Match Gap Reasons

| Reason | Count |
| --- | ---: |
| name_present_number_missing | 218 |
| no_name_in_pricecharting_csv | 65 |
| name_number_present_set_alias_or_variant_gap | 6 |

## No-Match Set Codes

| Set code | Count |
| --- | ---: |
| me02.5 | 122 |
| me03 | 46 |
| me01 | 39 |
| exu | 24 |
| ex4 | 20 |
| pl2 | 12 |
| dp6 | 4 |
| smp | 4 |
| sv01 | 3 |
| dp3 | 2 |
| gym1 | 2 |
| neo4 | 2 |
| pgo | 2 |
| sm11 | 2 |
| sv02 | 2 |
| hgss1 | 1 |
| sm2 | 1 |
| sv03.5 | 1 |

## Ambiguous Or Blocked Dispositions

| Disposition | Count |
| --- | ---: |
| review_ambiguous_variant | 7487 |
| blocked_wrong_print_run | 1091 |

## Ambiguous Or Blocked Variant Labels

| Variant label | Count |
| --- | ---: |
| Reverse Holo | 5311 |
| 1st Edition | 953 |
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
| For Position Only | 15 |
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

## Sample Prefix-Number Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |

## Sample Set Alias Or Variant Gap Targets

| # | ID | Name | Set | Number | Reason | Name matches | Exact number | Prefixed number | Sample CSV products |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | GV-PK-MA-8 | Team Magma's Claydol | ex4 | 8 | name_number_present_set_alias_or_variant_gap | 7 | 1 | 1 | Team Magma's Claydol #8 |
| 2 | GV-PK-HS-110 | Typhlosion | hgss1 | 110 | name_number_present_set_alias_or_variant_gap | 56 | 1 | 1 | Typhlosion #110 |
| 3 | GV-PK-ASC-057 | Pikachu ex | me02.5 | 057 | name_number_present_set_alias_or_variant_gap | 29 | 2 | 2 | Pikachu Ex [Prize Pack] #57; Pikachu ex #57 |
| 4 | GV-PK-ME03-024 | Aurorus | me03 | 024 | name_number_present_set_alias_or_variant_gap | 9 | 2 | 2 | Aurorus #24; Aurorus [Stamped] #24 |
| 5 | GV-PK-SVI-190 | Professor's Research | sv01 | 190 | name_number_present_set_alias_or_variant_gap | 53 | 1 | 1 | Professor’s Research #190 |
| 6 | GV-PK-SVI-258 | Basic Fighting Energy | sv01 | 258 | name_number_present_set_alias_or_variant_gap | 17 | 1 | 1 | Basic Fighting Energy #258 |

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
