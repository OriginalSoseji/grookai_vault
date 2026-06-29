# MEE-06D Free Reference Coverage Gap V1

Generated: 2026-06-25T17:46:08.509Z

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
- covered_target_count: 993
- uncovered_target_count: 7
- tcgcsv_model_eligible_card_count: 993
- pokemontcg_io_model_eligible_card_count: 197
- combined_model_eligible_card_count: 993
- batch: docs/audits/market_evidence_engine_v1/mee_04c_raw_evidence_acquisition_batch_2026-06-25T17-33-07-661Z.json
- tcgcsv_acquisition: docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-45-49-629Z.json
- tcgcsv_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-45-57-604Z.json
- pokemontcg_acquisition: docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-34-20-477Z.json
- pokemontcg_normalized: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-36-37-485Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06d_free_reference_coverage_gap_2026-06-25T17-46-08-509Z.json

## Coverage Buckets

| Bucket | Count |
| --- | ---: |
| tcgcsv_only_model_eligible | 796 |
| both_model_eligible | 197 |
| no_model_eligible_reference | 7 |

## Miss Reasons

| Reason | Count |
| --- | ---: |
| tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping | 7 |

## Status Pairs

| Status pair | Count |
| --- | ---: |
| candidate_evidence_created + missing_pokemonapi_external_id | 796 |
| candidate_evidence_created + candidate_evidence_created | 197 |
| no_tcgcsv_price_rows_for_product + missing_pokemonapi_external_id | 7 |

## Uncovered Set Codes

| Set code | Count |
| --- | ---: |
| bwp | 7 |

## Sample Uncovered Targets

| # | ID | Name | Set | Number | TCGCSV | PokemonTCG.io | Reason |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | GV-PK-PR-BLW-BW15 | Pidove | bwp | 15 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 2 | GV-PK-PR-BLW-28-WORLDS-11-STAFF-STAMP | Tropical Beach | bwp | 28 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 3 | GV-PK-PR-BLW-28-WORLDS-11-TOP-16-STAMP | Tropical Beach | bwp | 28 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 4 | GV-PK-PR-BLW-50-WORLDS-12-STAMP | Tropical Beach | bwp | 50 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 5 | GV-PK-PR-BLW-50-WORLDS-12-TOP-32-STAMP | Tropical Beach | bwp | 50 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 6 | GV-PK-PR-BLW-BW85 | Lucario | bwp | 85 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |
| 7 | GV-PK-PR-BLW-BW97 | Eevee | bwp | 97 | no_tcgcsv_price_rows_for_product | missing_pokemonapi_external_id | tcgcsv_product_has_no_price_rows_and_missing_pokemonapi_mapping |

## Recommendations

- prioritize_tcgcsv_product_gap: Inspect no_tcgcsv_product_price_match rows first; these are the remaining free-reference misses after group aliasing succeeds.
- backfill_pokemonapi_mappings: Backfill PokemonTCG external IDs for rows already covered by TCGCSV so PokemonTCG.io can corroborate reference buckets.
- defer_warehouse_until_gap_policy: Do not write warehouse evidence until coverage gaps and source precedence are documented.
