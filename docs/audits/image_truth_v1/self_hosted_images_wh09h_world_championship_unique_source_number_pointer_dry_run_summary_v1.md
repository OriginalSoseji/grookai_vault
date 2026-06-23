# IMG-HOST-WH-09H-WORLD-CHAMPIONSHIP-UNIQUE-SOURCE-NUMBER-POINTER-DRY-RUN

- Generated: 2026-06-23T23:32:56.302Z
- Mode: dry_run_no_write
- Fingerprint: `9d73e7353674845d3334d1bb2e09f31baf594d2d31e00f84fd49b07c9311eae9`
- Future apply package: `IMG-HOST-WH-09I-WORLD-CHAMPIONSHIP-UNIQUE-SOURCE-NUMBER-POINTER-APPLY`
- Source translation fingerprint: `aa9644ffc3568414d9780b10b31c86d81d6c150f82a52286bae16a9b6e28a139`
- Current WCD rows: 1944
- Already representative WCD rows: 1833
- Current missing WCD rows: 111
- Residual representative candidate rows: 28
- Effective metadata pointer updates: 28
- Unresolved residual rows: 83
- Ready for apply package: true
- Stop findings: none
- Planned columns: image_source, image_path, image_status, image_note
- DB writes performed: false
- Storage writes performed: false
- Child writes performed: false
- Migrations created: false
- Exact image claim changes performed: false
- Runtime public URL field writes planned: false

## Finding

This pass recovers residual World Championship Deck display images where the ordinary source card is safely recoverable by a unique source-set alias and printed card number. It handles source-reference quirks such as `EX` card-page links, split `Scarlet` / `& Violet` references, pipe-delimited source numbers, and subtitle/name differences. It still writes only representative display metadata and does not claim exact World Championship Deck imagery.

## Proposed Image Statuses

| key | count |
| --- | ---: |
| representative_shared | 28 |

## Source Match Kinds

| key | count |
| --- | ---: |
| source_set_number_unique_source_match | 19 |
| ex_set_number_unique_source_match | 4 |
| pipe_number_unique_source_match | 3 |
| split_scarlet_violet_number_unique_source_match | 2 |

## Candidate Years

| key | count |
| --- | ---: |
| 2025 | 7 |
| 2023 | 5 |
| 2024 | 5 |
| 2015 | 3 |
| 2008 | 2 |
| 2016 | 2 |
| 2006 | 1 |
| 2007 | 1 |
| 2014 | 1 |
| 2018 | 1 |

## Largest Candidate Sets

| key | count |
| --- | ---: |
| wcd2023-psychic-elegance | 3 |
| wcd2025-joltdengo | 3 |
| wcd2024-the-don | 2 |
| wcd2025-flutter-devo-gardevoir | 2 |
| wcd2006-b-l-s | 1 |
| wcd2007-legendary-ascent | 1 |
| wcd2008-empotech | 1 |
| wcd2008-psychic-lock | 1 |
| wcd2014-plasma-power | 1 |
| wcd2015-honorstoise | 1 |
| wcd2015-primal-groudon | 1 |
| wcd2015-punches-n-bites | 1 |
| wcd2016-bebe-deck | 1 |
| wcd2016-ninja-blitz | 1 |
| wcd2018-victory-map | 1 |
| wcd2023-colorless-lugia | 1 |
| wcd2023-mews-revenge | 1 |
| wcd2024-ancient-toolbox | 1 |
| wcd2024-crushing-thorn | 1 |
| wcd2024-regidrago-vstar | 1 |
| wcd2025-jp-raging-bolt | 1 |
| wcd2025-pult-bomb | 1 |

## Unresolved Match Kinds

| key | count |
| --- | ---: |
| energy_or_template_missing_source_key | 83 |

## Unresolved Source Sets

| key | count |
| --- | ---: |
| unknown | 83 |

## Apply Boundary

A future apply package, if approved, should update only `card_prints.image_source`, `card_prints.image_path`, `card_prints.image_status`, and `card_prints.image_note` for the candidate rows in `docs\audits\image_truth_v1\self_hosted_images_wh09h_world_championship_unique_source_number_pointer_plan_v1.jsonl`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
