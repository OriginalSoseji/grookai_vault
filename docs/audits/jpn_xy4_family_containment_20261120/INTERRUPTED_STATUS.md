# Interrupted XY4 containment status

Chunks 0, 1 and 2 each passed same-writer rollback, apply and independent readback, containing 30 approvals. Durable receipts are `177115`, `177119` and `177145`. A later read-only comparison confirmed those 30 queue rows are superseded and disabled, all 32 remaining target rows retain their original state, and no raw-import rows exist for chunk 3. No XY4 containment writer session remained active at that readback.

The process was interrupted during the chunk 3 rollback rehearsal because disk free space fell to a critical level. Its `admin.import_runs` row `199c0d77-42ff-459d-95d2-819ddd5ff27c` still reports `running`; it was not altered. The interrupted rehearsal must be reconciled using the audit/ledger contract and a fresh preimage and source check before resuming. Do not infer a successful rollback proof from the interrupted run. The worktree has uncommitted containment code and evidence; no production code was deployed from it.

`executed-writer.json.gz` retains the exact five execution files and its fingerprint matches the successful rollback proofs for chunks 0–2. Any source or registration change requires a fresh same-writer rollback proof. Resolve disk capacity before running further proof, apply, build, or Git gates. The 62 underlying primary-species conflicts and XY4 coordinate/source-evidence repair are not resolved by this containment.

## Resumption

Disk space was recovered through unrelated application caches and generated debug builds. A fresh read-only preimage check confirmed the 30/32 split, no chunk-3 raw rows and no active writer session. The interrupted `admin.import_runs` row was then reconciled from `running` to `error` using an exact-preimage guarded transaction, rollback rehearsal and separate readback; see `interrupted-ledger-preimage.json`, the ledger rollback proof and `ledger-reconciliation-verify.json`.

Chunks 3–6 subsequently passed fresh same-writer rollback rehearsals, guarded apply and separate chunk readbacks. Their durable receipts are `177156`, `177160`, `177164` and `177168`. A connection timeout on the first chunk-3 independent readback was followed by a successful read-only retry; no apply was repeated. All 62 approvals are now contained, while the underlying identity, source evidence, species and coordinate discrepancies remain.

The subsequent independent all-62 readback passed. `independent-readback.json` records all seven receipt IDs and the scope of the verification.
