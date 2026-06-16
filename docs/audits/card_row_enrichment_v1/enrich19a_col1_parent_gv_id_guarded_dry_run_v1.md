# ENRICH-19A COL1 Parent GV-ID Guarded Dry Run V1

Package: `ENRICH-19A-COL1-PARENT-GV-ID-BACKFILL`

## Result

- Pass: true
- Target rows: 3
- Updated inside transaction: 3
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c`
- After rollback hash: `aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c`
- Package fingerprint: `f3cb5ee87c0814783b070401b5bc179b11e5e6a4be56269fc7d700aaa36948aa`

## Targets

| number | card_name | proposed_gv_id |
| --- | --- | --- |
| 1 | Clefable | GV-PK-COL-1 |
| 10 | Houndoom | GV-PK-COL-10 |
| 5 | Forretress | GV-PK-COL-5 |

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Child writes: false
- Identity writes: false
- External mapping/species writes: false
- Deletes/merges: false
- Image writes: false

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-19A-COL1-PARENT-GV-ID-BACKFILL apply only. Fingerprint: f3cb5ee87c0814783b070401b5bc179b11e5e6a4be56269fc7d700aaa36948aa. Scope: 3 Call of Legends parent card_print gv_id updates using governed COL namespace. Dry-run proof: aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c == aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
