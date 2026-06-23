# Base Set Print Run Lanes Guarded Dry-Run V1

Generated: 2026-06-23T01:09:37.257Z

Package: BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1

Contract: BASE_SET_PRINT_RUN_LANES_V1

## Safety

- durable_db_writes_performed: false
- migrations_created: false
- rollback_snapshot_matches: true
- write_ready_now: true
- stop_findings: 0

## Required Real Apply Approval

`Approve real BASE-SET-PRINT-RUN-LANES-V1 apply only. Fingerprint: 0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee. SQL hash: db97aa1cfafa79d820d756115c6a6f67e1beabe862da05c5fe82e321d6687304. Scope: 3 derived Base Set collector lane set inserts and 304 card_print lane identity inserts for Shadowless, 1st Edition, and 1999-2000. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No child writes. No identity-table writes. No external mapping writes. No price writes. No deletes. No merges. No migrations. No exact image claims. No global apply.`

## Planned Inserts

- derived set rows: 3
- card_print rows: 304
- generic Shadowless Pikachu row: blocked
- generic 1st Edition Pikachu row: blocked
- Ghost Stamp ordinary lane coverage: blocked
- image status for new rows: missing

## Rollback Proof

- execution_status: guarded_dry_run_transaction_completed_and_rolled_back
- before_hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- after_hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- proof_inserted_set_rows: 3
- proof_inserted_card_print_rows: 304
- proof_forbidden_rows: 0

| Lane | Inserted Slots | Existing Special Pikachu Slot | Covered After Plan |
| --- | --- | --- | --- |
| base1-1999-2000 | 102 | 0 | 102 |
| base1-first-edition | 101 | 1 | 102 |
| base1-shadowless | 101 | 1 | 102 |

## SQL Artifact

`docs/sql/base_set_print_run_lanes_guarded_dry_run_v1.sql`
