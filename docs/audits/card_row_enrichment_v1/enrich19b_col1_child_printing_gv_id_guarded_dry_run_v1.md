# ENRICH-19B COL1 Child Printing GV-ID Guarded Dry Run V1

Package: `ENRICH-19B-COL1-CHILD-PRINTING-GV-ID-BACKFILL`

## Result

- Pass: true
- Target rows: 6
- Updated inside transaction: 6
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `3a625dc9f22591208e7e079f1fa0e6ee243a4b682093a022ed2192263e95e693`
- After rollback hash: `3a625dc9f22591208e7e079f1fa0e6ee243a4b682093a022ed2192263e95e693`
- Package fingerprint: `8cc0f8b8856064ca6c7bd5f98b325db6f65be31f6873863ac8a6b4f4fff1786f`

## By Finish

| finish_key | rows |
| --- | --- |
| holo | 3 |
| reverse | 3 |

## Targets

| number | card_name | finish_key | proposed_printing_gv_id |
| --- | --- | --- | --- |
| 1 | Clefable | holo | GV-PK-COL-1-HOLO |
| 1 | Clefable | reverse | GV-PK-COL-1-RH |
| 10 | Houndoom | holo | GV-PK-COL-10-HOLO |
| 10 | Houndoom | reverse | GV-PK-COL-10-RH |
| 5 | Forretress | holo | GV-PK-COL-5-HOLO |
| 5 | Forretress | reverse | GV-PK-COL-5-RH |

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Parent writes: false
- Identity writes: false
- External mapping/species writes: false
- Deletes/merges: false
- Image writes: false

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-19B-COL1-CHILD-PRINTING-GV-ID-BACKFILL apply only. Fingerprint: 8cc0f8b8856064ca6c7bd5f98b325db6f65be31f6873863ac8a6b4f4fff1786f. Scope: 6 Call of Legends child card_printing printing_gv_id updates using governed finish suffixes holo=HOLO, reverse=RH. Dry-run proof: 3a625dc9f22591208e7e079f1fa0e6ee243a4b682093a022ed2192263e95e693 == 3a625dc9f22591208e7e079f1fa0e6ee243a4b682093a022ed2192263e95e693. No parent writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
