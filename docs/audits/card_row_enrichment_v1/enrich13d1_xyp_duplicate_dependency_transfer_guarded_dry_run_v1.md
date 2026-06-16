# ENRICH-13D1 XYP Duplicate Dependency Transfer Guarded Dry-Run V1

Generated: 2026-06-15T19:55:25.625Z

Package: `ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER-DRY-RUN`

This is a rollback-only dry-run proof for deterministic XY promo duplicate parent adjudication. It does not authorize a real apply.

## Status

| Field | Value |
| --- | --- |
| pass | true |
| dry_run_execution_status | enrich13d1_guarded_dry_run_passed_rolled_back_no_durable_change |
| package_fingerprint | 9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2 |
| sql_hash | 00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212 |
| target_rows | 56 |
| duplicate_child_printings | 168 |
| durable_after_matches_before | true |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | e2f812c297fbc9e949325ee55ef3df138855a933689b60e0c50dc4536ffe9d88 |
| After snapshot hash | e2f812c297fbc9e949325ee55ef3df138855a933689b60e0c50dc4536ffe9d88 |
| Before duplicate parents | 56 |
| Before duplicate child printings | 168 |
| Printing-level external refs | 0 |
| Printing-level vault refs | 0 |
| Printing-level warehouse refs | 0 |
| Execution error |  |

## Stop Findings

None.

## Real Apply Approval Text

A real apply is not authorized by this report. If this exact package is later approved, use:

```text
Approve real ENRICH-13D1-XYP-DUPLICATE-DEPENDENCY-TRANSFER apply only. Fingerprint: 9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2. SQL hash: 00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212. Scope: 56 XYP duplicate parent dependency transfers, 168 child printings deduped/transferred, 56 external mappings handled, 56 duplicate active identities removed. Dry-run proof: e2f812c297fbc9e949325ee55ef3df138855a933689b60e0c50dc4536ffe9d88 == e2f812c297fbc9e949325ee55ef3df138855a933689b60e0c50dc4536ffe9d88. No global apply. No migrations. No image writes.
```
