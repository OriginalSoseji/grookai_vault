# PKG-15P Stamped Second-Wave Guarded Dry Run V1

Rollback-only dry-run for the second wave of stamped parent identity inserts whose active finish now has multi-source evidence.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 6
- identity_inserts: 6
- child_inserts: 6
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| dp1 | 98 | Shinx | City Championships Stamp | city_championships_stamp | normal | 3b6f4dbd-177d-4778-b023-f49d0b9fd24d |
| sm1 | 135 | Ultra Ball | Oceania Championships Staff Stamp | oceania_championships_staff_stamp | reverse | 51d202d3-ec63-4f2b-998a-2bb3429a5610 |
| sm5 | 119 | Cynthia | Regional Championships Stamp | regional_championships_stamp | reverse | df41a6f4-63cf-49c9-8cc6-9ea350726e64 |
| swsh10 | 150 | Roxanne | Regional Championships Stamp | regional_championships_stamp | reverse | 23a7a4c4-b333-487a-be9b-04aefe1f8424 |
| xy10 | 94 | Chaos Tower | National Championships Stamp | national_championships_stamp | reverse | b0eea10e-ebda-45ca-9714-6db5c03b349d |
| xy8 | 145 | Parallel City | City Championships Stamp | city_championships_stamp | reverse | 73ebda40-d6b9-4ca9-91a7-1e03cd15bf4b |

## Result

- dry_run_status: pkg15p_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `a7fe0f5d934e825ef73fd662881b4263721ad164a01bc48f0ad6a0eb55d42c44`
- dry_run_proof_sha256: `14d6405f2e4294b8f0afe3f03cb0a553c9e36a7466e828159bec2f4cb12e1c83`
- stop_findings: 0
