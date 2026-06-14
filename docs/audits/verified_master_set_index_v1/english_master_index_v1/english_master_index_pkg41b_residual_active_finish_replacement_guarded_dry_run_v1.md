# PKG-41B Residual Active Finish Replacement Guarded Dry Run V1

Rollback-only guarded dry-run for the next residual active-finish closure group.

## Safety

- dry_run_only: true
- db_writes_performed: false
- durable_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

| metric | value |
| --- | --- |
| package_id | PKG-41B-RESIDUAL-ACTIVE-FINISH-REPLACEMENT |
| fingerprint | 28c8db2789c9a57cdfc05b3b10351661a90a83e3dcb0be4c9f12200c01fc0f44 |
| target_rows | 3 |
| parent_updates | 3 |
| identity_inserts_simulated | 2 |
| child_inserts_simulated | 2 |
| child_deletes_simulated | 2 |
| rollback_proof_hash_match | true |

## Targets

| set | number | card | current_finish | target_finish | variant | replacement |
| --- | --- | --- | --- | --- | --- | --- |
| pl3 | 106 | Gible | holo | reverse | staff_stamp | true |
| smp | SM198 | Bulbasaur | normal | holo | pikachu_stamp | true |
| smp | SM65 | Alolan Raichu | normal | normal | battle_academy_deck_mark | false |

## Recommended Real Apply Approval

```text
Approve real PKG-41B-RESIDUAL-ACTIVE-FINISH-REPLACEMENT apply only. Fingerprint: 28c8db2789c9a57cdfc05b3b10351661a90a83e3dcb0be4c9f12200c01fc0f44. Scope: 3 parent modifier updates, 2 active identity inserts, 2 child inserts, 2 child deletes; sets pl3=1, smp=2; target finishes holo=1, normal=1, reverse=1. Dry-run proof: 8b159b0af50241c887aff7f51ee8a40c3c86145aa2e0e8db5ed38b595c7ac236 == 8b159b0af50241c887aff7f51ee8a40c3c86145aa2e0e8db5ed38b595c7ac236. No global apply. No migrations. No parent inserts. No mapping writes. No merges. No quarantine.
```
