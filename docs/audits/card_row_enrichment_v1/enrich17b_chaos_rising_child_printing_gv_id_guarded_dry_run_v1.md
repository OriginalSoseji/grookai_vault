# ENRICH-17B Chaos Rising Child Printing GV-ID Guarded Dry Run V1

Package: `ENRICH-17B-CHAOS-RISING-CHILD-PRINTING-GV-ID-BACKFILL`

## Result

- Pass: true
- Target set: me04 / Chaos Rising
- Target rows: 247
- Updated inside transaction: 247
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001`
- After rollback hash: `cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001`
- Package fingerprint: `942f94c9c3ca8e7c5c4169339aa36b8f4957c382cf63ba2d166b3a41ab96deba`

## By Finish

| finish_key | rows |
| --- | --- |
| normal | 113 |
| reverse | 76 |
| holo | 58 |

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Parent writes: false
- Identity writes: false
- External mapping/species writes: false
- Deletes/merges: false
- Image writes: false

## Proposed GV-ID Samples

| number | card_name | finish_key | proposed_printing_gv_id |
| --- | --- | --- | --- |
| 001 | Weedle | normal | GV-PK-CRI-001-STD |
| 001 | Weedle | reverse | GV-PK-CRI-001-RH |
| 002 | Kakuna | normal | GV-PK-CRI-002-STD |
| 002 | Kakuna | reverse | GV-PK-CRI-002-RH |
| 003 | Beedrill ex | holo | GV-PK-CRI-003-HOLO |
| 003 | Beedrill ex | normal | GV-PK-CRI-003-STD |
| 004 | Carnivine | normal | GV-PK-CRI-004-STD |
| 004 | Carnivine | reverse | GV-PK-CRI-004-RH |
| 005 | Chespin | normal | GV-PK-CRI-005-STD |
| 005 | Chespin | reverse | GV-PK-CRI-005-RH |
| 006 | Quilladin | normal | GV-PK-CRI-006-STD |
| 006 | Quilladin | reverse | GV-PK-CRI-006-RH |
| 007 | Chesnaught | holo | GV-PK-CRI-007-HOLO |
| 007 | Chesnaught | reverse | GV-PK-CRI-007-RH |
| 008 | Vulpix | normal | GV-PK-CRI-008-STD |
| 008 | Vulpix | reverse | GV-PK-CRI-008-RH |
| 009 | Ninetales | normal | GV-PK-CRI-009-STD |
| 009 | Ninetales | reverse | GV-PK-CRI-009-RH |
| 010 | Ho-Oh | holo | GV-PK-CRI-010-HOLO |
| 010 | Ho-Oh | reverse | GV-PK-CRI-010-RH |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-17B-CHAOS-RISING-CHILD-PRINTING-GV-ID-BACKFILL apply only. Fingerprint: 942f94c9c3ca8e7c5c4169339aa36b8f4957c382cf63ba2d166b3a41ab96deba. Scope: 247 Chaos Rising child card_printing printing_gv_id updates using governed finish suffixes normal=STD, holo=HOLO, reverse=RH. Dry-run proof: cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001 == cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001. No parent writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
