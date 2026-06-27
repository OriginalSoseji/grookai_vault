# MEE-05A Raw Evidence Review Gate V1

Generated: 2026-06-25T13:19:28.068Z

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
- targets_with_candidate_evidence: 4153
- targets_without_candidate_evidence: 847
- candidate_evidence_count: 19359
- candidates_without_blocking_flags: 11462
- candidates_with_blocking_flags: 7897
- warehouse_ready_reference_candidate_count: 19359
- direct_publishable_candidate_count: 0
- non_review_gated_candidate_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_04d_pricecharting_csv_raw_evidence_2026-06-25T05-53-31-341Z.json
- json: docs/audits/market_evidence_engine_v1/mee_05a_raw_evidence_review_gate_2026-06-25T13-19-28-068Z.json

## Proofs

- no_candidate_can_publish_directly: true
- every_candidate_is_review_gated: true
- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true

## Target Status Counts

| Status | Count |
| --- | ---: |
| candidate_evidence_created | 4153 |
| no_pricecharting_csv_match | 847 |

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| blocked_wrong_print_run | 1094 |
| review_ambiguous_variant | 6803 |
| review_high_confidence_reference | 11462 |

## Exclusion Flag Counts

| Flag | Count |
| --- | ---: |
| ambiguous_variant | 7897 |
| manual_review_required | 19359 |
| wrong_print_run | 1094 |

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
| 1 | GV-PK-PR-BLW-BW01 | Snivy | bwp | 01 |  |
| 2 | GV-PK-PR-BLW-BW03 | Oshawott | bwp | 03 |  |
| 3 | GV-PK-PR-BLW-BW04 | Reshiram | bwp | 04 |  |
| 4 | GV-PK-PR-BLW-BW05 | Zekrom | bwp | 05 |  |
| 5 | GV-PK-PR-BLW-BW06 | Snivy | bwp | 06 |  |
| 6 | GV-PK-PR-BLW-BW07 | Tepig | bwp | 07 |  |
| 7 | GV-PK-PR-BLW-BW08 | Oshawott | bwp | 08 |  |
| 8 | GV-PK-PR-BLW-BW09 | Zoroark | bwp | 09 |  |
| 9 | GV-PK-PR-BLW-BW10 | Axew | bwp | 10 |  |
| 10 | GV-PK-PR-BLW-BW101 | Genesect | bwp | 101 |  |
| 11 | GV-PK-PR-BLW-BW11 | Pansage | bwp | 11 |  |
| 12 | GV-PK-PR-BLW-BW12 | Zorua | bwp | 12 |  |
| 13 | GV-PK-PR-BLW-BW14 | Pansage | bwp | 14 |  |
| 14 | GV-PK-PR-BLW-BW15 | Pidove | bwp | 15 |  |
| 15 | GV-PK-PR-BLW-BW16 | Axew | bwp | 16 |  |
| 16 | GV-PK-PR-BLW-BW17 | Ducklett | bwp | 17 |  |
| 17 | GV-PK-PR-BLW-BW18 | Darumaka | bwp | 18 |  |
| 18 | GV-PK-PR-BLW-BW19 | Zoroark | bwp | 19 |  |
| 19 | GV-PK-PR-BLW-BW20 | Serperior | bwp | 20 |  |
| 20 | GV-PK-PR-BLW-BW21 | Emboar | bwp | 21 |  |
| 21 | GV-PK-PR-BLW-BW22 | Samurott | bwp | 22 |  |
| 22 | GV-PK-PR-BLW-BW23 | Reshiram | bwp | 23 |  |
| 23 | GV-PK-PR-BLW-BW24 | Zekrom | bwp | 24 |  |
| 24 | GV-PK-PR-BLW-BW26 | Axew | bwp | 26 |  |
| 25 | GV-PK-PR-BLW-BW27 | Litwick | bwp | 27 |  |
| 26 | GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP | Tropical Beach | bwp | 28 |  |
| 27 | GV-PK-PR-BLW-28-WORLDS-11-TOP-16-STAMP | Tropical Beach | bwp | 28 |  |
| 28 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | Victory Cup | bwp | 29 |  |
| 29 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 |  |
| 30 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | Victory Cup | bwp | 29 |  |
| 31 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 |  |
| 32 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | Victory Cup | bwp | 30 |  |
| 33 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 |  |
| 34 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 |  |
| 35 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | Victory Cup | bwp | 30 |  |
| 36 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | Victory Cup | bwp | 31 |  |
| 37 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 |  |
| 38 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 |  |
| 39 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | Victory Cup | bwp | 31 |  |
| 40 | GV-PK-PR-BLW-BW32 | Victini | bwp | 32 |  |
| 41 | GV-PK-PR-BLW-BW33 | Riolu | bwp | 33 |  |
| 42 | GV-PK-PR-BLW-BW35 | Meowth | bwp | 35 |  |
| 43 | GV-PK-PR-BLW-BW36 | Reshiram-EX | bwp | 36 |  |
| 44 | GV-PK-PR-BLW-BW37 | Kyurem-EX | bwp | 37 |  |
| 45 | GV-PK-PR-BLW-BW38 | Zekrom-EX | bwp | 38 |  |
| 46 | GV-PK-PR-BLW-BW39 | Battle City | bwp | 39 |  |
| 47 | GV-PK-PR-BLW-40-PRERELEASE-STAMP | Volcarona | bwp | 40 |  |
| 48 | GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | Volcarona | bwp | 40 |  |
| 49 | GV-PK-PR-BLW-BW41 | Thundurus | bwp | 41 |  |
| 50 | GV-PK-PR-BLW-BW42 | Tornadus | bwp | 42 |  |

## Next Step

Use this review artifact to decide whether to draft a reference-evidence warehouse migration or first improve matching for the no-match and ambiguous buckets. Do not publish any candidate as a Grookai price from this artifact.
