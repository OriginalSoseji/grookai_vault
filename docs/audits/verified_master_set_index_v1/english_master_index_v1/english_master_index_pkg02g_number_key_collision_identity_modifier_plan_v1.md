# English Master Index PKG-02G Number-Key Collision Identity Modifier Plan V1

This is an audit-only plan and rollback-only dry-run artifact for the 58 number-key collision rows excluded from PKG-02F.

No SQL was executed. No DB writes, migrations, cleanup, quarantine, merge, or delete operation was performed.

## Status

| Field | Value |
| --- | --- |
| plan_status | pkg02g_number_key_collision_identity_modifier_plan_prepared_apply_blocked_no_write |
| package_id | PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER |
| package_fingerprint_sha256 | `6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4` |
| number_key_collision_rows | 58 |
| parent_update_rows | 97 |
| blocked_target_parent_recovery_rows | 58 |
| existing_collision_holder_modifier_rows | 39 |
| simulated_final_unique_collision_count | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Collision Kinds

| Kind | Rows |
| --- | ---: |
| prefixed_number_collision | 28 |
| lvx_name_modifier_collision | 26 |
| technical_machine_name_collision | 1 |
| trainer_parenthetical_name_collision | 3 |

## Set Summary

| Set | Rows | Prefix | LV.X | Technical Machine | Trainer Parenthetical | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| col1 | 2 | 2 | 0 | 0 | 0 | 0 |
| dp7 | 8 | 3 | 5 | 0 | 0 | 0 |
| pl1 | 9 | 3 | 6 | 0 | 0 | 0 |
| pl2 | 15 | 6 | 8 | 1 | 0 | 0 |
| pl3 | 9 | 2 | 7 | 0 | 0 | 0 |
| pl4 | 12 | 12 | 0 | 0 | 0 | 0 |
| swsh2 | 1 | 0 | 0 | 0 | 1 | 0 |
| swsh4.5 | 2 | 0 | 0 | 0 | 2 | 0 |

## Required Approval Phrase For Dry Run

```text
Approve PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER for guarded dry-run transaction execution only. Fingerprint: 6b99a72e94808480edb20c649c62d31364d40ca794bf9c175c630f4b48d678d4. Scope: 58 number-key collision rows, 97 parent identity updates, no deletes, rollback-only. No real apply. No migrations.
```

## Safety

- No SQL was executed.
- No DB writes were performed.
- No migrations were created.
- No deletes are present in the SQL artifact.
- PKG-02G uses printed_identity_modifier to disambiguate real distinct cards.
- The simulated final standard-set unique identity check has zero collision groups.

## Stop Findings

- none
