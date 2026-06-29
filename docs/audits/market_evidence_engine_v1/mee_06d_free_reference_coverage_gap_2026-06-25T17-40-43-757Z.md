# MEE-06D Free Reference Coverage Gap V1

Generated: 2026-06-25T17:40:43.757Z

## Boundary

- Local coverage gap artifact only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.

## Summary

- target_count: 1000
- covered_target_count: 897
- uncovered_target_count: 103
- tcgcsv_model_eligible_card_count: 897
- pokemontcg_io_model_eligible_card_count: 197
- combined_model_eligible_card_count: 897
- batch: docs/audits/market_evidence_engine_v1/mee_04c_raw_evidence_acquisition_batch_2026-06-25T17-33-07-661Z.json
- tcgcsv_acquisition: docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-33-14-559Z.json
- tcgcsv_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-33-30-003Z.json
- pokemontcg_acquisition: docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-34-20-477Z.json
- pokemontcg_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-36-37-485Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06d_free_reference_coverage_gap_2026-06-25T17-40-43-757Z.json

## Coverage Buckets

| Bucket | Count |
| --- | ---: |
| tcgcsv_only_model_eligible | 700 |
| both_model_eligible | 197 |
| no_model_eligible_reference | 103 |

## Miss Reasons

| Reason | Count |
| --- | ---: |
| tcgcsv_product_gap_and_missing_pokemonapi_mapping | 103 |

## Status Pairs

| Status pair | Count |
| --- | ---: |
| candidate_evidence_created + missing_pokemonapi_external_id | 700 |
| candidate_evidence_created + candidate_evidence_created | 197 |
| no_tcgcsv_product_price_match + missing_pokemonapi_external_id | 103 |

## Uncovered Set Codes

| Set code | Count |
| --- | ---: |
| bwp | 98 |
| col1 | 5 |

## Sample Uncovered Targets

| # | ID | Name | Set | Number | TCGCSV | PokemonTCG.io | Reason |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | GV-PK-PR-BLW-BW01 | Snivy | bwp | 01 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 2 | GV-PK-PR-BLW-BW03 | Oshawott | bwp | 03 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 3 | GV-PK-PR-BLW-BW04 | Reshiram | bwp | 04 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 4 | GV-PK-PR-BLW-BW05 | Zekrom | bwp | 05 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 5 | GV-PK-PR-BLW-BW06 | Snivy | bwp | 06 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 6 | GV-PK-PR-BLW-BW07 | Tepig | bwp | 07 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 7 | GV-PK-PR-BLW-BW08 | Oshawott | bwp | 08 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 8 | GV-PK-PR-BLW-BW09 | Zoroark | bwp | 09 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 9 | GV-PK-PR-BLW-BW10 | Axew | bwp | 10 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 10 | GV-PK-PR-BLW-BW101 | Genesect | bwp | 101 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 11 | GV-PK-PR-BLW-BW11 | Pansage | bwp | 11 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 12 | GV-PK-PR-BLW-BW12 | Zorua | bwp | 12 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 13 | GV-PK-PR-BLW-BW14 | Pansage | bwp | 14 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 14 | GV-PK-PR-BLW-BW15 | Pidove | bwp | 15 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 15 | GV-PK-PR-BLW-BW16 | Axew | bwp | 16 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 16 | GV-PK-PR-BLW-BW17 | Ducklett | bwp | 17 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 17 | GV-PK-PR-BLW-BW18 | Darumaka | bwp | 18 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 18 | GV-PK-PR-BLW-BW19 | Zoroark | bwp | 19 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 19 | GV-PK-PR-BLW-BW20 | Serperior | bwp | 20 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 20 | GV-PK-PR-BLW-BW21 | Emboar | bwp | 21 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 21 | GV-PK-PR-BLW-BW22 | Samurott | bwp | 22 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 22 | GV-PK-PR-BLW-BW23 | Reshiram | bwp | 23 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 23 | GV-PK-PR-BLW-BW24 | Zekrom | bwp | 24 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 24 | GV-PK-PR-BLW-BW26 | Axew | bwp | 26 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 25 | GV-PK-PR-BLW-BW27 | Litwick | bwp | 27 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 26 | GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP | Tropical Beach | bwp | 28 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 27 | GV-PK-PR-BLW-28-WORLDS-11-TOP-16-STAMP | Tropical Beach | bwp | 28 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 28 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2013-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 29 | GV-PK-PR-BLW-29-BATTLE-ROAD-SPRING-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 30 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2011-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 31 | GV-PK-PR-BLW-29-BATTLE-ROAD-AUTUMN-2012-3RD-PLACE-STAMP | Victory Cup | bwp | 29 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 32 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2011-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 33 | GV-PK-PR-BLW-30-BATTLE-ROAD-AUTUMN-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 34 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2012-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 35 | GV-PK-PR-BLW-30-BATTLE-ROAD-SPRING-2013-2ND-PLACE-STAMP | Victory Cup | bwp | 30 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 36 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2011-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 37 | GV-PK-PR-BLW-31-BATTLE-ROAD-AUTUMN-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 38 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2012-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 39 | GV-PK-PR-BLW-31-BATTLE-ROAD-SPRING-2013-1ST-PLACE-STAMP | Victory Cup | bwp | 31 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 40 | GV-PK-PR-BLW-BW32 | Victini | bwp | 32 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 41 | GV-PK-PR-BLW-BW33 | Riolu | bwp | 33 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 42 | GV-PK-PR-BLW-BW35 | Meowth | bwp | 35 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 43 | GV-PK-PR-BLW-BW36 | Reshiram-EX | bwp | 36 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 44 | GV-PK-PR-BLW-BW37 | Kyurem-EX | bwp | 37 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 45 | GV-PK-PR-BLW-BW38 | Zekrom-EX | bwp | 38 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 46 | GV-PK-PR-BLW-BW39 | Battle City | bwp | 39 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 47 | GV-PK-PR-BLW-40-PRERELEASE-STAMP | Volcarona | bwp | 40 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 48 | GV-PK-PR-BLW-40-STAFF-PRERELEASE-STAMP | Volcarona | bwp | 40 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 49 | GV-PK-PR-BLW-BW41 | Thundurus | bwp | 41 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |
| 50 | GV-PK-PR-BLW-BW42 | Tornadus | bwp | 42 | no_tcgcsv_product_price_match | missing_pokemonapi_external_id | tcgcsv_product_gap_and_missing_pokemonapi_mapping |

## Recommendations

- prioritize_tcgcsv_product_gap: Inspect no_tcgcsv_product_price_match rows first; these are the remaining free-reference misses after group aliasing succeeds.
- backfill_pokemonapi_mappings: Backfill PokemonTCG external IDs for rows already covered by TCGCSV so PokemonTCG.io can corroborate reference buckets.
- defer_warehouse_until_gap_policy: Do not write warehouse evidence until coverage gaps and source precedence are documented.
