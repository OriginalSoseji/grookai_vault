# PKG-16F Post-Apply Reconciliation V1

Read-only post-apply verification for PKG-16F same-finish stamped split parent identities and child printings.

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
- reconciliation_fingerprint_sha256: `b2de38ffbec7bfa825005ca088edd14aa41e1778af85d4bd200478b74c913ca7`

| status | rows |
| --- | --- |
| verified_after_apply | 6 |

## Rows

| set | number | name | variant | finish | parent_id | child_id | identity_id | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | ff0dbd84-07a6-4d0f-a628-e873d343f481 | d514cdc7-330b-4df3-9f1e-f55532a3b4de | 6798ffe6-47b1-41af-adf0-fe2a1a6605ad | verified_after_apply |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | 85ea4524-3f07-494b-986c-290dd1515685 | dad0ee99-ab6b-452c-892e-1abdbde3cf9a | aba6a8a2-9ae9-45f3-b444-cd07fc87daf7 | verified_after_apply |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | 378cd3c8-dc1d-4206-b528-9cb79fbce6e6 | 574619b0-8a03-4320-ac41-fcfdf2b9507c | 8b6cf6df-3287-4374-a284-9fb56399f4ae | verified_after_apply |
| swsh10 | 150 | Roxanne | regional_championships_staff_stamp | reverse | 41d8cce4-540a-4a89-bcae-2e4518735c85 | c3501f8a-5ea3-46e8-9d26-8cb4483e30c8 | 35efd1c0-282d-4866-aa6a-89000cdc18f3 | verified_after_apply |
| xy1 | 84 | Doublade | regional_championships_staff_stamp | reverse | 24795277-4419-4d8d-a418-47eb60a05659 | 30f74cc9-9a17-47b4-a36e-efefad46a09c | 0ec05601-881f-47f0-b7e7-43b3815cad3c | verified_after_apply |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | 9d665bc1-f4cf-4e17-8ae8-99b8ced25165 | 02d7e873-2550-4d7b-be98-bd7d10265994 | 9171af83-bbcc-46e1-8f06-a2bd9b0a2678 | verified_after_apply |
