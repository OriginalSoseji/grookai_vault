# IMG-HOST-WH-03A-DB-POINTER-REPOINT-DRY-RUN

- Generated: 2026-06-23T15:05:29.410Z
- Mode: dry_run_no_write
- Fingerprint: `c19c43fd4f89cd1bd037ca90342c6ed155b84367cd7af9348a9280ab50ee22f5`
- Manifest rows: 27139
- Completed manifest rows: 27139
- Incomplete manifest rows: 0
- Unique DB rows in scope: 23998
- Runtime field repoint plan rows: 27139
- Metadata pointer plan rows: 23998
- Total plan rows: 51137
- Stale current runtime image values: 0
- Missing current DB rows: 0
- Ready for apply package: true
- Stop findings: none
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false
- Exact image claim changes performed: false

## Target Tables

| key | count |
| --- | ---: |
| card_prints | 51101 |
| card_printings | 36 |

## Runtime Fields

| key | count |
| --- | ---: |
| card_prints.image_url | 22467 |
| card_prints.image_alt_url | 3144 |
| card_prints.representative_image_url | 1510 |
| card_printings.image_alt_url | 18 |

## Metadata Tables

| key | count |
| --- | ---: |
| card_prints | 23980 |
| card_printings | 18 |

## Stale Runtime Fields

_None._
