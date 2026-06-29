# MEE-06C Normalized Reference Evidence V1

Generated: 2026-06-25T17:29:08.925Z

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

- normalized_evidence_count: 2737
- model_eligible_count: 2460
- quarantined_count: 277
- blocked_count: 0
- direct_publishable_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-27-39-032Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-29-08-925Z.json

## Proofs

- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true
- no_candidate_can_publish_directly: true
- only_model_eligible_rows_receive_weight: true

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| quarantined_metric | 241 |
| quarantined_price_outlier | 36 |
| reference_model_candidate | 2460 |

## Quality Flag Counts

| Flag | Count |
| --- | ---: |
| high_ask_bucket_not_model_input | 241 |
| high_price_outlier | 200 |
| low_price_outlier | 12 |

## Sample Model Eligible Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| tcgplayer holofoil market | 84.13 | USD | market | 0.81 | reference_model_candidate |  |
| 2 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| tcgplayer holofoil low | 51.5 | USD | low | 0.45 | reference_model_candidate |  |
| 3 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| tcgplayer holofoil mid | 74.99 | USD | mid | 0.65 | reference_model_candidate |  |
| 4 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| tcgplayer holofoil directLow | 59.99 | USD | directlow | 0.45 | reference_model_candidate |  |
| 5 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal averageSellPrice | 354.98 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 6 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal lowPrice | 69.94 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 7 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal trendPrice | 268.62 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 8 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal lowPriceExPlus | 250 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 9 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal avg1 | 125 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 10 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal avg7 | 282.13 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 11 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| cardmarket normal avg30 | 188.1 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 12 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| tcgplayer holofoil market | 78.78 | USD | market | 0.81 | reference_model_candidate |  |
| 13 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| tcgplayer holofoil low | 34.99 | USD | low | 0.45 | reference_model_candidate |  |
| 14 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| tcgplayer holofoil mid | 67.73 | USD | mid | 0.65 | reference_model_candidate |  |
| 15 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| tcgplayer holofoil directLow | 40 | USD | directlow | 0.45 | reference_model_candidate |  |
| 16 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal averageSellPrice | 122.49 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 17 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal lowPrice | 49.99 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 18 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal trendPrice | 218.64 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 19 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal lowPriceExPlus | 110 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 20 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal avg1 | 565 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 21 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal avg7 | 258.12 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 22 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| cardmarket normal avg30 | 181.04 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 23 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| tcgplayer holofoil market | 38.81 | USD | market | 0.81 | reference_model_candidate |  |
| 24 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| tcgplayer holofoil low | 24.71 | USD | low | 0.45 | reference_model_candidate |  |
| 25 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| tcgplayer holofoil mid | 31 | USD | mid | 0.65 | reference_model_candidate |  |
| 26 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal averageSellPrice | 197.99 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 27 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal lowPrice | 50 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 28 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal trendPrice | 136.8 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 29 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal lowPriceExPlus | 87.99 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 30 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal avg1 | 445 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 31 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal avg7 | 160.7 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 32 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| cardmarket normal avg30 | 108.76 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 33 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| tcgplayer holofoil market | 36.87 | USD | market | 0.81 | reference_model_candidate |  |
| 34 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| tcgplayer holofoil low | 16.5 | USD | low | 0.45 | reference_model_candidate |  |
| 35 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| tcgplayer holofoil mid | 33.09 | USD | mid | 0.65 | reference_model_candidate |  |
| 36 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal averageSellPrice | 15.51 | EUR | averagesellprice | 0.81 | reference_model_candidate |  |
| 37 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal lowPrice | 1 | EUR | lowprice | 0.45 | reference_model_candidate |  |
| 38 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal trendPrice | 16.34 | EUR | trendprice | 0.81 | reference_model_candidate |  |
| 39 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket reverse_holo reverseHoloTrend | 19.81 | EUR | reverseholotrend | 0.28 | reference_model_candidate |  |
| 40 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal lowPriceExPlus | 6 | EUR | lowpriceexplus | 0.28 | reference_model_candidate |  |
| 41 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal avg1 | 3 | EUR | avg1 | 0.28 | reference_model_candidate |  |
| 42 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal avg7 | 19.05 | EUR | avg7 | 0.81 | reference_model_candidate |  |
| 43 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket normal avg30 | 15.24 | EUR | avg30 | 0.81 | reference_model_candidate |  |
| 44 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket reverse_holo reverseHoloAvg1 | 11.14 | EUR | reverseholoavg1 | 0.28 | reference_model_candidate |  |
| 45 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket reverse_holo reverseHoloAvg7 | 11.53 | EUR | reverseholoavg7 | 0.28 | reference_model_candidate |  |
| 46 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| cardmarket reverse_holo reverseHoloAvg30 | 12.92 | EUR | reverseholoavg30 | 0.28 | reference_model_candidate |  |
| 47 | GV-PK-BS-13 | pokemontcg_io_reference | Poliwrath #13 \| Base \| tcgplayer holofoil market | 38.05 | USD | market | 0.81 | reference_model_candidate |  |
| 48 | GV-PK-BS-13 | pokemontcg_io_reference | Poliwrath #13 \| Base \| tcgplayer holofoil low | 19.4 | USD | low | 0.45 | reference_model_candidate |  |
| 49 | GV-PK-BS-13 | pokemontcg_io_reference | Poliwrath #13 \| Base \| tcgplayer holofoil mid | 28.05 | USD | mid | 0.65 | reference_model_candidate |  |
| 50 | GV-PK-BS-13 | pokemontcg_io_reference | Poliwrath #13 \| Base \| tcgplayer holofoil directLow | 24.59 | USD | directlow | 0.45 | reference_model_candidate |  |

## Sample Quarantined Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-BS-1 | pokemontcg_io_reference | Alakazam #1 \| Base \| tcgplayer holofoil high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 2 | GV-PK-BS-10 | pokemontcg_io_reference | Mewtwo #10 \| Base \| tcgplayer holofoil high | 500 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 3 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| tcgplayer holofoil high | 510.23 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 4 | GV-PK-BS-11 | pokemontcg_io_reference | Nidoking #11 \| Base \| tcgplayer holofoil directLow | 388.65 | USD | directlow | 0.1 | quarantined_price_outlier | high_price_outlier |
| 5 | GV-PK-BS-12 | pokemontcg_io_reference | Ninetales #12 \| Base \| tcgplayer holofoil high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 6 | GV-PK-BS-13 | pokemontcg_io_reference | Poliwrath #13 \| Base \| tcgplayer holofoil high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 7 | GV-PK-BS-15 | pokemontcg_io_reference | Venusaur #15 \| Base \| tcgplayer holofoil high | 1199 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 8 | GV-PK-BS-16 | pokemontcg_io_reference | Zapdos #16 \| Base \| tcgplayer holofoil high | 129.96 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 9 | GV-PK-BS-16 | pokemontcg_io_reference | Zapdos #16 \| Base \| cardmarket normal lowPrice | 3 | EUR | lowprice | 0.1 | quarantined_price_outlier | low_price_outlier |
| 10 | GV-PK-BS-17 | pokemontcg_io_reference | Beedrill #17 \| Base \| tcgplayer normal high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 11 | GV-PK-BS-18 | pokemontcg_io_reference | Dragonair #18 \| Base \| tcgplayer normal high | 199.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 12 | GV-PK-BS-19 | pokemontcg_io_reference | Dugtrio #19 \| Base \| tcgplayer normal high | 110.96 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 13 | GV-PK-BS-2 | pokemontcg_io_reference | Blastoise #2 \| Base \| tcgplayer holofoil high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 14 | GV-PK-BS-20 | pokemontcg_io_reference | Electabuzz #20 \| Base \| tcgplayer normal high | 96.44 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 15 | GV-PK-BS-21 | pokemontcg_io_reference | Electrode #21 \| Base \| tcgplayer normal high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 16 | GV-PK-BS-22 | pokemontcg_io_reference | Pidgeotto #22 \| Base \| tcgplayer normal high | 111.92 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 17 | GV-PK-BS-22 | pokemontcg_io_reference | Pidgeotto #22 \| Base \| tcgplayer normal directLow | 111.92 | USD | directlow | 0.1 | quarantined_price_outlier | high_price_outlier |
| 18 | GV-PK-BS-3 | pokemontcg_io_reference | Chansey #3 \| Base \| tcgplayer holofoil high | 259.62 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 19 | GV-PK-BS-3 | pokemontcg_io_reference | Chansey #3 \| Base \| tcgplayer holofoil directLow | 229.96 | USD | directlow | 0.1 | quarantined_price_outlier | high_price_outlier |
| 20 | GV-PK-BS-5 | pokemontcg_io_reference | Clefairy #5 \| Base \| tcgplayer holofoil high | 212.54 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 21 | GV-PK-BS-6 | pokemontcg_io_reference | Gyarados #6 \| Base \| tcgplayer holofoil high | 249.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 22 | GV-PK-BS-70 | pokemontcg_io_reference | Clefairy Doll #70 \| Base \| tcgplayer normal high | 108.29 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 23 | GV-PK-BS-71 | pokemontcg_io_reference | Computer Search #71 \| Base \| tcgplayer normal high | 275 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 24 | GV-PK-BS-72 | pokemontcg_io_reference | Devolution Spray #72 \| Base \| tcgplayer normal high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 25 | GV-PK-BS-74 | pokemontcg_io_reference | Item Finder #74 \| Base \| tcgplayer normal high | 89.48 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 26 | GV-PK-BS-75 | pokemontcg_io_reference | Lass #75 \| Base \| tcgplayer normal high | 31.15 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 27 | GV-PK-BS-76 | pokemontcg_io_reference | Pokémon Breeder #76 \| Base \| tcgplayer normal high | 107.8 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 28 | GV-PK-BS-77 | pokemontcg_io_reference | Pokémon Trader #77 \| Base \| tcgplayer normal high | 105.91 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 29 | GV-PK-BS-78 | pokemontcg_io_reference | Scoop Up #78 \| Base \| tcgplayer normal high | 96.27 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 30 | GV-PK-BS-79 | pokemontcg_io_reference | Super Energy Removal #79 \| Base \| tcgplayer normal high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 31 | GV-PK-BS-9 | pokemontcg_io_reference | Magneton #9 \| Base \| tcgplayer holofoil high | 649.99 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 32 | GV-PK-JU-1 | pokemontcg_io_reference | Clefable #1 \| Jungle \| tcgplayer 1stEditionHolofoil high | 1045.6 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 33 | GV-PK-JU-1 | pokemontcg_io_reference | Clefable #1 \| Jungle \| tcgplayer unlimitedHolofoil high | 192.44 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 34 | GV-PK-JU-10 | pokemontcg_io_reference | Scyther #10 \| Jungle \| tcgplayer 1stEditionHolofoil high | 803.44 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 35 | GV-PK-JU-10 | pokemontcg_io_reference | Scyther #10 \| Jungle \| tcgplayer unlimitedHolofoil high | 9999 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 36 | GV-PK-JU-11 | pokemontcg_io_reference | Snorlax #11 \| Jungle \| tcgplayer 1stEditionHolofoil high | 600.98 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 37 | GV-PK-JU-11 | pokemontcg_io_reference | Snorlax #11 \| Jungle \| tcgplayer unlimitedHolofoil high | 699.67 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 38 | GV-PK-JU-12 | pokemontcg_io_reference | Vaporeon #12 \| Jungle \| tcgplayer 1stEditionHolofoil high | 1530.4 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 39 | GV-PK-JU-12 | pokemontcg_io_reference | Vaporeon #12 \| Jungle \| tcgplayer unlimitedHolofoil high | 198.2 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 40 | GV-PK-JU-13 | pokemontcg_io_reference | Venomoth #13 \| Jungle \| tcgplayer 1stEditionHolofoil high | 899 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 41 | GV-PK-JU-13 | pokemontcg_io_reference | Venomoth #13 \| Jungle \| tcgplayer unlimitedHolofoil high | 266.85 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 42 | GV-PK-JU-14 | pokemontcg_io_reference | Victreebel #14 \| Jungle \| tcgplayer 1stEditionHolofoil high | 1069.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 43 | GV-PK-JU-14 | pokemontcg_io_reference | Victreebel #14 \| Jungle \| tcgplayer unlimitedHolofoil high | 99.86 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input |
| 44 | GV-PK-JU-15 | pokemontcg_io_reference | Vileplume #15 \| Jungle \| tcgplayer 1stEditionHolofoil high | 929.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 45 | GV-PK-JU-15 | pokemontcg_io_reference | Vileplume #15 \| Jungle \| tcgplayer unlimitedHolofoil high | 409.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 46 | GV-PK-JU-16 | pokemontcg_io_reference | Wigglytuff #16 \| Jungle \| tcgplayer 1stEditionHolofoil high | 693.8 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 47 | GV-PK-JU-16 | pokemontcg_io_reference | Wigglytuff #16 \| Jungle \| tcgplayer unlimitedHolofoil high | 569.9 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 48 | GV-PK-JU-17 | pokemontcg_io_reference | Clefable #17 \| Jungle \| tcgplayer 1stEdition high | 155.5 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 49 | GV-PK-JU-17 | pokemontcg_io_reference | Clefable #17 \| Jungle \| tcgplayer unlimited high | 4320.61 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 50 | GV-PK-JU-18 | pokemontcg_io_reference | Electrode #18 \| Jungle \| tcgplayer 1stEdition high | 254.4 | USD | high | 0.08 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |

## Next Step

Use this artifact to decide whether to scale free reference acquisition or tune metric policy before creating any warehouse writes.
