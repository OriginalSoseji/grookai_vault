# English Master Index PKG-01 Split One-Set Pilot V1

This report splits PKG-01 into a one-set pilot package and a blocked remainder package.

It does not record approval, write to the DB, create SQL, create a migration, or create an apply runner.

## Status

| Field | Value |
| --- | --- |
| split_status | pkg01_split_into_one_set_pilot_apply_blocked_no_write |
| approval_recorded | false |
| write_ready_now | 0 |
| apply_allowed | false |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| stop_findings | 0 |

## Pilot Package

| Metric | Value |
| --- | --- |
| package_id | PKG-01A |
| package_fingerprint_sha256 | `72fade7655349f73019df4449a269cb4c46bbca000d0f24203fdcbfa498ee1f8` |
| set_key | fut2020 |
| set_name | Pokémon Futsal 2020 |
| status | ready_for_operator_decision_apply_blocked_no_write |
| card_print_rows | 1 |
| child_printing_rows_verified | 1 |
| vault_items_referencing_targets | 0 |
| changed_fields | set_code: 1 |

Selection reason: Lowest-blast-radius one-set pilot: one target row, one child printing, only set_code changes, zero vault references.

## Remainder Package

| Metric | Value |
| --- | --- |
| package_id | PKG-01B |
| package_fingerprint_sha256 | `e1d808a709eba3d4b6a94bcd9e2a463cfa354ec8b2c38703944331761644e016` |
| status | blocked_until_pkg01a_pilot_verified_no_write |
| card_print_rows | 105 |
| child_printing_rows_verified | 142 |
| affected_sets | 11 |

## Candidate Sets

| Set | Name | Rows | Child Printings | Changed Fields | Name Changes | Vault Items |
| --- | --- | ---: | ---: | --- | --- | ---: |
| fut2020 | Pokémon Futsal 2020 | 1 | 1 | set_code: 1 | false | 0 |
| swsh2 | Rebel Clash | 1 | 2 | number: 1, set_code: 1 | false | 0 |
| col1 | Call of Legends | 2 | 6 | number: 2, set_code: 2 | false | 0 |
| ex10 | Unseen Forces | 3 | 3 | name: 3, number: 3, set_code: 3 | true | 0 |
| dp7 | Stormfront | 8 | 10 | number: 8, set_code: 8 | false | 0 |
| pl1 | Platinum | 9 | 10 | number: 9, set_code: 9 | false | 0 |
| pl3 | Supreme Victors | 9 | 9 | number: 9, set_code: 9 | false | 0 |
| mep | MEP Black Star Promos | 10 | 10 | number: 10, set_code: 10 | false | 0 |
| ecard2 | Aquapolis | 13 | 26 | set_code: 13 | false | 0 |
| ecard3 | Skyridge | 15 | 19 | set_code: 15, number: 11 | false | 0 |
| pl2 | Rising Rivals | 17 | 24 | number: 17, set_code: 17, name: 2 | true | 0 |
| pl4 | Arceus | 18 | 23 | number: 18, set_code: 18, name: 6 | true | 0 |

## Next Step If Pilot Approved Later

- Record explicit approval for PKG-01A only, referencing the PKG-01A fingerprint.
- Capture a final fresh DB snapshot for the PKG-01A row only.
- Create a guarded dry-run-default transaction artifact for PKG-01A only.
- Run PKG-01A transaction artifact in dry-run.
- Apply only after separate explicit apply approval.
- Verify PKG-01A post-apply before considering PKG-01B remainder batches.

## Stop Findings

- none

## Non-Authorizations

- This split is not approval.
- This split is not SQL.
- This split is not a migration.
- This split does not create an apply runner.
- This split does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.
- PKG-01B remainder rows must not be included in the one-set pilot execution artifact.
