# ENRICH-13E1 Name Alias Duplicate Transfer Guarded Dry-Run V1

Generated: 2026-06-15T20:01:27.516Z

Package: `ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN`

This is a rollback-only dry-run proof for deterministic name/alias duplicate parent adjudication. The manual Luxray GL versus Luxray GL LV.X row is excluded.

## Status

| Field | Value |
| --- | --- |
| pass | true |
| dry_run_execution_status | enrich13e1_guarded_dry_run_passed_rolled_back_no_durable_change |
| package_fingerprint | 17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02 |
| sql_hash | bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d |
| target_rows | 40 |
| duplicate_child_printings | 99 |
| manual_blocked_rows_excluded | 1 |
| durable_after_matches_before | true |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | 806b0f6d39dabe7adb8dc04170cd2a9b9c055fcca48a36a9aa745e5af185b2ae |
| After snapshot hash | 806b0f6d39dabe7adb8dc04170cd2a9b9c055fcca48a36a9aa745e5af185b2ae |
| Before duplicate parents | 40 |
| Before duplicate child printings | 99 |
| Printing-level external refs | 0 |
| Printing-level vault refs | 0 |
| Printing-level warehouse refs | 0 |
| Execution error |  |

## Stop Findings

None.

## Real Apply Approval Text

A real apply is not authorized by this report. If this exact package is later approved, use:

```text
Approve real ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER apply only. Fingerprint: 17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02. SQL hash: bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d. Scope: 40 deterministic alias duplicate parent dependency transfers, 99 child printings deduped/transferred, 40 external mappings handled, 40 duplicate active identities removed; 1 manual Luxray row excluded. Dry-run proof: 806b0f6d39dabe7adb8dc04170cd2a9b9c055fcca48a36a9aa745e5af185b2ae == 806b0f6d39dabe7adb8dc04170cd2a9b9c055fcca48a36a9aa745e5af185b2ae. No global apply. No migrations. No image writes.
```
