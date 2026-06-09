# PKG-01A Post-Apply Reconciliation Checkpoint V1

Date: 2026-06-09

## Purpose

Record the read-only post-apply reconciliation for the approved one-row PKG-01A / fut2020 DB change.

## Result

| Field | Value |
| --- | --- |
| reconciliation_status | pkg01a_post_apply_reconciled_fut2020_verified_by_index |
| set_key | fut2020 |
| Master Index cards | 5 |
| Master Index printings | 5 |
| Grookai mapped cards | 1 |
| Grookai mapped printings | 1 |
| PKG-01A card status | verified_by_index |
| PKG-01A printing status | verified_by_index |
| PKG-01A unsupported_by_index | 0 |
| Remaining fut2020 unmapped source rows | 4 |
| Remaining fut2020 unmapped source child printings | 12 |
| stop_findings | 0 |

## PKG-01A Target

| Field | Value |
| --- | --- |
| card_print_id | a676888d-19e0-4064-89aa-e67019af5b95 |
| set_code | fut2020 |
| number | 1 |
| name | Pikachu on the Ball |
| finishes | holo |
| vault_items | 0 |

## Safety

- DB reads performed: true
- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- PKG-01B included: false
- Remaining fut2020 cards #2-#5 are not treated as a PKG-01A failure. They remain outside this approval scope and require a separate PKG-01B/split pilot decision.

## Source Reports

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_post_apply_reconciliation_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_post_apply_reconciliation_v1.md`

