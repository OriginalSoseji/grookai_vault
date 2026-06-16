# ENRICH-23A2 Residual Parent Core Identity Backfill Dry Run

Generated at: 2026-06-16T02:36:52.517Z

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false
Cleanup performed: false

## Scope

Backfill parent mirror fields from existing active identity rows for four base-number rows unlocked by ENRICH-23A1:

- `card_prints.set_code`
- `card_prints.number`
- generated `card_prints.number_plain`

Luxray GL remains excluded/manual-blocked. This package does not write GV IDs, child rows, active identities, external mappings, traits, species, images, deletes, merges, migrations, or global apply.

## Dry-Run Result

- pass: true
- target rows: 4
- updated rows in rollback transaction: 4
- before core identity gap rows: 5
- after core identity gap rows inside dry run: 1
- active identity duplicate groups after dry run: 0
- dry-run proof hash: `354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab`
- package fingerprint: `f8b46df52c7fab9abb40aa6a7c6cc4031916f493b5d5314f3ec18d65ceee8d35`

## Rows

| set_code | number | number_plain | card_name | card_print_id |
| --- | --- | --- | --- | --- |
| xyp | XY150 | 150 | Yveltal EX | 28b773fa-ed21-47b8-a349-1d03f778c045 |
| xyp | XY198 | 198 | M Camerupt-EX | fa353da7-a194-4d02-8667-ad9b033a49e5 |
| xy4 | 65 | 65 | Aegislash EX | 21840232-9191-4566-8e3e-046f74841288 |
| xy9 | 98 | 98 | Delinquent | a6d34131-d056-49ae-a8b7-21d808e351f6 |

## Recommended Approval

`Approve real ENRICH-23A2-RESIDUAL-PARENT-CORE-IDENTITY-BACKFILL apply only. Fingerprint: f8b46df52c7fab9abb40aa6a7c6cc4031916f493b5d5314f3ec18d65ceee8d35. Scope: 4 parent card_print core identity updates from existing active identity rows; writes card_prints.set_code and card_prints.number only; generated number_plain verified in dry-run; Luxray GL remains manual-blocked; dry-run proof: 354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab == 354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab. No GV-ID writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.`
