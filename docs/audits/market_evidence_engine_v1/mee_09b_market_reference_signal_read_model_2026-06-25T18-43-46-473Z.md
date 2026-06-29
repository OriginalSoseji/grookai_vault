# MEE-09B Market Reference Signal Read Model V1

Generated: 2026-06-25T18:43:43.619Z

## Boundary

- Internal read model only.
- No provider calls.
- No source fetches.
- No database writes.
- No pricing observations writes.
- No price rollups.
- No app-visible pricing.

## Input Counts

| Input | Rows |
| --- | ---: |
| candidates | 11025 |
| normalized_evidence | 11025 |

## Signal Summary

| Metric | Value |
| --- | ---: |
| signal_count | 993 |
| publishable_count | 0 |
| multi_source_signal_count | 197 |
| single_source_signal_count | 796 |
| currency_excluded_evidence_count | 2163 |

## Signal Bands

| Band | Rows |
| --- | ---: |
| multi_source_reference_candidate | 197 |
| single_source_reference_candidate | 796 |

## Multi Source Samples

| GV ID | Sources | Evidence | Median | Range | Band |
| --- | --- | ---: | ---: | --- | --- |
| GV-PK-B2-1 | pokemontcg_io_reference, tcgcsv_reference | 8 | 54.14 | 33.38 - 199.98 | multi_source_reference_candidate |
| GV-PK-B2-10 | pokemontcg_io_reference, tcgcsv_reference | 6 | 56.08 | 37.06 - 58.9 | multi_source_reference_candidate |
| GV-PK-B2-101 | pokemontcg_io_reference, tcgcsv_reference | 8 | 2.56 | 1.17 - 32.92 | multi_source_reference_candidate |
| GV-PK-B2-103 | pokemontcg_io_reference, tcgcsv_reference | 8 | 8.6 | 4.68 - 11.94 | multi_source_reference_candidate |
| GV-PK-B2-104 | pokemontcg_io_reference, tcgcsv_reference | 6 | 2.68 | 1.2 - 2.75 | multi_source_reference_candidate |
| GV-PK-B2-105 | pokemontcg_io_reference, tcgcsv_reference | 6 | 4.12 | 2.41 - 4.49 | multi_source_reference_candidate |
| GV-PK-B2-106 | pokemontcg_io_reference, tcgcsv_reference | 6 | 3.42 | 0.95 - 3.45 | multi_source_reference_candidate |
| GV-PK-B2-107 | pokemontcg_io_reference, tcgcsv_reference | 8 | 6.03 | 3.29 - 6.69 | multi_source_reference_candidate |
| GV-PK-B2-11 | pokemontcg_io_reference, tcgcsv_reference | 8 | 25.28 | 17.85 - 44.65 | multi_source_reference_candidate |
| GV-PK-B2-12 | pokemontcg_io_reference, tcgcsv_reference | 8 | 30.96 | 17.69 - 32.83 | multi_source_reference_candidate |
| GV-PK-B2-13 | pokemontcg_io_reference, tcgcsv_reference | 6 | 26.33 | 16.99 - 30.39 | multi_source_reference_candidate |
| GV-PK-B2-14 | pokemontcg_io_reference, tcgcsv_reference | 8 | 25.59 | 20 - 33.24 | multi_source_reference_candidate |
| GV-PK-B2-15 | pokemontcg_io_reference, tcgcsv_reference | 8 | 19.29 | 11 - 25 | multi_source_reference_candidate |
| GV-PK-B2-17 | pokemontcg_io_reference, tcgcsv_reference | 8 | 25.49 | 19 - 96.8 | multi_source_reference_candidate |
| GV-PK-B2-18 | pokemontcg_io_reference, tcgcsv_reference | 6 | 94.85 | 72.4 - 96.05 | multi_source_reference_candidate |
| GV-PK-B2-19 | pokemontcg_io_reference, tcgcsv_reference | 8 | 15.98 | 11 - 78.4 | multi_source_reference_candidate |
| GV-PK-B2-2 | pokemontcg_io_reference, tcgcsv_reference | 8 | 128.35 | 87 - 163.6 | multi_source_reference_candidate |
| GV-PK-B2-20 | pokemontcg_io_reference, tcgcsv_reference | 8 | 33.96 | 20.61 - 38.41 | multi_source_reference_candidate |
| GV-PK-B2-21 | pokemontcg_io_reference, tcgcsv_reference | 6 | 1.69 | 0.59 - 2.81 | multi_source_reference_candidate |
| GV-PK-B2-22 | pokemontcg_io_reference, tcgcsv_reference | 8 | 6.93 | 4.99 - 9.93 | multi_source_reference_candidate |

## Single Source Samples

| GV ID | Sources | Evidence | Median | Range | Band |
| --- | --- | ---: | ---: | --- | --- |
| GV-PK-BCR-10 | tcgcsv_reference | 7 | 7.02 | 0.96 - 58.81 | single_source_reference_candidate |
| GV-PK-BCR-101 | tcgcsv_reference | 4 | 3.72 | 2.6 - 4.1 | single_source_reference_candidate |
| GV-PK-BCR-102 | tcgcsv_reference | 8 | 0.77 | 0.4 - 19.4 | single_source_reference_candidate |
| GV-PK-BCR-103 | tcgcsv_reference | 4 | 4.25 | 1.99 - 4.44 | single_source_reference_candidate |
| GV-PK-BCR-108 | tcgcsv_reference | 7 | 85 | 39.4 - 100 | single_source_reference_candidate |
| GV-PK-BCR-122 | tcgcsv_reference | 6 | 6.14 | 3.2 - 9.99 | single_source_reference_candidate |
| GV-PK-BCR-125 | tcgcsv_reference | 6 | 0.76 | 0.25 - 1.24 | single_source_reference_candidate |
| GV-PK-BCR-126 | tcgcsv_reference | 6 | 0.78 | 0.45 - 2.95 | single_source_reference_candidate |
| GV-PK-BCR-13 | tcgcsv_reference | 8 | 6.19 | 3.25 - 55.4 | single_source_reference_candidate |
| GV-PK-BCR-137 | tcgcsv_reference | 4 | 15.38 | 13.38 - 17.54 | single_source_reference_candidate |
| GV-PK-BCR-138 | tcgcsv_reference | 3 | 2.23 | 1.12 - 2.54 | single_source_reference_candidate |
| GV-PK-BCR-139 | tcgcsv_reference | 3 | 2.52 | 1.5 - 2.67 | single_source_reference_candidate |
| GV-PK-BCR-140 | tcgcsv_reference | 3 | 6.66 | 4.31 - 7.35 | single_source_reference_candidate |
| GV-PK-BCR-147 | tcgcsv_reference | 4 | 191.49 | 164.79 - 208.26 | single_source_reference_candidate |
| GV-PK-BCR-148 | tcgcsv_reference | 3 | 61.16 | 39.47 - 63.18 | single_source_reference_candidate |
| GV-PK-BCR-149 | tcgcsv_reference | 3 | 219.35 | 180.23 - 219.99 | single_source_reference_candidate |
| GV-PK-BCR-15 | tcgcsv_reference | 6 | 0.62 | 0.25 - 1.82 | single_source_reference_candidate |
| GV-PK-BCR-151 | tcgcsv_reference | 3 | 151.37 | 125 - 155.45 | single_source_reference_candidate |
| GV-PK-BCR-17 | tcgcsv_reference | 6 | 1.27 | 0.35 - 4.52 | single_source_reference_candidate |
| GV-PK-BCR-20 | tcgcsv_reference | 6 | 45.88 | 17.96 - 162.26 | single_source_reference_candidate |

## Findings

- none
