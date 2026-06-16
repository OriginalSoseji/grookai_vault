# ENRICH-03B Active Identity Real Apply V1

Package: `ENRICH-03B-ACTIVE-IDENTITY-BACKFILL-POST-DUPLICATE-DELETE`

## Result

- Pass: true
- Target rows: 940
- Inserted rows: 940
- Package fingerprint: `0c72e3998ba3544d7b335961fd3c4cb015619930caf498c8401bb44c01de6aab`
- Dry-run proof: `5638a80567d83bbdaa825e56ac0503f6d44068ee9366c8d08c61de17942e2cc2 == 5638a80567d83bbdaa825e56ac0503f6d44068ee9366c8d08c61de17942e2cc2`
- Before active identity rows: 0
- After active identity rows: 940

## Safety

- Durable DB writes performed: true
- Writes performed: `card_print_identity` inserts only
- Parent writes: false
- Child writes: false
- Deletes/merges: false
- Migrations created: false
- Image writes: false
- Global apply: false

## By Set

| set_code | rows |
| --- | --- |
| gym1 | 132 |
| gym2 | 132 |
| neo4 | 113 |
| neo1 | 111 |
| base1 | 102 |
| base5 | 83 |
| neo2 | 75 |
| neo3 | 66 |
| base2 | 64 |
| base3 | 62 |

## Stop Findings

_None._
