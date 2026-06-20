# PKG-17R League Reverse Bulk Guarded Dry Run V1

Rollback-only dry-run for two-source League Stamp reverse parent identity inserts.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 0
- identity_inserts: 0
- child_inserts: 0
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| hgss2 | 21 | Poliwrath | League Stamp | league_stamp | reverse | 35b370fc-af3a-4736-8ccd-4ccb7a2f2414 |
| pl2 | 89 | Bebe's Search | League Stamp | league_stamp | reverse | 87a00c27-4797-40b7-851c-b06ace0a4919 |
| pl2 | 98 | Volkner's Philosophy | League Stamp | league_stamp | reverse | d83fc269-e376-4c63-9273-75ac228df930 |

## Result

- dry_run_status: pkg17r_failed_rolled_back
- package_fingerprint_sha256: `2b5c34647974bf55ae8eaa5d1aff3b829ca44c652626462000a092566d9479ab`
- dry_run_proof_sha256: `null`
- stop_findings: 1

## Approval Text

```text
Not approval-ready; dry-run did not pass cleanly.
```
