# PKG-01A Final Snapshot Transaction Artifact Checkpoint V1

Date: 2026-06-09

## Scope

This checkpoint records the preparation-only approval for `PKG-01A / fut2020`.

Approved action:

- final fresh read-only snapshot
- guarded dry-run transaction artifact preparation

Not approved:

- DB write
- apply
- migration
- cleanup
- quarantine
- `PKG-01B`

## Result

Artifact status:

```text
pkg01a_final_snapshot_and_dry_run_artifact_prepared_apply_blocked_no_write
```

Prepared files:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_final_fresh_snapshot_transaction_artifact_v1.md`
- `docs/sql/english_master_index_pkg01a_fut2020_guarded_dry_run_transaction_v1.sql`

## Package

| Field | Value |
| --- | --- |
| pilot_package_id | `PKG-01A` |
| set_key | `fut2020` |
| set_name | `Pokémon Futsal 2020` |
| pilot_package_fingerprint_sha256 | `72fade7655349f73019df4449a269cb4c46bbca000d0f24203fdcbfa498ee1f8` |
| card_print_rows | `1` |
| child_printing_rows_verified | `1` |
| allowed_changed_fields | `set_code` |
| PKG-01B included | `false` |

## Fresh Snapshot

| Field | Value |
| --- | --- |
| db_reads_performed | `true` |
| db_writes_performed | `false` |
| snapshot_hash_sha256 | `1ef9660b69e6464625f93879986516fa5da4281f109c002ecba6837a2ee90c31` |
| card_prints_found | `1` |
| card_printings_found | `1` |
| vault_items_found | `0` |
| finish_keys | `holo` |

Target row:

```text
a676888d-19e0-4064-89aa-e67019af5b95
Pikachu on the Ball
before set_code: null
after set_code: fut2020
```

## Guarded Dry-Run Artifact

| Field | Value |
| --- | --- |
| artifact_ref | `docs/sql/english_master_index_pkg01a_fut2020_guarded_dry_run_transaction_v1.sql` |
| artifact_hash_sha256 | `fcca8c68b8bb730d45f8a6ba9eb623b05af78749e87d771e09e0d1b557ed3e3c` |
| transaction_artifact_executed | `false` |
| contains_commit_statement | `false` |
| contains_rollback_statement | `true` |
| write_ready_now | `0` |
| apply_allowed | `false` |
| stop_findings | `0` |

The artifact is rollback-only and has no `COMMIT;` statement.

## Rollback Proof

Rollback scope is one row only:

```sql
update public.card_prints
set set_code = null
where id = 'a676888d-19e0-4064-89aa-e67019af5b95'::uuid
  and set_code = 'fut2020';
```

Rollback must not touch `PKG-01B`, `card_printings`, vault ownership, provenance, pricing, scanner, or marketplace tables.

## Safety State

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
apply_paths_executed: false
transaction_artifact_executed: false
write_ready_now: 0
apply_allowed: false
```

## Required Gates Before Any DB Write

- Review the fresh snapshot hash and target row contents.
- Review the guarded dry-run transaction SQL artifact.
- Review rollback proof and ensure it scopes only `PKG-01A`.
- Run the transaction artifact only as a dry-run in a separate approved step.
- Verify the dry-run returns expected row counts and rolls back.
- Request separate explicit DB write/apply approval after the dry-run gate passes.
