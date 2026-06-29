# MEE-PRICE-PUBLICATION-CANDIDATE-EXPORT-V1

Generated: 2026-06-29T03:49:31.387Z

## Purpose

Export all internal future-publication-review price candidates for operator review.

This is not public pricing. It does not write `pricing_observations`, `ebay_active_prices_latest`, app-visible views, or public rollups.

## Summary

| Metric | Count |
| --- | ---: |
| Future publication-review candidates | 11 |
| Public can-publish-directly rows | 0 |
| Publishable rows | 0 |
| App-visible rows | 0 |
| Market-truth rows | 0 |

## Review Bands

| Band | Rows | Min Median | Median | Max Median |
| --- | --- | --- | --- | --- |
| standard_candidate | 11 | 19.99 | 51.99 | 90.00 |

## Top Candidates By Evidence

| GV ID | Card | Median | Evidence | Sellers | Band | Flags |
| --- | --- | --- | --- | --- | --- | --- |
| GV-PK-EM-104 | Lightning Energy #104 | 19.99 | 98 | 24 | standard_candidate |  |
| GV-PK-TRR-6 | Dark Hypno #6 | 65.96 | 70 | 19 | standard_candidate |  |
| GV-PK-LM-14 | Wailord #14 | 40.00 | 68 | 30 | standard_candidate | broad_seller_diversity |
| GV-PK-CG-89 | Aggron ex #89 | 51.99 | 66 | 15 | standard_candidate |  |
| GV-PK-DR-12 | Torkoal #12 | 34.99 | 59 | 16 | standard_candidate |  |
| GV-PK-HP-101 | Mightyena ex #101 | 79.00 | 58 | 15 | standard_candidate |  |
| GV-PK-MA-11 | Team Magma's Rhydon #11 | 30.00 | 51 | 14 | standard_candidate |  |
| GV-PK-HL-100 | Vileplume ex #100 | 73.98 | 51 | 11 | standard_candidate |  |
| GV-PK-SS-2 | Cacturne #2 | 24.02 | 50 | 15 | standard_candidate |  |
| GV-PK-TRR-9 | Dark Slowking #9 | 90.00 | 46 | 12 | standard_candidate |  |
| GV-PK-TRR-10 | Dark Steelix #10 | 75.99 | 40 | 13 | standard_candidate |  |

## Highest Median Candidates

| GV ID | Card | Median | Evidence | Sellers | Band | Flags |
| --- | --- | --- | --- | --- | --- | --- |
| GV-PK-TRR-9 | Dark Slowking #9 | 90.00 | 46 | 12 | standard_candidate |  |
| GV-PK-HP-101 | Mightyena ex #101 | 79.00 | 58 | 15 | standard_candidate |  |
| GV-PK-TRR-10 | Dark Steelix #10 | 75.99 | 40 | 13 | standard_candidate |  |
| GV-PK-HL-100 | Vileplume ex #100 | 73.98 | 51 | 11 | standard_candidate |  |
| GV-PK-TRR-6 | Dark Hypno #6 | 65.96 | 70 | 19 | standard_candidate |  |
| GV-PK-CG-89 | Aggron ex #89 | 51.99 | 66 | 15 | standard_candidate |  |
| GV-PK-LM-14 | Wailord #14 | 40.00 | 68 | 30 | standard_candidate | broad_seller_diversity |
| GV-PK-DR-12 | Torkoal #12 | 34.99 | 59 | 16 | standard_candidate |  |
| GV-PK-MA-11 | Team Magma's Rhydon #11 | 30.00 | 51 | 14 | standard_candidate |  |
| GV-PK-SS-2 | Cacturne #2 | 24.02 | 50 | 15 | standard_candidate |  |
| GV-PK-EM-104 | Lightning Energy #104 | 19.99 | 98 | 24 | standard_candidate |  |

## CSV

`docs/audits/market_evidence_engine_v1/MEE-PRICE-PUBLICATION-CANDIDATE-EXPORT-V1/future_publication_review_candidates.csv`

## Boundary

No DB writes, provider calls, source fetches, function invocation, public pricing views, app-visible pricing, public rollups, identity/card/vault/image writes, deletes, upserts, merges, migrations, or global apply were performed.

Package fingerprint: `8d0953702c4de8c8565592ac2cfa7888a1aeb9f062f8a9461ba9f1e6811032cb`
