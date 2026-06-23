# IMG-HOST-WH-09D-WORLD-CHAMPIONSHIP-RESIDUAL-POINTER-DRY-RUN

- Generated: 2026-06-23T22:40:27.656Z
- Mode: dry_run_no_write
- Fingerprint: `0fba141bd28ccf216544c8dd7f678a0ca757bb7a928524ed3848fde4e01532ff`
- Future apply package: `IMG-HOST-WH-09E-WORLD-CHAMPIONSHIP-RESIDUAL-POINTER-APPLY`
- Source translation fingerprint: `da7a18fb284b6ba18078a64868c6375a5e15145d37392b4c92da788de69e0594`
- Source card rows: 1944
- Current WCD rows: 1944
- Already resolved WCD rows: 1560
- Residual missing WCD rows: 384
- Residual representative candidate rows: 244
- Effective metadata pointer updates: 244
- Unresolved residual rows: 140
- Source rows without any image field: 0
- Source rows without self-hosted path: 0
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

This residual pass recovers additional WCD representative images by resolving source-set aliases such as `Expedition` -> `Expedition Base Set`, `Triumphant` -> `HS-Triumphant`, and by preferring ordinary exact source rows over stamped variants when both exist. It still writes only representative display metadata and does not claim exact World Championship Deck imagery.

## Proposed Image Statuses

| key | count |
| --- | ---: |
| representative_shared | 244 |

## Source Match Kinds

| key | count |
| --- | ---: |
| normalized_alias_source_match | 215 |
| exact_alias_source_match | 29 |

## Candidate Years

| key | count |
| --- | ---: |
| 2011 | 33 |
| 2019 | 27 |
| 2010 | 18 |
| 2012 | 17 |
| 2022 | 17 |
| 2004 | 16 |
| 2024 | 16 |
| 2023 | 14 |
| 2015 | 13 |
| 2018 | 13 |
| 2009 | 11 |
| 2016 | 11 |
| 2017 | 11 |
| 2013 | 10 |
| 2014 | 9 |
| 2005 | 2 |
| 2006 | 2 |
| 2008 | 2 |
| 2025 | 2 |

## Largest Candidate Sets

| key | count |
| --- | ---: |
| wcd2011-megazone | 11 |
| wcd2019-perfection | 10 |
| wcd2011-twinboar | 9 |
| wcd2010-luxchomp-of-the-spirit | 8 |
| wcd2011-the-truth | 8 |
| wcd2024-regidrago-vstar | 8 |
| wcd2023-colorless-lugia | 7 |
| wcd2004-rocky-beach | 6 |
| wcd2012-pesadelo-prism | 6 |
| wcd2016-magical-symphony | 6 |
| wcd2019-mind-blown | 6 |
| wcd2019-pikarom-judge | 6 |
| wcd2022-adp | 6 |
| wcd2024-the-don | 6 |
| wcd2004-blaziken-tech | 5 |
| wcd2009-crowned-tiger | 5 |
| wcd2011-reshiphlosion | 5 |
| wcd2012-cmt-deck | 5 |
| wcd2015-honorstoise | 5 |
| wcd2019-fire-box | 5 |
| wcd2010-boltevoir | 4 |
| wcd2018-buzzroc | 4 |
| wcd2022-ice-rider-palkia | 4 |
| wcd2022-the-shape-of-mew | 4 |
| wcd2023-mews-revenge | 4 |
| wcd2004-magma-spirit | 3 |
| wcd2009-luxdrill | 3 |
| wcd2010-happy-luck | 3 |
| wcd2010-power-cottonweed | 3 |
| wcd2012-eeltwo | 3 |
| wcd2012-terraki-mewtwo | 3 |
| wcd2013-anguille-sous-roche | 3 |
| wcd2013-ultimate-team-plasma | 3 |
| wcd2014-emerald-king | 3 |
| wcd2014-plasma-power | 3 |
| wcd2015-punches-n-bites | 3 |
| wcd2015-the-flying-hammer | 3 |
| wcd2016-black-dragon | 3 |
| wcd2017-golisodor | 3 |
| wcd2017-infinite-force | 3 |
| wcd2017-samurai-sniper | 3 |
| wcd2018-dragones-y-sombras | 3 |
| wcd2018-garbanette | 3 |
| wcd2018-victory-map | 3 |
| wcd2022-cheryl-again | 3 |
| wcd2004-team-rushdown | 2 |
| wcd2009-stallgon | 2 |
| wcd2013-american-gothic | 2 |
| wcd2013-darkrai-deck | 2 |
| wcd2014-crazy-punch | 2 |
| wcd2015-primal-groudon | 2 |
| wcd2016-bebe-deck | 2 |
| wcd2017-ice-path-ftw | 2 |
| wcd2023-lost-box-kyogre | 2 |
| wcd2025-pult-bomb | 2 |
| wcd2005-dark-tyranitar-deck | 1 |
| wcd2005-king-of-the-west | 1 |
| wcd2006-b-l-s | 1 |
| wcd2006-eeveelutions | 1 |
| wcd2008-empotech | 1 |

## Unresolved Match Kinds

| key | count |
| --- | ---: |
| missing_source_key | 87 |
| no_alias_source_match | 53 |

## Unresolved Source Sets

| key | count |
| --- | ---: |
| unknown | 83 |
| Paldea Evolved | 10 |
| Scarlet & Violet | 6 |
| Black Bolt | 5 |
| BW Promo | 5 |
| Phantom Forces | 5 |
| EX | 4 |
| Lost Origin | 4 |
| SM Promo | 3 |
| Temporal Forces | 3 |
| XY Promo | 3 |
| DP Promo | 2 |
| Scarlet | 2 |
| Dragons Exalted | 1 |
| Silver Tempest | 1 |
| SWSH Promo | 1 |
| Ultra Prism | 1 |
| White Flare | 1 |

## Apply Boundary

A future apply package, if approved, should update only `card_prints.image_source`, `card_prints.image_path`, `card_prints.image_status`, and `card_prints.image_note` for the candidate rows in `docs\audits\image_truth_v1\self_hosted_images_wh09d_world_championship_residual_pointer_plan_v1.jsonl`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
