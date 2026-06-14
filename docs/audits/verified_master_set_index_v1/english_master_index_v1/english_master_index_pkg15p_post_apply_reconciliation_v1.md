# PKG-15P Post-Apply Reconciliation V1

Read-only post-apply verification for PKG-15P stamped parent identities and child printings.

## Safety

- audit_only: true
- db_reads_performed: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- targets: 6
- verified_after_apply: 6
- stop_findings: 0
- duplicate_identity_hash_rows: 0
- forbidden_stamped_child_finishes: 0
- reconciliation_fingerprint_sha256: `4a10fe93510ec92f0a50fa97f486ae340bd2bdd0dbb1271db5963dc3f5298fe3`

| status | rows |
| --- | --- |
| verified_after_apply | 6 |

## Rows

| set | number | name | variant | finish | parent_id | child_id | identity_id | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dp1 | 98 | Shinx | city_championships_stamp | normal | 542686fb-9987-4003-b83b-b1eda3d75c73 | 79b0fe77-d3a7-4af0-babd-f5821462312f | 42006599-5da8-417c-9c59-727c68ef8bd1 | verified_after_apply |
| sm1 | 135 | Ultra Ball | oceania_championships_staff_stamp | reverse | 9a29554c-c5e5-40ad-95b5-68714ca316bd | c77a842c-1064-4cbd-9ddc-c2cb0dd68a81 | 323238e1-2a23-4924-a7cc-4490305ca886 | verified_after_apply |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | 1d9439c0-0bf1-4d5c-a8d1-77c69c22dd49 | 8fa84c77-5a71-4f11-9418-f748baaca2e5 | 49687f4a-e052-4372-9563-a399e3f20122 | verified_after_apply |
| swsh10 | 150 | Roxanne | regional_championships_stamp | reverse | bf26d7a4-3168-444a-b0f0-f3ee57e3c0d3 | b1bcc676-11f4-4408-9eb6-0156dc3baa7f | 8158dcad-0bba-4175-a40e-b00d905f6e77 | verified_after_apply |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | 5fb9f9b8-d2c3-4663-af91-dcc01a411bee | 536daad5-0b36-4c3d-9d9a-648195ee4b98 | 0eb8e99d-41c8-4062-9b84-e8ee617cde1a | verified_after_apply |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | 088833de-b996-464b-85a2-f0d8874e0fa4 | 0ea89aed-b1cd-47f4-9af5-2b3843e62f7c | 7fb2ffbc-9457-470f-9e3d-49368a8a2f4a | verified_after_apply |
