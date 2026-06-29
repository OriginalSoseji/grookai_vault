# MEE-06C Normalized Reference Evidence V1

Generated: 2026-06-25T17:18:37.709Z

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

- normalized_evidence_count: 49
- model_eligible_count: 37
- quarantined_count: 12
- blocked_count: 0
- direct_publishable_count: 0
- acquisition: docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-12-57-950Z.json
- json: docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-18-37-709Z.json

## Proofs

- no_database_write_boundary: true
- no_pricing_rollup_boundary: true
- no_public_price_publication_boundary: true
- no_candidate_can_publish_directly: true
- only_model_eligible_rows_receive_weight: true

## Disposition Counts

| Disposition | Count |
| --- | ---: |
| quarantined_metric | 10 |
| quarantined_price_outlier | 2 |
| reference_model_candidate | 37 |

## Quality Flag Counts

| Flag | Count |
| --- | ---: |
| high_ask_bucket_not_model_input | 10 |
| high_price_outlier | 11 |

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

## Next Step

Use this artifact to decide whether to scale free reference acquisition or tune metric policy before creating any warehouse writes.
