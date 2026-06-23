# Base Set Print Run Lanes Real Apply Gate V1

Generated: 2026-06-23T01:09:44.141Z

Package: BASE-SET-PRINT-RUN-LANES-REAL-APPLY-GATE-V1

Contract: BASE_SET_PRINT_RUN_LANES_V1

## Gate Status

- approval_gate_only: true
- apply_executed: false
- durable_db_writes_performed: false
- apply_allowed_by_gate: true
- stop_findings: 0

## Required Approval

`Approve real BASE-SET-PRINT-RUN-LANES-V1 apply only. Fingerprint: 0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee. SQL hash: db97aa1cfafa79d820d756115c6a6f67e1beabe862da05c5fe82e321d6687304. Scope: 3 derived Base Set collector lane set inserts and 304 card_print lane identity inserts for Shadowless, 1st Edition, and 1999-2000. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No child writes. No identity-table writes. No external mapping writes. No price writes. No deletes. No merges. No migrations. No exact image claims. No global apply.`

## Scope

- derived set inserts: 3
- card_print lane identity inserts: 304
- Shadowless covered slots after plan: 102
- 1st Edition covered slots after plan: 102
- 1999-2000 covered slots after plan: 102
- generic Pikachu #58 Shadowless/1st Edition rows: blocked
- Ghost Stamp ordinary lane coverage: blocked
- exact image claims: blocked

## Artifacts

- rollback dry-run SQL: `docs/sql/base_set_print_run_lanes_guarded_dry_run_v1.sql`
- real apply SQL: `docs/sql/base_set_print_run_lanes_real_apply_v1.sql`
- dry-run SQL hash: `db97aa1cfafa79d820d756115c6a6f67e1beabe862da05c5fe82e321d6687304`
- real apply SQL hash: `0257a2ec83af160bc9607e9f2701fa4ebe874e8574c41ad993a5edf83bde5c8c`
