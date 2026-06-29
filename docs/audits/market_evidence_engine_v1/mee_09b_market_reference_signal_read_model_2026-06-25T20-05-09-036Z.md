# MEE-09B Market Reference Signal Read Model V1

Generated: 2026-06-25T20:05:03.453Z

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
| candidates | 21745 |
| normalized_evidence | 21745 |

## Signal Summary

| Metric | Value |
| --- | ---: |
| signal_count | 993 |
| publishable_count | 0 |
| multi_source_signal_count | 749 |
| single_source_signal_count | 244 |
| currency_excluded_evidence_count | 8947 |

## Signal Bands

| Band | Rows |
| --- | ---: |
| multi_source_reference_candidate | 749 |
| single_source_reference_candidate | 244 |

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
| GV-PK-BCR-102 | tcgcsv_reference | 8 | 0.77 | 0.4 - 19.4 | single_source_reference_candidate |
| GV-PK-BCR-13 | tcgcsv_reference | 8 | 6.19 | 3.25 - 55.4 | single_source_reference_candidate |
| GV-PK-BCR-17 | tcgcsv_reference | 6 | 1.27 | 0.35 - 4.52 | single_source_reference_candidate |
| GV-PK-BCR-3 | tcgcsv_reference | 6 | 4.68 | 1.7 - 35.3 | single_source_reference_candidate |
| GV-PK-BCR-66 | tcgcsv_reference | 8 | 0.4 | 0.24 - 4.72 | single_source_reference_candidate |
| GV-PK-BLW-12 | tcgcsv_reference | 7 | 0.87 | 0.25 - 6.31 | single_source_reference_candidate |
| GV-PK-BLW-25-PRERELEASE-STAMP | tcgcsv_reference | 6 | 0.86 | 0.39 - 2.22 | single_source_reference_candidate |
| GV-PK-BLW-25-STAFF-PRERELEASE-STAMP | tcgcsv_reference | 6 | 0.86 | 0.39 - 2.22 | single_source_reference_candidate |
| GV-PK-BLW-26 | tcgcsv_reference | 6 | 6.49 | 3.5 - 39.45 | single_source_reference_candidate |
| GV-PK-BLW-37 | tcgcsv_reference | 6 | 0.78 | 0.1 - 1.21 | single_source_reference_candidate |
| GV-PK-BLW-43 | tcgcsv_reference | 6 | 1.04 | 0.2 - 2.75 | single_source_reference_candidate |
| GV-PK-BLW-46 | tcgcsv_reference | 7 | 0.75 | 0.12 - 1.96 | single_source_reference_candidate |
| GV-PK-BLW-54 | tcgcsv_reference | 7 | 0.86 | 0.35 - 96.91 | single_source_reference_candidate |
| GV-PK-BLW-69 | tcgcsv_reference | 7 | 2.45 | 0.46 - 7.5 | single_source_reference_candidate |
| GV-PK-BLW-83 | tcgcsv_reference | 7 | 0.99 | 0.12 - 1.36 | single_source_reference_candidate |
| GV-PK-BLW-89 | tcgcsv_reference | 6 | 1.05 | 0.26 - 4.92 | single_source_reference_candidate |
| GV-PK-CEL-1 | tcgcsv_reference | 4 | 0.23 | 0.03 - 0.35 | single_source_reference_candidate |
| GV-PK-CEL-10 | tcgcsv_reference | 4 | 0.31 | 0.01 - 0.42 | single_source_reference_candidate |
| GV-PK-CEL-13 | tcgcsv_reference | 4 | 0.21 | 0.01 - 0.32 | single_source_reference_candidate |

## Findings

- none
