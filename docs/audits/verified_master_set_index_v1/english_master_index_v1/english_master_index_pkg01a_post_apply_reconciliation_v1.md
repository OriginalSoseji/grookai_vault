# English Master Index PKG-01A Post-Apply Reconciliation V1

This report verifies the approved one-row `PKG-01A / fut2020` DB apply after it was committed.

It is read-only: no DB writes, migrations, cleanup, quarantine, or PKG-01B execution were performed.

## Status

| Field | Value |
| --- | --- |
| reconciliation_status | pkg01a_post_apply_reconciled_fut2020_verified_by_index |
| set_key | fut2020 |
| db_reads_performed | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| pkg01b_included | false |
| stop_findings | 0 |

## Counts

| Metric | Count |
| --- | ---: |
| Master Index cards | 5 |
| Master Index printings | 5 |
| Grookai mapped cards | 1 |
| Grookai mapped printings | 1 |
| PKG-01A card status | verified_by_index |
| PKG-01A printing status | verified_by_index |
| PKG-01A unsupported_by_index | 0 |
| Remaining fut2020 unmapped source rows | 4 |
| Remaining fut2020 unmapped source child printings | 12 |

## Card Comparison

| # | Card | Status | Grookai IDs |
| --- | --- | --- | --- |
| 1 | Pikachu on the Ball | verified_by_index | a676888d-19e0-4064-89aa-e67019af5b95 |
| 2 | Eevee on the Ball | missing_set_code_mapping |  |
| 3 | Grookey on the Ball | missing_set_code_mapping |  |
| 4 | Scorbunny on the Ball | missing_set_code_mapping |  |
| 5 | Sobble on the Ball | missing_set_code_mapping |  |

## Printing Comparison

| # | Card | Finish | Status | Grookai IDs |
| --- | --- | --- | --- | --- |
| 1 | Pikachu on the Ball | holo | verified_by_index | a676888d-19e0-4064-89aa-e67019af5b95 |
| 2 | Eevee on the Ball | normal | missing_from_grookai |  |
| 3 | Grookey on the Ball | normal | missing_from_grookai |  |
| 4 | Scorbunny on the Ball | normal | missing_from_grookai |  |
| 5 | Sobble on the Ball | normal | missing_from_grookai |  |

## PKG-01A Target

| Field | Value |
| --- | --- |
| card_print_id | a676888d-19e0-4064-89aa-e67019af5b95 |
| set_code | fut2020 |
| number | 1 |
| name | Pikachu on the Ball |
| finishes | holo |
| vault_items | 0 |

## Stop Findings

None.

