# ENRICH-06C2 Source-Mapped Active Finish Child Insert Real Apply V1

Package: `ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT`

## Result

- Pass: true
- Target parent rows: 10
- Inserted child rows: 13
- Package fingerprint: `6e32357534841a49f65bfd3f10e23f04cd982a6795b5c2e47b2fd50829bec8e7`
- Dry-run proof: `26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43 == 26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43`
- Before child rows in scope: 0
- After child rows in scope: 13

## Safety

- Durable DB writes performed: true
- Writes performed: `card_printings` inserts only
- Parent writes: false
- Identity writes: false
- Mapping writes: false
- Deletes/merges: false
- Migrations created: false
- Image writes: false
- Global apply: false

## By Finish

| finish | rows |
| --- | --- |
| holo | 7 |
| normal | 3 |
| reverse | 3 |

## Stop Findings

_None._
