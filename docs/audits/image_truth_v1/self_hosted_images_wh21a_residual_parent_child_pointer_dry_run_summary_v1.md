# IMG-HOST-WH-21A-RESIDUAL-PARENT-CHILD-POINTER-DRY-RUN

- Generated: 2026-06-24T17:57:35.396Z
- Mode: dry_run_no_write
- Fingerprint: `842aa08cd9dc514293088f58df5908aa754bc60f715a0dd12f74bf9ba6ad268c`
- Plan hash: `19d516ef32c08c7e46ec89e65a41d185fab1dacdb79e6145147588c1d4e5f038`
- SQL hash: `4423d05aa86aec549e82542d41afcb4c35211432378754a4d4d7e18004fea677`
- Residual parent gap rows scanned: 68
- Target parent rows with existing child image: 41
- Effective metadata pointer updates: 41
- Residual parent gap rows without child-image route: 27
- Ready for apply package: true
- Stop findings: none
- Target table: `card_prints`
- Planned columns: card_prints.image_source, card_prints.image_path, card_prints.image_status, card_prints.image_note
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false
- Exact image claim changes performed: false
- Runtime public URL field writes planned: false
- Global apply performed: false

## By Set

| key | count |
| --- | ---: |
| mep | 23 |
| svp | 7 |
| xya | 6 |
| col1 | 3 |
| misc | 1 |
| swshp | 1 |

## Source Finish

| key | count |
| --- | ---: |
| holo | 24 |
| normal | 14 |
| cosmos | 3 |

## Source Child Status

| key | count |
| --- | ---: |
| exact | 20 |
| representative_shared | 20 |
| representative_shared_stamp | 1 |

## Proposed Status

| key | count |
| --- | ---: |
| representative_shared | 40 |
| representative_shared_stamp | 1 |

## Changed Columns

| key | count |
| --- | ---: |
| image_note | 41 |
| image_path | 41 |
| image_source | 41 |
| image_status | 40 |

## Unsupported Residual Rows

| key | count |
| --- | ---: |
| unknown | 27 |
