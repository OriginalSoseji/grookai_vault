# Master Mapping Authority Continuation

September 17, 2026. Local candidate; no production DB/Storage mutations.

Read `docs/contracts/MASTER_INDEX_MAPPING_AUTHORITY_V1.md`.
Branch: `fix/master-mapping-authority-20260917`.
Worktree: `C:/grookai_vault_mapping_identity_20260917`.
Recovery stash `f1fb6838f1583deab398967094c52cfa15065495` is preserved after apply.
Do not reapply it over the restored files or delete other worktrees.

PR483 merged normally as `704b6eb1f558cb7b45b4544f5b2551a36574ac43` at
11:48:04 UTC. Its head `040ac49770439a8866a8436822c9354629b0c2d9` passed code
checks and normal hooks. Review4036182075 is addressed/resolved. The exact-head
Vercel build failed its explicit collector production activation guard; direct
API logs are preserved in mapping_identity_guard_20260917/vercel-readback-v3.json.
No deployment activation or branch deletion occurred.

The restored candidate makes Master Index mapping evidence mandatory before DB
connection, within transactional preflight and before commit, with metadata binding.
Additional tests now reject raw printed-number drift, duplicate parents/products,
and silently discarded source bytes. Real child-process dry-run tests use a local
TCP listener and prove zero connection attempts for missing packages, altered file
hashes and unreviewed assertions. The packaging command preserves reviewed bytes,
refuses overwrite and cannot manufacture a review. Initial negative CLI fixtures
failed at the unrelated default 25-row selector; setting their explicit synthetic
limit to one reached and verified the intended authority gate. No production calls.

## Next Required Work

1. Finish the real local apply/readback path after freezing the candidate commit.
   The valid real CLI dry-run is now proved on a fresh synthetic PostgreSQL schema.
2. Verify remote TLS only through read-only checks before deployment; the unsafe
   helper is replaced with exact-target/verified TLS and tested URL guards.
3. Lost COMMIT response now reports unknown outcome, skips misleading rollback,
   saves precommit evidence and forbids automatic retry. A real PostgreSQL commit
   plus independent readback proves the helper behavior, not a full CLI fault test.
4. Run full hooks, review and release this candidate. It is not committed yet.
5. Audit actual callers of the remaining JustTCG legacy writer and deployed jobs.
   Old scripts in preserved releases are not proof they are invoked; do not replace
   the entire MEE runtime from main, whose pricing policy differs intentionally.
6. Continue historical Master Index adjudication, dependency inventory, bounded
   repairs and collector/Vault parity. This code is not database-wide completion.

The McDonald's frozen apply still requires its separate exact authority. Do not
re-hash historical plans, infer finishes, rename GV-IDs, or touch ownership to
make a discrepancy disappear. Broader goal remains active.

Current verification: 39 authority/package/CLI contracts, 12 connection/transaction
guard contracts and 18 existing exact mapping contracts pass (69 total).
Local rehearsal: artifacts/master_mapping_local/20260917_65e4188b/result.json.
Database grookai_mapping_authority_20260917_65e4188b is preserved on localhost:54330.
Valid dry-run, normalized-equivalent raw drift rejection, restored dry-run, zero
mapping writes, and lost server COMMIT response with independent readback pass.
Synthetic schema only; no production mutation or full apply proof is claimed.
An unrelated Docker listing command hung; only its exact verified child PID48012
was stopped. Existing containers and unrelated Docker commands were untouched.
