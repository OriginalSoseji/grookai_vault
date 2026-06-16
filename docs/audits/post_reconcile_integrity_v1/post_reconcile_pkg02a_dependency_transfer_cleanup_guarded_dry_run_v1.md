# POST-REC-02A Dependency Transfer Duplicate Parent Cleanup Guarded Dry Run V1

Rollback-only dry-run for dependency-bearing duplicate parent cleanup.

## Safety

- db_writes_performed: false
- durable_writes_performed: false
- migrations_created: false
- real_apply_performed: false

## Scope

- package_id: POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP
- target_groups: 142
- target_sets: me01, svp, swsh11
- excluded_append_only_groups: 2
- duplicate_child_rows_from_strategy: 223
- package_fingerprint: `7bf5f95205d26e8e0ba3e85604e3f431259b32e1a07b57eba8764cd6bdd69b8c`
- sql_hash: `0d3c04cfa1fbc59c39116ee2eb1aab9bbf124dd8086cdbad67484be1ada71b65`

## Dry Run

- execution_status: guarded_dry_run_transaction_failed
- error_message: canceling statement due to statement timeout
- rollback_proof_hash_match: true
- before_hash: `84bd08047980ea834e85cd7ff6b525c5d03e500a3855084552d2dbbc969434d5`
- after_rollback_hash: `84bd08047980ea834e85cd7ff6b525c5d03e500a3855084552d2dbbc969434d5`

## Approval Text

```text
Approve real POST-REC-02A-DEPENDENCY-TRANSFER-DUPLICATE-PARENT-CLEANUP apply only. Fingerprint: 7bf5f95205d26e8e0ba3e85604e3f431259b32e1a07b57eba8764cd6bdd69b8c. SQL hash: 0d3c04cfa1fbc59c39116ee2eb1aab9bbf124dd8086cdbad67484be1ada71b65. Scope: 142 dependency-transfer duplicate parent cleanups across me01, svp, swsh11; duplicate child rows handled=223; append-only feed groups excluded=2. Dry-run proof: 84bd08047980ea834e85cd7ff6b525c5d03e500a3855084552d2dbbc969434d5 == 84bd08047980ea834e85cd7ff6b525c5d03e500a3855084552d2dbbc969434d5. No global apply. No migrations. No image writes. No unsupported cleanup. No quarantine.
```
