# MEE-05A Raw Evidence Review Gate V1

Generated: 2026-06-25T15:21:30.135Z

## Boundary

- Local review artifact only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.
- Every candidate remains review-gated and cannot publish directly.

## Summary

- reviewed_target_count: 5000
- targets_with_candidate_evidence: 4711
- targets_without_candidate_evidence: 289
- candidate_evidence_count: 21623
- candidates_without_blocking_flags: 13045
- candidates_with_blocking_flags: 8578
- warehouse_ready_reference_candidate_count: 21623
- direct_publishable_candidate_count: 0
- non_review_gated_candidate_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_04d_pricecharting_csv_raw_evidence_2026-06-25T14-58-48-293Z.json
- json: docs/audits/market_evidence_engine_v1/mee_05a_raw_evidence_review_gate_2026-06-25T15-21-30-135Z.json

## Proofs

- no_candidate_can_publish_directly: true
- every_candidate_is_review_gated: true
- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true

## Target Status Counts

| Status | Count |
| --- | ---: |
| candidate_evidence_created | 4711 |
| no_pricecharting_csv_match | 289 |

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| blocked_wrong_print_run | 1091 |
| review_ambiguous_variant | 7487 |
| review_high_confidence_reference | 13045 |

## Exclusion Flag Counts

| Flag | Count |
| --- | ---: |
| ambiguous_variant | 8578 |
| manual_review_required | 21623 |
| wrong_print_run | 1091 |

## Sample High Confidence Reference Candidates

| # | ID | Raw title | Raw price | Condition | Confidence | Disposition | Flags |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1 | GV-PK-BS-1 | Alakazam #1 \| Pokemon Base Set | 32.21 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 2 | GV-PK-BS-1 | Alakazam #1 \| Pokemon Base Set | 356.13 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 3 | GV-PK-BS-1 | Alakazam #1 \| Pokemon Base Set | 136 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 4 | GV-PK-BS-10 | Mewtwo #10 \| Pokemon Base Set | 31.31 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 5 | GV-PK-BS-10 | Mewtwo #10 \| Pokemon Base Set | 375 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 6 | GV-PK-BS-10 | Mewtwo #10 \| Pokemon Base Set | 152.25 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 7 | GV-PK-BS-11 | Nidoking #11 \| Pokemon Base Set | 16.87 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 8 | GV-PK-BS-11 | Nidoking #11 \| Pokemon Base Set | 168.67 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 9 | GV-PK-BS-11 | Nidoking #11 \| Pokemon Base Set | 80.39 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 10 | GV-PK-BS-12 | Ninetales #12 \| Pokemon Base Set | 16 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 11 | GV-PK-BS-12 | Ninetales #12 \| Pokemon Base Set | 184.43 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 12 | GV-PK-BS-12 | Ninetales #12 \| Pokemon Base Set | 82.73 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 13 | GV-PK-BS-13 | Poliwrath #13 \| Pokemon Base Set | 13.49 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 14 | GV-PK-BS-13 | Poliwrath #13 \| Pokemon Base Set | 130.61 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 15 | GV-PK-BS-13 | Poliwrath #13 \| Pokemon Base Set | 69 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 16 | GV-PK-BS-15 | Venusaur #15 \| Pokemon Base Set | 83.99 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 17 | GV-PK-BS-15 | Venusaur #15 \| Pokemon Base Set | 585 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 18 | GV-PK-BS-15 | Venusaur #15 \| Pokemon Base Set | 281.19 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 19 | GV-PK-BS-16 | Zapdos #16 \| Pokemon Base Set | 25.75 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 20 | GV-PK-BS-16 | Zapdos #16 \| Pokemon Base Set | 170 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 21 | GV-PK-BS-16 | Zapdos #16 \| Pokemon Base Set | 86.64 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 22 | GV-PK-BS-17 | Beedrill #17 \| Pokemon Base Set | 2.65 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 23 | GV-PK-BS-17 | Beedrill #17 \| Pokemon Base Set | 47.11 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 24 | GV-PK-BS-17 | Beedrill #17 \| Pokemon Base Set | 21.48 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 25 | GV-PK-BS-18 | Dragonair #18 \| Pokemon Base Set | 8.48 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 26 | GV-PK-BS-18 | Dragonair #18 \| Pokemon Base Set | 48.17 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 27 | GV-PK-BS-18 | Dragonair #18 \| Pokemon Base Set | 40 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 28 | GV-PK-BS-19 | Dugtrio #19 \| Pokemon Base Set | 4.28 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 29 | GV-PK-BS-19 | Dugtrio #19 \| Pokemon Base Set | 46.54 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 30 | GV-PK-BS-19 | Dugtrio #19 \| Pokemon Base Set | 24.5 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 31 | GV-PK-BS-2 | Blastoise #2 \| Pokemon Base Set | 105.87 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 32 | GV-PK-BS-2 | Blastoise #2 \| Pokemon Base Set | 935 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 33 | GV-PK-BS-2 | Blastoise #2 \| Pokemon Base Set | 375 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 34 | GV-PK-BS-20 | Electabuzz #20 \| Pokemon Base Set | 5.99 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 35 | GV-PK-BS-20 | Electabuzz #20 \| Pokemon Base Set | 35.89 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 36 | GV-PK-BS-20 | Electabuzz #20 \| Pokemon Base Set | 31.11 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 37 | GV-PK-BS-21 | Electrode #21 \| Pokemon Base Set | 5.05 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 38 | GV-PK-BS-21 | Electrode #21 \| Pokemon Base Set | 36.14 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 39 | GV-PK-BS-21 | Electrode #21 \| Pokemon Base Set | 24.76 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 40 | GV-PK-BS-22 | Pidgeotto #22 \| Pokemon Base Set | 6 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 41 | GV-PK-BS-22 | Pidgeotto #22 \| Pokemon Base Set | 34.81 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 42 | GV-PK-BS-22 | Pidgeotto #22 \| Pokemon Base Set | 29.23 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 43 | GV-PK-BS-3 | Chansey #3 \| Pokemon Base Set | 16.6 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 44 | GV-PK-BS-3 | Chansey #3 \| Pokemon Base Set | 342.5 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 45 | GV-PK-BS-3 | Chansey #3 \| Pokemon Base Set | 81.5 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 46 | GV-PK-BS-5 | Clefairy #5 \| Pokemon Base Set | 14.97 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 47 | GV-PK-BS-5 | Clefairy #5 \| Pokemon Base Set | 275 | graded_reference | high | review_high_confidence_reference | manual_review_required |
| 48 | GV-PK-BS-5 | Clefairy #5 \| Pokemon Base Set | 69.73 | sealed_or_new_reference | high | review_high_confidence_reference | manual_review_required |
| 49 | GV-PK-BS-6 | Gyarados #6 \| Pokemon Base Set | 23.99 | loose_ungraded | high | review_high_confidence_reference | manual_review_required |
| 50 | GV-PK-BS-6 | Gyarados #6 \| Pokemon Base Set | 240.1 | graded_reference | high | review_high_confidence_reference | manual_review_required |

## Sample Blocked Or Ambiguous Candidates

| # | ID | Raw title | Raw price | Condition | Confidence | Disposition | Flags |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | 28.28 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 2 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | 1044.5 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 3 | GV-PK-BS-1 | Alakazam [1999-2000] #1 \| Pokemon Base Set | 262.01 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 4 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | 625 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 5 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | 5128.79 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 6 | GV-PK-BS-1 | Alakazam [1st Edition] #1 \| Pokemon Base Set | 2120.72 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 7 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | 19.99 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 8 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | 395.31 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 9 | GV-PK-BS-10 | Mewtwo [1999-2000] #10 \| Pokemon Base Set | 202.19 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 10 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | 871.39 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 11 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | 6633.23 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 12 | GV-PK-BS-10 | Mewtwo [1st Edition] #10 \| Pokemon Base Set | 2800 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 13 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | 15.42 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 14 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | 775.76 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 15 | GV-PK-BS-11 | Nidoking [1999-2000] #11 \| Pokemon Base Set | 72.99 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 16 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | 260 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 17 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | 2091.88 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 18 | GV-PK-BS-11 | Nidoking [1st Edition] #11 \| Pokemon Base Set | 1000 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 19 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | 14.88 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 20 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | 380 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 21 | GV-PK-BS-12 | Ninetales [1999-2000] #12 \| Pokemon Base Set | 193.66 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 22 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | 369.44 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 23 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | 2380.52 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 24 | GV-PK-BS-12 | Ninetales [1st Edition] #12 \| Pokemon Base Set | 1525 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 25 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | 12.69 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 26 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | 503.7 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 27 | GV-PK-BS-13 | Poliwrath [1999-2000] #13 \| Pokemon Base Set | 130.95 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 28 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | 300 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 29 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | 2110.5 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 30 | GV-PK-BS-13 | Poliwrath [1st Edition] #13 \| Pokemon Base Set | 999 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 31 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | 75 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 32 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | 1178 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 33 | GV-PK-BS-15 | Venusaur [1999-2000] #15 \| Pokemon Base Set | 620 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 34 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | 1050 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 35 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | 6012.01 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 36 | GV-PK-BS-15 | Venusaur [1st Edition] #15 \| Pokemon Base Set | 3456.86 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 37 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | 17.88 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 38 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | 1375 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 39 | GV-PK-BS-16 | Zapdos [1999-2000] #16 \| Pokemon Base Set | 90.03 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 40 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | 380 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 41 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | 1931.9 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 42 | GV-PK-BS-16 | Zapdos [1st Edition] #16 \| Pokemon Base Set | 1025 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 43 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | 113.9 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 44 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | 633.05 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 45 | GV-PK-BS-17 | Beedrill [1st Edition] #17 \| Pokemon Base Set | 295 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 46 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | 19.11 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 47 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | 70.35 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 48 | GV-PK-BS-17 | Beedrill [Shadowless] #17 \| Pokemon Base Set | 55.41 | sealed_or_new_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 49 | GV-PK-BS-18 | Dragonair [1st Edition] #18 \| Pokemon Base Set | 138.74 | loose_ungraded | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |
| 50 | GV-PK-BS-18 | Dragonair [1st Edition] #18 \| Pokemon Base Set | 628.3 | graded_reference | medium | blocked_wrong_print_run | ambiguous_variant, manual_review_required, wrong_print_run |

## Sample No-Match Targets

| # | ID | Name | Set | Number | Best match reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | GV-PK-SW-41 | Wormadam Plant Cloak | dp3 | 41 |  |
| 2 | GV-PK-SW-42 | Wormadam Sandy Cloak | dp3 | 42 |  |
| 3 | GV-PK-LA-1 | Deoxys Normal Forme | dp6 | 1 |  |
| 4 | GV-PK-LA-24 | Deoxys Attack Forme | dp6 | 24 |  |
| 5 | GV-PK-LA-25 | Deoxys Defense Forme | dp6 | 25 |  |
| 6 | GV-PK-LA-26 | Deoxys Speed Forme | dp6 | 26 |  |
| 7 | GV-PK-MA-1 | Team Aqua's Cacturne | ex4 | 1 |  |
| 8 | GV-PK-MA-10 | Team Magma's Houndoom | ex4 | 10 |  |
| 9 | GV-PK-MA-11 | Team Magma's Rhydon | ex4 | 11 |  |
| 10 | GV-PK-MA-12 | Team Magma's Torkoal | ex4 | 12 |  |
| 11 | GV-PK-MA-14 | Team Aqua's Crawdaunt | ex4 | 14 |  |
| 12 | GV-PK-MA-15 | Team Aqua's Mightyena | ex4 | 15 |  |
| 13 | GV-PK-MA-16 | Team Aqua's Sealeo | ex4 | 16 |  |
| 14 | GV-PK-MA-17 | Team Aqua's Seviper | ex4 | 17 |  |
| 15 | GV-PK-MA-18 | Team Aqua's Sharpedo | ex4 | 18 |  |
| 16 | GV-PK-MA-19 | Team Magma's Camerupt | ex4 | 19 |  |
| 17 | GV-PK-MA-2 | Team Aqua's Crawdaunt | ex4 | 2 |  |
| 18 | GV-PK-MA-20 | Team Magma's Lairon | ex4 | 20 |  |
| 19 | GV-PK-MA-21 | Team Magma's Mightyena | ex4 | 21 |  |
| 20 | GV-PK-MA-22 | Team Magma's Rhydon | ex4 | 22 |  |
| 21 | GV-PK-MA-23 | Team Magma's Zangoose | ex4 | 23 |  |
| 22 | GV-PK-MA-3 | Team Aqua's Kyogre | ex4 | 3 |  |
| 23 | GV-PK-MA-5 | Team Aqua's Sharpedo | ex4 | 5 |  |
| 24 | GV-PK-MA-6 | Team Aqua's Walrein | ex4 | 6 |  |
| 25 | GV-PK-MA-7 | Team Magma's Aggron | ex4 | 7 |  |
| 26 | GV-PK-MA-8 | Team Magma's Claydol | ex4 | 8 |  |
| 27 | GV-PK-UF-QMARK | Unown | exu | ? |  |
| 28 | GV-PK-UF-B | Unown | exu | B |  |
| 29 | GV-PK-UF-C | Unown | exu | C |  |
| 30 | GV-PK-UF-D | Unown | exu | D |  |
| 31 | GV-PK-UF-E | Unown | exu | E |  |
| 32 | GV-PK-UF-G | Unown | exu | G |  |
| 33 | GV-PK-UF-H | Unown | exu | H |  |
| 34 | GV-PK-UF-I | Unown | exu | I |  |
| 35 | GV-PK-UF-J | Unown | exu | J |  |
| 36 | GV-PK-UF-K | Unown | exu | K |  |
| 37 | GV-PK-UF-L | Unown | exu | L |  |
| 38 | GV-PK-UF-M | Unown | exu | M |  |
| 39 | GV-PK-UF-N | Unown | exu | N |  |
| 40 | GV-PK-UF-O | Unown | exu | O |  |
| 41 | GV-PK-UF-P | Unown | exu | P |  |
| 42 | GV-PK-UF-Q | Unown | exu | Q |  |
| 43 | GV-PK-UF-R | Unown | exu | R |  |
| 44 | GV-PK-UF-S | Unown | exu | S |  |
| 45 | GV-PK-UF-T | Unown | exu | T |  |
| 46 | GV-PK-UF-U | Unown | exu | U |  |
| 47 | GV-PK-UF-W | Unown | exu | W |  |
| 48 | GV-PK-UF-X | Unown | exu | X |  |
| 49 | GV-PK-UF-Y | Unown | exu | Y |  |
| 50 | GV-PK-UF-Z | Unown | exu | Z |  |

## Next Step

Use this review artifact to decide whether to draft a reference-evidence warehouse migration or first improve matching for the no-match and ambiguous buckets. Do not publish any candidate as a Grookai price from this artifact.
