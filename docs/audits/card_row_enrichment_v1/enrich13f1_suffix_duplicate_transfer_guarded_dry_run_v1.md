# ENRICH-13F1 Suffix Duplicate Transfer Guarded Dry-Run V1

Generated: 2026-06-15T20:36:13.376Z

Package: `ENRICH-13F1-SUFFIX-DUPLICATE-TRANSFER-DRY-RUN`

This rollback-only dry-run covers only duplicate suffix rows where the proposed number already matches an existing suffix owner. Base-number rows are intentionally blocked because suffix letters are identity-bearing and base cards must not be merged into suffix owners.

## Status

| Field | Value |
| --- | --- |
| pass | true |
| dry_run_execution_status | enrich13f1_guarded_dry_run_passed_rolled_back_no_durable_change |
| package_fingerprint | 8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b |
| sql_hash | 4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd |
| duplicate_target_rows | 4 |
| blocked_base_rows | 4 |
| duplicate_child_printings | 12 |
| durable_after_matches_before | true |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | d8014a20e205855785e81263413eb2ce35632fa78cef975c2bb2b89cc33b37fe |
| After snapshot hash | d8014a20e205855785e81263413eb2ce35632fa78cef975c2bb2b89cc33b37fe |
| Before duplicate parents | 4 |
| Before duplicate child printings | 12 |
| Printing-level external refs | 0 |
| Printing-level vault refs | 0 |
| Printing-level warehouse refs | 0 |
| Execution error |  |

## Blocked Base Rows

- xy4 65 Aegislash EX: blocked from suffix-owner merge
- xy9 98 Delinquent: blocked from suffix-owner merge
- xyp XY150 Yveltal EX: blocked from suffix-owner merge
- xyp XY198 M Camerupt-EX: blocked from suffix-owner merge

## Stop Findings

None.

## Real Apply Approval Text

A real apply is not authorized by this report. If this exact package is later approved, use:

```text
Approve real ENRICH-13F1-SUFFIX-DUPLICATE-TRANSFER apply only. Fingerprint: 8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b. SQL hash: 4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd. Scope: 4 duplicate suffix parent dependency transfers, 12 child printings deduped/transferred, 4 external mappings handled; 4 base-number rows remain blocked. Dry-run proof: d8014a20e205855785e81263413eb2ce35632fa78cef975c2bb2b89cc33b37fe == d8014a20e205855785e81263413eb2ce35632fa78cef975c2bb2b89cc33b37fe. No global apply. No migrations. No image writes.
```
