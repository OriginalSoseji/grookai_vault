# PKG-16F Same-Finish Split Real Apply V1

Guarded real apply artifact for same-finish stamped split parent identities and child printings.

## Safety

- db_writes_performed: true
- durable_db_writes_performed: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false

## Scope

- parent_inserts: 6
- identity_inserts: 6
- child_inserts: 6
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish |
| --- | --- | --- | --- | --- | --- |
| bw5 | 37 | Jolteon | Regional Championships Stamp | regional_championships_stamp | reverse |
| bw5 | 84 | Eevee | City Championships Stamp | city_championships_stamp | reverse |
| sm1 | 128 | Professor Kukui | Regional Championships Stamp | regional_championships_stamp | reverse |
| swsh10 | 150 | Roxanne | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse |
| xy1 | 84 | Doublade | Regional Championships Staff Stamp | regional_championships_staff_stamp | reverse |
| xy1 | 84 | Doublade | Regional Championships Stamp | regional_championships_stamp | reverse |

## Verification

- apply_status: pkg16f_real_apply_committed
- package_fingerprint_sha256: `ae2c5c6f588eec7b48f7af97a23cc4cc24fddb167dc688b14368dc80c86bdecf`
- dry_run_proof_sha256: `48d2200c54e62cdb29a1c68570cc796291605b4738286ceeff3eb9d3cb2ab7e4`
- verification_hash_sha256: `ebf36d3c49ed0bf9004a466a5277785555101daf539ab837f0a492b10d896070`
- stop_findings: 0
