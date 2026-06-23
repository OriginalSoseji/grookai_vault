# IMG-HOST-WH-09F-WORLD-CHAMPIONSHIP-EXTENDED-SOURCE-POINTER-DRY-RUN

- Generated: 2026-06-23T23:15:50.919Z
- Mode: dry_run_no_write
- Fingerprint: `8f78cd09240ed49fa0344404b784b66e96f23260b36b399de90cfde5a3418220`
- Future apply package: `IMG-HOST-WH-09G-WORLD-CHAMPIONSHIP-EXTENDED-SOURCE-POINTER-APPLY`
- Source translation fingerprint: `aa9644ffc3568414d9780b10b31c86d81d6c150f82a52286bae16a9b6e28a139`
- Current WCD rows: 1944
- Already representative WCD rows: 1804
- Current missing WCD rows: 140
- Residual representative candidate rows: 29
- Effective metadata pointer updates: 29
- Unresolved residual rows: 111
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

This pass recovers residual World Championship Deck display images where the source card is safely recoverable through promo aliases such as `DP Promo` -> `DP Black Star Promos`, or through exact source-set and printed-number matches that were not eligible in the prior residual pass. It still writes only representative display metadata and does not claim exact World Championship Deck imagery.

## Proposed Image Statuses

| key | count |
| --- | ---: |
| representative_shared | 29 |

## Source Match Kinds

| key | count |
| --- | ---: |
| extended_exact_source_match | 15 |
| promo_alias_source_match | 14 |

## Candidate Years

| key | count |
| --- | ---: |
| 2025 | 8 |
| 2023 | 6 |
| 2017 | 5 |
| 2013 | 2 |
| 2014 | 2 |
| 2024 | 2 |
| 2008 | 1 |
| 2009 | 1 |
| 2011 | 1 |
| 2018 | 1 |

## Largest Candidate Sets

| key | count |
| --- | ---: |
| wcd2017-ice-path-ftw | 3 |
| wcd2023-lost-box-kyogre | 3 |
| wcd2025-flutter-devo-gardevoir | 3 |
| wcd2025-pult-bomb | 3 |
| wcd2023-psychic-elegance | 2 |
| wcd2024-ancient-toolbox | 2 |
| wcd2025-joltdengo | 2 |
| wcd2008-empotech | 1 |
| wcd2009-stallgon | 1 |
| wcd2011-the-truth | 1 |
| wcd2013-american-gothic | 1 |
| wcd2013-anguille-sous-roche | 1 |
| wcd2014-plasma-power | 1 |
| wcd2014-trevgor | 1 |
| wcd2017-golisodor | 1 |
| wcd2017-samurai-sniper | 1 |
| wcd2018-garbanette | 1 |
| wcd2023-colorless-lugia | 1 |

## Unresolved Match Kinds

| key | count |
| --- | ---: |
| energy_or_template_missing_source_key | 83 |
| no_self_hosted_catalog_source_match | 28 |

## Unresolved Source Sets

| key | count |
| --- | ---: |
| unknown | 83 |
| Paldea Evolved | 10 |
| Phantom Forces | 5 |
| EX | 4 |
| Scarlet & Violet | 4 |
| Scarlet | 2 |
| Black Bolt | 1 |
| Dragons Exalted | 1 |
| Ultra Prism | 1 |

## Apply Boundary

A future apply package, if approved, should update only `card_prints.image_source`, `card_prints.image_path`, `card_prints.image_status`, and `card_prints.image_note` for the candidate rows in `docs\audits\image_truth_v1\self_hosted_images_wh09f_world_championship_extended_source_pointer_plan_v1.jsonl`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
