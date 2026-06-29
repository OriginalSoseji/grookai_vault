# MEE-06C Normalized Reference Evidence V1

Generated: 2026-06-25T17:20:19.577Z

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

- normalized_evidence_count: 1901
- model_eligible_count: 1440
- quarantined_count: 461
- blocked_count: 0
- direct_publishable_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-20-08-249Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-20-19-577Z.json

## Proofs

- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true
- no_candidate_can_publish_directly: true
- only_model_eligible_rows_receive_weight: true

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| quarantined_metric | 427 |
| quarantined_price_outlier | 34 |
| reference_model_candidate | 1440 |

## Quality Flag Counts

| Flag | Count |
| --- | ---: |
| high_ask_bucket_not_model_input | 427 |
| high_price_outlier | 243 |
| low_price_outlier | 1 |

## Sample Model Eligible Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-BS-1 | tcgcsv_reference | Alakazam \| Base Set \| Holofoil marketPrice | 83.58 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 2 | GV-PK-BS-1 | tcgcsv_reference | Alakazam \| Base Set \| Holofoil lowPrice | 51.5 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 3 | GV-PK-BS-1 | tcgcsv_reference | Alakazam \| Base Set \| Holofoil midPrice | 70 | USD | midprice | 0.66 | reference_model_candidate |  |
| 4 | GV-PK-BS-1 | tcgcsv_reference | Alakazam \| Base Set \| Holofoil directLowPrice | 64 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 5 | GV-PK-BS-10 | tcgcsv_reference | Mewtwo \| Base Set \| Holofoil marketPrice | 78.78 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 6 | GV-PK-BS-10 | tcgcsv_reference | Mewtwo \| Base Set \| Holofoil lowPrice | 34.99 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 7 | GV-PK-BS-10 | tcgcsv_reference | Mewtwo \| Base Set \| Holofoil midPrice | 67.74 | USD | midprice | 0.66 | reference_model_candidate |  |
| 8 | GV-PK-BS-10 | tcgcsv_reference | Mewtwo \| Base Set \| Holofoil directLowPrice | 62.12 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 9 | GV-PK-BS-11 | tcgcsv_reference | Nidoking \| Base Set \| Holofoil marketPrice | 38.45 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 10 | GV-PK-BS-11 | tcgcsv_reference | Nidoking \| Base Set \| Holofoil lowPrice | 24.71 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 11 | GV-PK-BS-11 | tcgcsv_reference | Nidoking \| Base Set \| Holofoil midPrice | 31.64 | USD | midprice | 0.66 | reference_model_candidate |  |
| 12 | GV-PK-BS-12 | tcgcsv_reference | Ninetales \| Base Set \| Holofoil marketPrice | 36.87 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 13 | GV-PK-BS-12 | tcgcsv_reference | Ninetales \| Base Set \| Holofoil lowPrice | 15.6 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 14 | GV-PK-BS-12 | tcgcsv_reference | Ninetales \| Base Set \| Holofoil midPrice | 31.75 | USD | midprice | 0.66 | reference_model_candidate |  |
| 15 | GV-PK-BS-13 | tcgcsv_reference | Poliwrath \| Base Set \| Holofoil marketPrice | 38.05 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 16 | GV-PK-BS-13 | tcgcsv_reference | Poliwrath \| Base Set \| Holofoil lowPrice | 19.4 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 17 | GV-PK-BS-13 | tcgcsv_reference | Poliwrath \| Base Set \| Holofoil midPrice | 28.75 | USD | midprice | 0.66 | reference_model_candidate |  |
| 18 | GV-PK-BS-13 | tcgcsv_reference | Poliwrath \| Base Set \| Holofoil directLowPrice | 24.61 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 19 | GV-PK-BS-15 | tcgcsv_reference | Venusaur \| Base Set \| Holofoil marketPrice | 155.78 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 20 | GV-PK-BS-15 | tcgcsv_reference | Venusaur \| Base Set \| Holofoil lowPrice | 104.36 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 21 | GV-PK-BS-15 | tcgcsv_reference | Venusaur \| Base Set \| Holofoil midPrice | 170.7 | USD | midprice | 0.66 | reference_model_candidate |  |
| 22 | GV-PK-BS-15 | tcgcsv_reference | Venusaur \| Base Set \| Holofoil directLowPrice | 180 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 23 | GV-PK-BS-16 | tcgcsv_reference | Zapdos \| Base Set \| Holofoil marketPrice | 55.09 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 24 | GV-PK-BS-16 | tcgcsv_reference | Zapdos \| Base Set \| Holofoil lowPrice | 30.67 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 25 | GV-PK-BS-16 | tcgcsv_reference | Zapdos \| Base Set \| Holofoil midPrice | 44.99 | USD | midprice | 0.66 | reference_model_candidate |  |
| 26 | GV-PK-BS-16 | tcgcsv_reference | Zapdos \| Base Set \| Holofoil directLowPrice | 79.98 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 27 | GV-PK-BS-17 | tcgcsv_reference | Beedrill \| Base Set \| Normal marketPrice | 5.3 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 28 | GV-PK-BS-17 | tcgcsv_reference | Beedrill \| Base Set \| Normal lowPrice | 1.91 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 29 | GV-PK-BS-17 | tcgcsv_reference | Beedrill \| Base Set \| Normal midPrice | 3.81 | USD | midprice | 0.66 | reference_model_candidate |  |
| 30 | GV-PK-BS-17 | tcgcsv_reference | Beedrill \| Base Set \| Normal directLowPrice | 46.1 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 31 | GV-PK-BS-18 | tcgcsv_reference | Dragonair \| Base Set \| Normal marketPrice | 17.8 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 32 | GV-PK-BS-18 | tcgcsv_reference | Dragonair \| Base Set \| Normal lowPrice | 8 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 33 | GV-PK-BS-18 | tcgcsv_reference | Dragonair \| Base Set \| Normal midPrice | 12.29 | USD | midprice | 0.66 | reference_model_candidate |  |
| 34 | GV-PK-BS-19 | tcgcsv_reference | Dugtrio \| Base Set \| Normal marketPrice | 11.06 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 35 | GV-PK-BS-19 | tcgcsv_reference | Dugtrio \| Base Set \| Normal lowPrice | 3.99 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 36 | GV-PK-BS-19 | tcgcsv_reference | Dugtrio \| Base Set \| Normal midPrice | 7 | USD | midprice | 0.66 | reference_model_candidate |  |
| 37 | GV-PK-BS-19 | tcgcsv_reference | Dugtrio \| Base Set \| Normal directLowPrice | 39.95 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 38 | GV-PK-BS-2 | tcgcsv_reference | Blastoise \| Base Set \| Holofoil marketPrice | 223.16 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 39 | GV-PK-BS-2 | tcgcsv_reference | Blastoise \| Base Set \| Holofoil lowPrice | 149 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 40 | GV-PK-BS-2 | tcgcsv_reference | Blastoise \| Base Set \| Holofoil midPrice | 218.34 | USD | midprice | 0.66 | reference_model_candidate |  |
| 41 | GV-PK-BS-2 | tcgcsv_reference | Blastoise \| Base Set \| Holofoil directLowPrice | 199.99 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 42 | GV-PK-BS-20 | tcgcsv_reference | Electabuzz \| Base Set \| Normal marketPrice | 13.3 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 43 | GV-PK-BS-20 | tcgcsv_reference | Electabuzz \| Base Set \| Normal lowPrice | 4.04 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 44 | GV-PK-BS-20 | tcgcsv_reference | Electabuzz \| Base Set \| Normal midPrice | 8.06 | USD | midprice | 0.66 | reference_model_candidate |  |
| 45 | GV-PK-BS-20 | tcgcsv_reference | Electabuzz \| Base Set \| Normal directLowPrice | 6.41 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 46 | GV-PK-BS-21 | tcgcsv_reference | Electrode \| Base Set \| Normal marketPrice | 7.77 | USD | marketprice | 0.82 | reference_model_candidate |  |
| 47 | GV-PK-BS-21 | tcgcsv_reference | Electrode \| Base Set \| Normal lowPrice | 3 | USD | lowprice | 0.46 | reference_model_candidate |  |
| 48 | GV-PK-BS-21 | tcgcsv_reference | Electrode \| Base Set \| Normal midPrice | 5.6 | USD | midprice | 0.66 | reference_model_candidate |  |
| 49 | GV-PK-BS-21 | tcgcsv_reference | Electrode \| Base Set \| Normal directLowPrice | 6.64 | USD | directlowprice | 0.46 | reference_model_candidate |  |
| 50 | GV-PK-BS-22 | tcgcsv_reference | Pidgeotto \| Base Set \| Normal marketPrice | 11.32 | USD | marketprice | 0.82 | reference_model_candidate |  |

## Sample Quarantined Rows

| # | ID | Source | Title | Price | Currency | Metric | Score | Disposition | Flags |
| ---: | --- | --- | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | GV-PK-BS-1 | tcgcsv_reference | Alakazam \| Base Set \| Holofoil highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 2 | GV-PK-BS-10 | tcgcsv_reference | Mewtwo \| Base Set \| Holofoil highPrice | 500 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 3 | GV-PK-BS-11 | tcgcsv_reference | Nidoking \| Base Set \| Holofoil highPrice | 510.23 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 4 | GV-PK-BS-11 | tcgcsv_reference | Nidoking \| Base Set \| Holofoil directLowPrice | 388.65 | USD | directlowprice | 0.1 | quarantined_price_outlier | high_price_outlier |
| 5 | GV-PK-BS-12 | tcgcsv_reference | Ninetales \| Base Set \| Holofoil highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 6 | GV-PK-BS-13 | tcgcsv_reference | Poliwrath \| Base Set \| Holofoil highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 7 | GV-PK-BS-15 | tcgcsv_reference | Venusaur \| Base Set \| Holofoil highPrice | 1199 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 8 | GV-PK-BS-16 | tcgcsv_reference | Zapdos \| Base Set \| Holofoil highPrice | 129.96 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 9 | GV-PK-BS-17 | tcgcsv_reference | Beedrill \| Base Set \| Normal highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 10 | GV-PK-BS-18 | tcgcsv_reference | Dragonair \| Base Set \| Normal highPrice | 199.99 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 11 | GV-PK-BS-18 | tcgcsv_reference | Dragonair \| Base Set \| Normal directLowPrice | 146.52 | USD | directlowprice | 0.1 | quarantined_price_outlier | high_price_outlier |
| 12 | GV-PK-BS-19 | tcgcsv_reference | Dugtrio \| Base Set \| Normal highPrice | 110.96 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 13 | GV-PK-BS-2 | tcgcsv_reference | Blastoise \| Base Set \| Holofoil highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 14 | GV-PK-BS-20 | tcgcsv_reference | Electabuzz \| Base Set \| Normal highPrice | 96.44 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 15 | GV-PK-BS-21 | tcgcsv_reference | Electrode \| Base Set \| Normal highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 16 | GV-PK-BS-22 | tcgcsv_reference | Pidgeotto \| Base Set \| Normal highPrice | 111.92 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 17 | GV-PK-BS-22 | tcgcsv_reference | Pidgeotto \| Base Set \| Normal directLowPrice | 111.92 | USD | directlowprice | 0.1 | quarantined_price_outlier | high_price_outlier |
| 18 | GV-PK-BS-3 | tcgcsv_reference | Chansey \| Base Set \| Holofoil highPrice | 259.62 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 19 | GV-PK-BS-3 | tcgcsv_reference | Chansey \| Base Set \| Holofoil directLowPrice | 229.96 | USD | directlowprice | 0.1 | quarantined_price_outlier | high_price_outlier |
| 20 | GV-PK-BS-5 | tcgcsv_reference | Clefairy \| Base Set \| Holofoil highPrice | 212.54 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 21 | GV-PK-BS-6 | tcgcsv_reference | Gyarados \| Base Set \| Holofoil highPrice | 100 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 22 | GV-PK-BS-70 | tcgcsv_reference | Clefairy Doll \| Base Set \| Normal highPrice | 108.29 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 23 | GV-PK-BS-71 | tcgcsv_reference | Computer Search \| Base Set \| Normal highPrice | 275 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 24 | GV-PK-BS-72 | tcgcsv_reference | Devolution Spray \| Base Set \| Normal highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 25 | GV-PK-BS-74 | tcgcsv_reference | Item Finder \| Base Set \| Normal highPrice | 89.48 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 26 | GV-PK-BS-75 | tcgcsv_reference | Lass \| Base Set \| Normal highPrice | 31.15 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 27 | GV-PK-BS-76 | tcgcsv_reference | Pokemon Breeder \| Base Set \| Normal highPrice | 107.8 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 28 | GV-PK-BS-77 | tcgcsv_reference | Pokemon Trader \| Base Set \| Normal highPrice | 105.91 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 29 | GV-PK-BS-78 | tcgcsv_reference | Scoop Up \| Base Set \| Normal highPrice | 96.27 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 30 | GV-PK-BS-79 | tcgcsv_reference | Super Energy Removal \| Base Set \| Normal highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 31 | GV-PK-BS-9 | tcgcsv_reference | Magneton \| Base Set \| Holofoil highPrice | 649.99 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 32 | GV-PK-JU-1 | tcgcsv_reference | Clefable (1) \| Jungle \| 1st Edition Holofoil highPrice | 1045.6 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 33 | GV-PK-JU-1 | tcgcsv_reference | Clefable (1) \| Jungle \| Unlimited Holofoil highPrice | 192.44 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 34 | GV-PK-JU-10 | tcgcsv_reference | Scyther (10) \| Jungle \| 1st Edition Holofoil highPrice | 803.44 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 35 | GV-PK-JU-10 | tcgcsv_reference | Scyther (10) \| Jungle \| Unlimited Holofoil highPrice | 9999 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 36 | GV-PK-JU-11 | tcgcsv_reference | Snorlax (11) \| Jungle \| 1st Edition Holofoil highPrice | 600.98 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 37 | GV-PK-JU-11 | tcgcsv_reference | Snorlax (11) \| Jungle \| Unlimited Holofoil highPrice | 699.67 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 38 | GV-PK-JU-12 | tcgcsv_reference | Vaporeon (12) \| Jungle \| 1st Edition Holofoil highPrice | 1530.4 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 39 | GV-PK-JU-12 | tcgcsv_reference | Vaporeon (12) \| Jungle \| Unlimited Holofoil highPrice | 198.2 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 40 | GV-PK-JU-13 | tcgcsv_reference | Venomoth (13) \| Jungle \| 1st Edition Holofoil highPrice | 899 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 41 | GV-PK-JU-13 | tcgcsv_reference | Venomoth (13) \| Jungle \| Unlimited Holofoil highPrice | 266.85 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 42 | GV-PK-JU-14 | tcgcsv_reference | Victreebel (14) \| Jungle \| 1st Edition Holofoil highPrice | 1069.9 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 43 | GV-PK-JU-14 | tcgcsv_reference | Victreebel (14) \| Jungle \| Unlimited Holofoil highPrice | 99.86 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input |
| 44 | GV-PK-JU-15 | tcgcsv_reference | Vileplume (15) \| Jungle \| 1st Edition Holofoil highPrice | 929.9 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 45 | GV-PK-JU-15 | tcgcsv_reference | Vileplume (15) \| Jungle \| Unlimited Holofoil highPrice | 409.9 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 46 | GV-PK-JU-16 | tcgcsv_reference | Wigglytuff (16) \| Jungle \| 1st Edition Holofoil highPrice | 693.8 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 47 | GV-PK-JU-16 | tcgcsv_reference | Wigglytuff (16) \| Jungle \| Unlimited Holofoil highPrice | 569.9 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 48 | GV-PK-JU-17 | tcgcsv_reference | Clefable (17) \| Jungle \| 1st Edition highPrice | 155.5 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 49 | GV-PK-JU-17 | tcgcsv_reference | Clefable (17) \| Jungle \| Unlimited highPrice | 4320.61 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |
| 50 | GV-PK-JU-18 | tcgcsv_reference | Electrode (18) \| Jungle \| 1st Edition highPrice | 254.4 | USD | highprice | 0.09 | quarantined_metric | high_ask_bucket_not_model_input, high_price_outlier |

## Next Step

Use this artifact to decide whether to scale free reference acquisition or tune metric policy before creating any warehouse writes.
