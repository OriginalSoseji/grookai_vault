# MEE-04C Raw Evidence Acquisition Batch V1

Generated: 2026-06-25T17:12:22.140Z

## Boundary

- Dry-run acquisition batch only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.
- No raw evidence objects were created.

## Summary

- queued_items: 100
- target_count: 17
- sources: pokemontcg_io_reference, tcgcsv_reference, ebay_user_export, tcgplayer_user_export, justtcg_reference, manual_review_candidate
- query_plan: docs/audits/market_evidence_engine_v1/mee_04b_multi_source_query_plan_2026-06-25T17-12-15-791Z.json
- json: docs/audits/market_evidence_engine_v1/mee_04c_raw_evidence_acquisition_batch_2026-06-25T17-12-22-140Z.json

## Source Counts

| Source | Queued |
| --- | ---: |
| ebay_user_export | 17 |
| justtcg_reference | 16 |
| manual_review_candidate | 16 |
| pokemontcg_io_reference | 17 |
| tcgcsv_reference | 17 |
| tcgplayer_user_export | 17 |

## Top Queued Items

| # | Source | Card | ID | Status |
| ---: | --- | --- | --- | --- |
| 1 | ebay_user_export | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 2 | pokemontcg_io_reference | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 3 | tcgcsv_reference | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 4 | tcgplayer_user_export | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 5 | justtcg_reference | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 6 | manual_review_candidate | Alakazam (base1 #1) | GV-PK-BS-1 | queued_not_fetched |
| 7 | ebay_user_export | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 8 | pokemontcg_io_reference | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 9 | tcgcsv_reference | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 10 | tcgplayer_user_export | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 11 | justtcg_reference | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 12 | manual_review_candidate | Mewtwo (base1 #10) | GV-PK-BS-10 | queued_not_fetched |
| 13 | ebay_user_export | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 14 | pokemontcg_io_reference | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 15 | tcgcsv_reference | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 16 | tcgplayer_user_export | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 17 | justtcg_reference | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 18 | manual_review_candidate | Nidoking (base1 #11) | GV-PK-BS-11 | queued_not_fetched |
| 19 | ebay_user_export | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 20 | pokemontcg_io_reference | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 21 | tcgcsv_reference | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 22 | tcgplayer_user_export | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 23 | justtcg_reference | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 24 | manual_review_candidate | Ninetales (base1 #12) | GV-PK-BS-12 | queued_not_fetched |
| 25 | ebay_user_export | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 26 | pokemontcg_io_reference | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 27 | tcgcsv_reference | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 28 | tcgplayer_user_export | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 29 | justtcg_reference | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 30 | manual_review_candidate | Poliwrath (base1 #13) | GV-PK-BS-13 | queued_not_fetched |
| 31 | ebay_user_export | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 32 | pokemontcg_io_reference | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 33 | tcgcsv_reference | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 34 | tcgplayer_user_export | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 35 | justtcg_reference | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 36 | manual_review_candidate | Venusaur (base1 #15) | GV-PK-BS-15 | queued_not_fetched |
| 37 | ebay_user_export | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 38 | pokemontcg_io_reference | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 39 | tcgcsv_reference | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 40 | tcgplayer_user_export | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 41 | justtcg_reference | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 42 | manual_review_candidate | Zapdos (base1 #16) | GV-PK-BS-16 | queued_not_fetched |
| 43 | ebay_user_export | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 44 | pokemontcg_io_reference | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 45 | tcgcsv_reference | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 46 | tcgplayer_user_export | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 47 | justtcg_reference | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 48 | manual_review_candidate | Beedrill (base1 #17) | GV-PK-BS-17 | queued_not_fetched |
| 49 | ebay_user_export | Dragonair (base1 #18) | GV-PK-BS-18 | queued_not_fetched |
| 50 | pokemontcg_io_reference | Dragonair (base1 #18) | GV-PK-BS-18 | queued_not_fetched |

## Next Step

Proceed to a tiny approved fetch implementation only after selecting one source lane and confirming the allowed access method. The fetch implementation must write raw evidence candidates only, with no price rollups or public pricing.
