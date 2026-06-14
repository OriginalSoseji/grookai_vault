# English Master Index SV03 Play Pokemon ex Holo Child Insert Guarded Dry Run V1

Rollback-only guarded dry-run for child-only inserts on existing SV03 Play Pokemon stamped ex parents. No durable database writes, parent writes, identity writes, deletes, merges, cleanup, quarantine, migrations, or global apply were performed.

| Field | Value |
| --- | --- |
| package_id | SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT |
| package_fingerprint_sha256 | `b33838c9f31d9b693bf8be33940c814cfe31fb78335dd87b18ec67864b8a13db` |
| target_rows | 2 |
| child_inserts_simulated | 2 |
| parent_writes_simulated | 0 |
| identity_writes_simulated | 0 |
| durable_after_snapshot_matches_before_snapshot | true |
| dry_run_proof_hash | `7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35` |

| set | number | card | variant | finish | parent | child_id |
| --- | --- | --- | --- | --- | --- | --- |
| sv03 | 22 | Toedscruel ex | play_pokemon_stamp | holo | 25d66424-5250-4d77-b9b3-d8e82bca20a4 | 5e8873f0-dce9-436f-9984-2ac5280324f8 |
| sv03 | 66 | Tyranitar ex | play_pokemon_stamp | holo | 3bfdd7db-f5d8-4275-85b8-bb64130860e6 | d2442062-f601-4c87-b4e6-23aa1e3dafa0 |

## Recommended Approval

```text
Approve real SV03-PLAY-POKEMON-EX-HOLO-CHILD-INSERT apply only. Fingerprint: b33838c9f31d9b693bf8be33940c814cfe31fb78335dd87b18ec67864b8a13db. Scope: 2 child-only card_printing inserts for sv03/Obsidian Flames Play Pokemon stamped parents Toedscruel ex #22 and Tyranitar ex #66, finish holo; parent writes=0, identity writes=0, deletes=0, merges=0. Dry-run proof: 7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35 == 7e67b633de699c6bde73b95abf7484aa801ac59c573d5bbee7739247dca95a35. No global apply. No migrations. No cleanup. No quarantine.
```
