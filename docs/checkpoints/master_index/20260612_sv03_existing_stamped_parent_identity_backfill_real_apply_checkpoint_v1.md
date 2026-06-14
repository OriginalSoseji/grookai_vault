# SV03 Existing Stamped Parent Identity Backfill Real Apply V1

Real apply for existing SV03 stamped parent identity backfill.

| Field | Value |
| --- | --- |
| apply_status | sv03_existing_stamped_parent_identity_backfill_real_apply_committed |
| package_id | SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL |
| package_fingerprint_sha256 | `0481ed86bac219a6b2f8c150610c8bce59d8f4352b950874119f911148c7ab8f` |
| committed | true |
| parent_rows_updated | 3 |
| identity_rows_inserted | 3 |
| child_rows_inserted | 0 |
| delete_rows | 0 |
| merge_rows | 0 |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| stop_findings | 0 |

| set | number | card | variant | modifier | child_finishes | active_identities | parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sv03 | 022 | Toedscruel ex | play_pokemon_stamp | play_pokemon_stamp | 0 | 1 | 25d66424-5250-4d77-b9b3-d8e82bca20a4 |
| sv03 | 066 | Tyranitar ex | play_pokemon_stamp | play_pokemon_stamp | 0 | 1 | 3bfdd7db-f5d8-4275-85b8-bb64130860e6 |
| sv03 | 196 | Town Store | play_pokemon_stamp | play_pokemon_stamp | 0 | 1 | 18fbf76a-a9c5-4247-9ea5-0d8d2207ad65 |

## Safety Boundary

- Only existing SV03 stamped parent identity metadata was backfilled.
- No child printings were inserted.
- No deletes, merges, unsupported cleanup, quarantine, migrations, or global apply were performed.
- Product-family-only rows still require separate finish adjudication before child printing insertion.
