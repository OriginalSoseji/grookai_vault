# PKG-16F Same-Finish Split Guarded Dry Run V1

Rollback-only dry-run for same-finish stamped split parent identity inserts whose active finish now has multi-source evidence.

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
| bw5 | 37 | Jolteon | Regional Championships Stamp | regional_championships_stamp | reverse | 852d5fe5-3318-4aad-8443-0711a0df017d |
| bw5 | 84 | Eevee | City Championships Stamp | city_championships_stamp | reverse | cafec93e-cdb3-43e6-9f72-dcf6c6acc7d0 |
| sm1 | 128 | Professor Kukui | Regional Championships Stamp | regional_championships_stamp | reverse | 1685b1e6-345a-4fb9-be34-06ae26afa4c4 |
| swsh10 | 150 | Roxanne | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse | 23a7a4c4-b333-487a-be9b-04aefe1f8424 |
| xy1 | 84 | Doublade | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse | 3475e89a-9d54-4b8e-b096-f01eb9110230 |
| xy1 | 84 | Doublade | Regional Championships Stamp | regional_championships_stamp | reverse | 3475e89a-9d54-4b8e-b096-f01eb9110230 |

## Result

- dry_run_status: pkg16f_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `ae2c5c6f588eec7b48f7af97a23cc4cc24fddb167dc688b14368dc80c86bdecf`
- dry_run_proof_sha256: `48d2200c54e62cdb29a1c68570cc796291605b4738286ceeff3eb9d3cb2ab7e4`
- stop_findings: 0
