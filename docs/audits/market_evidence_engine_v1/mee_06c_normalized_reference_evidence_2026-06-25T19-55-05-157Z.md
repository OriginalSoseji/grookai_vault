# MEE-06C Normalized Reference Evidence V1

Generated: 2026-06-25T19:55:05.157Z

## Boundary

- Local normalization artifact only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.
- Quarantined and blocked rows cannot influence model inputs.

## Summary

- normalized_evidence_count: 10720
- model_eligible_count: 9725
- quarantined_count: 995
- blocked_count: 0
- direct_publishable_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_09j_pokemontcg_second_source_consolidated_manifest_2026-06-25T19-54-58-427Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T19-55-05-157Z.json

## Proofs

- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true
- no_candidate_can_publish_directly: true
- only_model_eligible_rows_receive_weight: true

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| quarantined_metric | 935 |
| quarantined_price_outlier | 60 |
| reference_model_candidate | 9725 |

## Quality Flag Counts

| Flag | Count |
| --- | ---: |
| high_ask_bucket_not_model_input | 935 |
| high_price_outlier | 370 |
| low_price_outlier | 16 |

## Sample Model Eligible Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| tcgplayer holofoil low | 1219.99 | USD | low | 0.45 | reference_model_candidate |  |
| 2 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| tcgplayer holofoil mid | 1364.9 | USD | mid | 0.65 | reference_model_candidate |  |
| 3 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal averageSellPrice | 39.99 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 4 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal lowPrice | 15 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 5 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal trendPrice | 63.48 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 6 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket reverse_holo reverseHoloTrend | 26.85 | EUR | reverseholotrend | 0.28 | reference_model_candidate |  |
| 7 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal lowPriceExPlus | 46.16 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 8 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal avg1 | 39.99 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 9 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal avg7 | 54.42 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 10 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket normal avg30 | 43.92 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 11 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket reverse_holo reverseHoloAvg1 | 30 | EUR | reverseholoavg1 | 0.28 | reference_model_candidate |  |
| 12 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket reverse_holo reverseHoloAvg7 | 27.74 | EUR | reverseholoavg7 | 0.28 | reference_model_candidate |  |
| 13 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| cardmarket reverse_holo reverseHoloAvg30 | 19.16 | EUR | reverseholoavg30 | 0.28 | reference_model_candidate |  |
| 14 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| tcgplayer holofoil market | 1150 | USD | market | 0.81 | reference_model_candidate |  |
| 15 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| tcgplayer holofoil low | 749.99 | USD | low | 0.45 | reference_model_candidate |  |
| 16 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal averageSellPrice | 350 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 17 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal lowPrice | 139.97 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 18 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal trendPrice | 302.44 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 19 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket reverse_holo reverseHoloTrend | 182.47 | EUR | reverseholotrend | 0.28 | reference_model_candidate |  |
| 20 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal lowPriceExPlus | 550 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 21 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal avg1 | 445 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 22 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal avg7 | 376.13 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 23 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket normal avg30 | 320.12 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 24 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket reverse_holo reverseHoloAvg1 | 80 | EUR | reverseholoavg1 | 0.28 | reference_model_candidate |  |
| 25 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket reverse_holo reverseHoloAvg7 | 240.71 | EUR | reverseholoavg7 | 0.28 | reference_model_candidate |  |
| 26 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| cardmarket reverse_holo reverseHoloAvg30 | 208.71 | EUR | reverseholoavg30 | 0.28 | reference_model_candidate |  |
| 27 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer holofoil market | 499 | USD | market | 0.81 | reference_model_candidate |  |
| 28 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer holofoil low | 500 | USD | low | 0.45 | reference_model_candidate |  |
| 29 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer holofoil mid | 657.5 | USD | mid | 0.65 | reference_model_candidate |  |
| 30 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer reverseHolofoil market | 2100 | USD | market | 0.81 | reference_model_candidate |  |

## Sample Quarantined Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| tcgplayer holofoil market | 149.81 | USD | market | 0.1 | quarantined_price_outlier | low_price_outlier |
| 2 | GV-PK-DRX-125 | pokemontcg_io_reference | Serperior #125 \| Dragons Exalted \| tcgplayer holofoil high | 1524.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 3 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| tcgplayer holofoil mid | 10375.49 | USD | mid | 0.1 | quarantined_price_outlier | high_price_outlier |
| 4 | GV-PK-PLS-136 | pokemontcg_io_reference | Charizard #136 \| Plasma Storm \| tcgplayer holofoil high | 21999.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 5 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer holofoil high | 899.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 6 | GV-PK-LC-3 | pokemontcg_io_reference | Charizard #3 \| Legendary Collection \| tcgplayer reverseHolofoil high | 4500 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 7 | GV-PK-COL-SL10 | pokemontcg_io_reference | Rayquaza #SL10 \| Call of Legends \| tcgplayer holofoil market | 543.19 | USD | market | 0.1 | quarantined_price_outlier | low_price_outlier |
| 8 | GV-PK-COL-SL10 | pokemontcg_io_reference | Rayquaza #SL10 \| Call of Legends \| tcgplayer holofoil low | 185.09 | USD | low | 0.1 | quarantined_price_outlier | low_price_outlier |
| 9 | GV-PK-COL-SL10 | pokemontcg_io_reference | Rayquaza #SL10 \| Call of Legends \| tcgplayer holofoil mid | 27494.89 | USD | mid | 0.1 | quarantined_price_outlier | high_price_outlier |
| 10 | GV-PK-COL-SL10 | pokemontcg_io_reference | Rayquaza #SL10 \| Call of Legends \| tcgplayer holofoil high | 27494.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 11 | GV-PK-PLF-122 | pokemontcg_io_reference | Ultra Ball #122 \| Plasma Freeze \| tcgplayer holofoil high | 1200 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 12 | GV-PK-DCR-6 | pokemontcg_io_reference | Team Aqua's Kyogre-EX #6 \| Double Crisis \| tcgplayer holofoil high | 1899.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 13 | GV-PK-PLS-137 | pokemontcg_io_reference | Blastoise #137 \| Plasma Storm \| tcgplayer holofoil high | 5050.23 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 14 | GV-PK-PR-BLW-BW101 | pokemontcg_io_reference | Genesect #BW101 \| BW Black Star Promos \| tcgplayer normal mid | 1663.09 | USD | mid | 0.1 | quarantined_price_outlier | high_price_outlier |
| 15 | GV-PK-PR-BLW-BW101 | pokemontcg_io_reference | Genesect #BW101 \| BW Black Star Promos \| tcgplayer normal high | 1663.1 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 16 | GV-PK-LTR-115 | pokemontcg_io_reference | Zekrom #115 \| Legendary Treasures \| tcgplayer holofoil high | 3929.62 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 17 | GV-PK-DCR-15 | pokemontcg_io_reference | Team Magma's Groudon-EX #15 \| Double Crisis \| tcgplayer holofoil high | 999.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 18 | GV-PK-SW-3 | pokemontcg_io_reference | Charizard #3 \| Secret Wonders \| tcgplayer holofoil high | 1389.77 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 19 | GV-PK-SW-3 | pokemontcg_io_reference | Charizard #3 \| Secret Wonders \| tcgplayer reverseHolofoil high | 1802.88 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 20 | GV-PK-PR-BLW-BW65 | pokemontcg_io_reference | Jigglypuff #BW65 \| BW Black Star Promos \| tcgplayer normal market | 0.97 | USD | market | 0.1 | quarantined_price_outlier | low_price_outlier |
| 21 | GV-PK-PR-BLW-BW65 | pokemontcg_io_reference | Jigglypuff #BW65 \| BW Black Star Promos \| tcgplayer normal high | 949.5 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 22 | GV-PK-LA-142 | pokemontcg_io_reference | Magnezone LV.X #142 \| Legends Awakened \| tcgplayer holofoil mid | 383.3 | USD | mid | 0.1 | quarantined_price_outlier | high_price_outlier |
| 23 | GV-PK-LA-142 | pokemontcg_io_reference | Magnezone LV.X #142 \| Legends Awakened \| tcgplayer holofoil high | 1400 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 24 | GV-PK-PR-BLW-BW98 | pokemontcg_io_reference | Mew #BW98 \| BW Black Star Promos \| tcgplayer holofoil high | 599.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 25 | GV-PK-LC-18 | pokemontcg_io_reference | Venusaur #18 \| Legendary Collection \| tcgplayer holofoil high | 2008.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 26 | GV-PK-LC-18 | pokemontcg_io_reference | Venusaur #18 \| Legendary Collection \| tcgplayer holofoil directLow | 2008.99 | USD | directlow | 0.1 | quarantined_price_outlier | high_price_outlier |
| 27 | GV-PK-LC-18 | pokemontcg_io_reference | Venusaur #18 \| Legendary Collection \| tcgplayer reverseHolofoil high | 1000 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 28 | GV-PK-BCR-89 | pokemontcg_io_reference | Landorus-EX #89 \| Boundaries Crossed \| tcgplayer holofoil mid | 100.49 | USD | mid | 0.1 | quarantined_price_outlier | high_price_outlier |
| 29 | GV-PK-BCR-89 | pokemontcg_io_reference | Landorus-EX #89 \| Boundaries Crossed \| tcgplayer holofoil high | 147.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 30 | GV-PK-MD-98 | pokemontcg_io_reference | Glaceon LV.X #98 \| Majestic Dawn \| tcgplayer holofoil high | 449.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |

## Next Step

Use this artifact to decide whether to scale free reference acquisition or tune metric policy before creating any warehouse writes.
