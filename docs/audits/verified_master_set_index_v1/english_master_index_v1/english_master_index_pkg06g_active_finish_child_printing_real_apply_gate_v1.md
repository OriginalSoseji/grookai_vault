# PKG-06G Active Finish Child Printing Real Apply Gate V1

This is a no-write gate for operator decision. It does not apply SQL.

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-06G-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `4218f824485c51703e3428dbd1e8e5dcacabe0490242500cc3d803efdfd7baad` |
| sql_hash_sha256 | `e6360b72debe78c2b71d65949a1dfb3547e61cd48e5738bfd375722142c1854c` |
| child_card_printing_inserts | 313 |
| target_parent_rows | 305 |
| stop_findings | 0 |
| db_writes_performed | false |
| migrations_created | false |

## Required Approval

```text
Approve real PKG-06G-ACTIVE-FINISH-CHILD-PRINTING-INSERTS apply only. Fingerprint: 4218f824485c51703e3428dbd1e8e5dcacabe0490242500cc3d803efdfd7baad. SQL hash: e6360b72debe78c2b71d65949a1dfb3547e61cd48e5738bfd375722142c1854c. Scope: 313 child-only card_printing inserts for ex12/Legend Maker, swshp/SWSH Black Star Promos, swsh7/Evolving Skies, sv04/Paradox Rift, swsh1/Sword & Shield, sv02/Paldea Evolved, swsh2/Rebel Clash, hgss4/HS-Triumphant, pop3/POP Series 3, and swsh4/Vivid Voltage; finishes reverse=114, holo=115, normal=46, cosmos=38; target parents=305. Dry-run proof: d371471409efd17427ccefba86e34b2d9a87294e2e173a1f570e5219fd8c3b7e == d371471409efd17427ccefba86e34b2d9a87294e2e173a1f570e5219fd8c3b7e. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.
```

## Non-Authorizations

- This gate is not a real apply.
- This gate does not record approval.
- This gate does not run SQL.
- This gate does not read from or write to the database.
- This gate does not create a migration.
- This gate does not authorize global apply.
- This gate does not authorize deletes.
- This gate does not authorize merges.
- This gate does not authorize unsupported cleanup.
- This gate does not authorize parent writes.
