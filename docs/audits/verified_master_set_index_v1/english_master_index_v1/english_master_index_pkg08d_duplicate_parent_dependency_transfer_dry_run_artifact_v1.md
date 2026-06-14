# PKG-08D Duplicate Parent Dependency Transfer Dry-Run Artifact V1

Prepared rollback-only SQL artifact for duplicate parent dependency transfer. The SQL was not executed.

## Status

- artifact_status: `pkg08d_duplicate_parent_dependency_transfer_dry_run_artifact_prepared_apply_blocked_no_write`
- package_id: `PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER`
- package_fingerprint_sha256: `b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8`
- sql_sha256: `1cef89020ae8aaf4323843cb2895d7ede0b04712ab8818708170810635ddc936`
- duplicate_parent_rows: 39
- survivor_parent_rows: 38

## Dependency Scope

| dependency | rows |
| --- | --- |
| external_mappings | 39 |
| card_print_species_transfer | 0 |
| card_print_species_redundant_left_for_parent_delete_cascade | 36 |
| canon_warehouse_candidates | 39 |
| justtcg_variants | 215 |
| justtcg_variant_prices_latest | 215 |
| justtcg_variant_price_snapshots | 20640 |

## Sets

| set | duplicate_parent_rows |
| --- | --- |
| ex3 | 2 |
| ex5 | 1 |
| ex7 | 1 |
| ex8 | 1 |
| ex9 | 1 |
| ex12 | 1 |
| smp | 3 |
| swsh7 | 2 |
| swsh9 | 1 |
| swsh10 | 1 |
| swsh11 | 2 |
| sv01 | 6 |
| sv02 | 1 |
| sv03.5 | 1 |
| sv04 | 2 |
| sv05 | 3 |
| sv06 | 1 |
| sv07 | 1 |
| sv10 | 7 |
| me01 | 1 |

## Required Approval For Next Step

The next step is guarded dry-run transaction execution only. It is not a real apply.

```text
Approve PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER for guarded dry-run transaction execution only. Fingerprint: b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8. Scope: 38 groups, 39 duplicate parent rows, dependency transfer simulation, rollback-only. No real apply. No migrations.
```

## Safety

- db_writes_performed: false
- migrations_created: false
- real_apply_performed: false
- cleanup_performed: false
- quarantine_performed: false
- SQL contains ROLLBACK: true
- SQL contains COMMIT: false
