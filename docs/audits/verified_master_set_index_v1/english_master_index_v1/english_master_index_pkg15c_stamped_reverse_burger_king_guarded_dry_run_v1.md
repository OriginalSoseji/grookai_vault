# PKG-15C Stamped Reverse Burger King Guarded Dry Run V1

Rollback-only dry-run for deterministic Burger King stamped canonical parent inserts with adjudicated reverse child finish.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 8
- identity_inserts: 8
- child_inserts: 8
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish |
| --- | --- | --- | --- | --- | --- |
| dp1 | 35 | Pachirisu | Diamond & Pearl Stamp | diamond_pearl_stamp | reverse |
| dp1 | 49 | Grotle | Diamond & Pearl Stamp | diamond_pearl_stamp | reverse |
| dp1 | 56 | Monferno | Diamond & Pearl Stamp | diamond_pearl_stamp | reverse |
| dp5 | 56 | Chimchar | Platinum Stamped Burger King 2009 | platinum_stamped_burger_king_2009 | reverse |
| dp5 | 62 | Eevee | Platinum Stamped Burger King 2009 | platinum_stamped_burger_king_2009 | reverse |
| dp5 | 70 | Pikachu | Platinum Stamped Burger King 2009 | platinum_stamped_burger_king_2009 | reverse |
| dp5 | 71 | Piplup | Platinum Stamped Burger King 2009 | platinum_stamped_burger_king_2009 | reverse |
| dp5 | 77 | Turtwig | Platinum Stamped Burger King 2009 | platinum_stamped_burger_king_2009 | reverse |

## Result

- dry_run_status: pkg15c_stamped_reverse_burger_king_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `f33e5f765038d4c6736e10e6efe877a0cc6c01649f4d35e3a842f5aeaea0f053`
- dry_run_proof_sha256: `35f15587cc9e0d5c3d8704f77d3f6c138643f68ae27c48d2419b1e1b8c7f6911`
- stop_findings: 0
