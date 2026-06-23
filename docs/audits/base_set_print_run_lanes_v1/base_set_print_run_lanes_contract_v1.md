# Base Set Print Run Lanes V1 Audit

Generated: 2026-06-23T01:17:49.479Z

Contract: BASE_SET_PRINT_RUN_LANES_V1

Mode: read_only_no_db_writes

## Summary

- Source set: base1 / Base Set
- Ordinary Base Set checklist rows: 102/102
- Derived set rows currently present: 3
- Proposed new identity rows: 0
- Proposed rows with blockers: 0

## Lane Coverage

| Lane | Label | Identity Rows | Satisfied Slots | Missing Slots | Proposed Rows |
| --- | --- | --- | --- | --- | --- |
| base1-unlimited | Base Set Unlimited | 102 | 102 | 0 | 0 |
| base1-shadowless | Base Set Shadowless | 103 | 102 | 0 | 0 |
| base1-first-edition | Base Set 1st Edition | 103 | 102 | 0 | 0 |
| base1-1999-2000 | Base Set 1999-2000 | 102 | 102 | 0 | 0 |

## Pikachu Slot 58

Base Set Pikachu #58 is special. Shadowless and 1st Edition use existing red-cheeks/yellow-cheeks rows for slot 58. Ghost Stamp is excluded from ordinary lane coverage.

| GV ID | Variant | Modifier | Image |
| --- | --- | --- | --- |
| GV-PK-BS-58 |  |  | exact |
| GV-PK-BASE1-58-1999-2000 | 1999_2000 | print_run:1999-2000 | missing |
| GV-PK-BASE1-58-E3-STAMP | e3_stamp | e3_stamp | representative_shared_stamp |
| GV-PK-BASE1-58-E3-STAMP-RED-CHEEKS | e3_stamp_red_cheeks | stamp:e3;color:red_cheeks | representative_shared |
| GV-PK-BASE1-58-E3-STAMP-YELLOW-CHEEKS | e3_stamp_yellow_cheeks | stamp:e3;color:yellow_cheeks | representative_shared |
| GV-PK-BASE1-58-FIRST-EDITION-RED-CHEEKS | first_edition_red_cheeks | edition:first_edition;print_run:shadowless;color:red_cheeks | representative_shared |
| GV-PK-BASE1-58-FIRST-EDITION-YELLOW-CHEEKS | first_edition_yellow_cheeks | edition:first_edition;print_run:shadowless;color:yellow_cheeks | representative_shared |
| GV-PK-BASE1-58-GHOST-STAMP-SHADOWLESS | ghost_stamp_shadowless | print_run:shadowless;stamp_error:ghost_first_edition | representative_shared |
| GV-PK-BASE1-58-SHADOWLESS-RED-CHEEKS | shadowless_red_cheeks | print_run:shadowless;color:red_cheeks | representative_shared |
| GV-PK-BASE1-58-SHADOWLESS-YELLOW-CHEEKS | shadowless_yellow_cheeks | print_run:shadowless;color:yellow_cheeks | representative_shared |

## Proposed Row Samples

_None._

## Apply Boundary

This audit does not write to Supabase. A later apply step must introduce a guarded migration or lane-membership write plan and must keep Ghost Stamp outside ordinary Shadowless coverage.
