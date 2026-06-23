# IMG-HOST-WH-09J-WORLD-CHAMPIONSHIP-ENERGY-TEMPLATE-POINTER-DRY-RUN

- Generated: 2026-06-23T23:47:02.107Z
- Mode: dry_run_no_write
- Fingerprint: `b3bc06b4bb35d156eb8b8358ee64c960813bc7b687e3689e763c3677decd500f`
- Future apply package: `IMG-HOST-WH-09K-WORLD-CHAMPIONSHIP-ENERGY-TEMPLATE-POINTER-APPLY`
- Source translation fingerprint: `c91dc898399759cb70d8deb10eebb6c382e25378393869f778370c884e2baed4`
- Current WCD rows: 1944
- Already representative WCD rows: 1861
- Current missing WCD rows: 83
- Energy-template candidate rows: 83
- Effective metadata pointer updates: 83
- Unresolved residual rows: 0
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

This pass covers residual World Championship Deck Energy/template rows that have no source set or card number. Each candidate uses a same-name ordinary self-hosted Energy image, or for `Basic * Energy` rows only, a stripped-prefix same-type Energy image. The proposed notes explicitly say the row has no source key and that this is not an exact WCD replica or exact Energy print claim.

## Proposed Image Statuses

| key | count |
| --- | ---: |
| representative_shared | 83 |

## Source Match Kinds

| key | count |
| --- | ---: |
| same_name_energy_template_representative | 83 |

## Candidate Energy Names

| key | count |
| --- | ---: |
| Psychic Energy | 15 |
| Lightning Energy | 13 |
| Fighting Energy | 12 |
| Grass Energy | 9 |
| Water Energy | 8 |
| Fire Energy | 5 |
| Basic Lightning Energy | 3 |
| Darkness Energy | 3 |
| Basic Grass Energy | 2 |
| Basic Psychic Energy | 2 |
| Double Colorless Energy | 2 |
| Fairy Energy | 2 |
| Metal Energy | 2 |
| Basic Darkness Energy | 1 |
| Basic Fighting Energy | 1 |
| Basic Fire Energy | 1 |
| Basic Metal Energy | 1 |
| Rainbow Energy | 1 |

## Candidate Years

| key | count |
| --- | ---: |
| 2025 | 10 |
| 2007 | 7 |
| 2018 | 7 |
| 2005 | 6 |
| 2008 | 6 |
| 2009 | 6 |
| 2012 | 6 |
| 2019 | 6 |
| 2010 | 5 |
| 2024 | 5 |
| 2006 | 4 |
| 2017 | 4 |
| 2022 | 4 |
| 2023 | 4 |
| 2014 | 3 |

## Source Sets

| key | count |
| --- | ---: |
| swsh12.5 | 37 |
| dp1 | 7 |
| ex9 | 6 |
| ex13 | 4 |
| hgss1 | 4 |
| sve | 4 |
| xy1 | 3 |
| sm2 | 2 |
| sm3.5 | 2 |
| sv02 | 2 |
| sv03.5 | 2 |
| sv06.5 | 2 |
| dp5 | 1 |
| hgss3 | 1 |
| pl2 | 1 |
| sm3 | 1 |
| sm4 | 1 |
| sm7 | 1 |
| sv03 | 1 |
| swsh7 | 1 |

## Apply Boundary

A future apply package, if approved, should update only `card_prints.image_source`, `card_prints.image_path`, `card_prints.image_status`, and `card_prints.image_note` for the candidate rows in `docs\audits\image_truth_v1\self_hosted_images_wh09j_world_championship_energy_template_pointer_plan_v1.jsonl`.

It must not write storage, child rows, identity tables, price data, runtime public URL fields, deletes, merges, migrations, or exact-image claims.
