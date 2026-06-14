# PKG-15O Post-Apply Reconciliation V1

Read-only post-apply verification for PKG-15O stamped parent identities and reverse child printings.

## Safety

- audit_only: true
- db_reads_performed: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- targets: 5
- verified_after_apply: 5
- stop_findings: 0
- duplicate_identity_hash_rows: 0
- forbidden_stamped_child_finishes: 0
- reconciliation_fingerprint_sha256: `153ecf05e6ecc64424957852f4a0a2b6fc9a7196fedd8d65e87d2a59ea87fec1`

| status | rows |
| --- | --- |
| verified_after_apply | 5 |

## Rows

| set | number | name | variant | finish | parent_id | child_id | identity_id | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sm4 | 95 | Gladion | regional_championships_staff_stamp | reverse | a53b99df-ef7d-4403-8285-3210ddb9910a | 9eff98c3-f2c5-47a1-a82e-9cb25dd1256b | a8a853b4-82a6-4126-a4d2-e3da40c4cedd | verified_after_apply |
| sm6 | 102 | Beast Ring | league_stamp | reverse | 664719b5-9898-40f7-bc6b-538711056228 | 7efb8041-4c5e-4055-abeb-e6e3bd5e0dec | c2c5aa3f-27b0-4bd2-b886-c63eabb2119c | verified_after_apply |
| sm6 | 105 | Diantha | regional_championships_staff_stamp | reverse | 40ba1113-bad6-435e-93d3-37e7b0829ef1 | 145c1c51-534c-4211-9aed-0ecf42222614 | 6dfa1b6e-8990-4b1e-a5dd-5a0dbf0f31d2 | verified_after_apply |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | ae2f2edf-c696-4acd-bf6b-ea056b7212b2 | 3828a17f-cc09-4401-98d9-4dc180a7f733 | 386b1d5e-4cd3-49d6-aa86-63aceff8dc26 | verified_after_apply |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | ac3dc158-0251-4836-a2d8-fdb17abaafb9 | ca070de2-f19a-442c-b2bf-f82027acc77b | 1285e20f-cddc-433e-a594-a73debccd0c6 | verified_after_apply |
