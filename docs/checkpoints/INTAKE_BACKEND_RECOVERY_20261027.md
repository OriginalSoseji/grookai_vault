# Intake backend recovery — October 27, 2026

Continue the app-wide completion task. Build 502 remains installed; no new UI
polish is planned while reviewed saving is blocked. Preserve the dirty app tree,
original pending SQL and all existing populated local labs.

Authority: `docs/GROOKAI_RULEBOOK.md`, the active contract index, migration
maintenance/recovery workflow and production-readiness gate.

- [x] 1. Fresh canonical sanity, clean current-main recovery checkout and ledger.
- [x] 2a. Restore original missing source and prove its deployed object shape.
- [x] 2b. Prove full-source local replay and exact schema/security equivalence
  with a forward-only reconciliation candidate.
- [ ] 2c. Complete governed recovery: standard pull/strict release qualification,
  clean committed source and exact reconciliation release. Local equivalence
  alone does not satisfy these gates.
- [ ] 3. Qualify a forward-only intake release: explicit confirmed state,
  rerun safety, durable failure observability and ownership/idempotency checks.
- [ ] 4. Deploy only after required gates pass, then verify real reviewed saves
  and recovery through the integrated main app.

The user confirmed on this turn that the previously exposed Supabase CLI token
was replaced and the old token revoked. No token value was requested or logged.
New authenticated CLI checks and canonical target verification succeeded below.
Prior evidence was not reused as a fresh gate pass.

## Stage 1 completed — fresh main and authenticated readback

The user confirmed credential replacement/revocation. New CLI linking and ledger
reads succeeded. Canonical sanity at 22:52 UTC: card prints 172404, sets 3410,
traits 32903. Fresh `origin/main` is `30b3c99a893c61e173204a5568f6d46a4969dfcb`;
clean recovery checkout is `C:/gv_intake_recovery_20261027`. The current-main
inventory has 475 versions, canonical remote 476, no duplicate/local-only IDs,
and exactly one remote-only version: `20261023120000`. No remote writes occurred.

## Stage 2 checkpoint — missing historical source proven

A schema-only CLI dump succeeded after the previously slow read-only route.
No table data was exported. Kept the full schema capture outside the repository.
Compared the recovered committed `20261023120000_lot_label_sales_v1.sql` against
the actual deployed objects by restoring each definition into separate databases
in one new network-disabled proof container. Checked columns, defaults,
constraints, indexes, RLS, policies, grants, function arguments/defaults/bodies,
security-definer settings, owners and ACLs. Structure and security match; this
initial object comparison normalized line endings only for classification, and
must not be treated as byte-exact function-text qualification. The full raw
comparison below subsequently identified those line endings as real source drift.
Existing captured default privileges were applied equally; no privilege
difference was ignored.

Original bytes SHA256:
`03aa6bf13897a0d0d1fe20df33ef0d894821d0a617e91aeb99521be4fe112578`.
Proof: `docs/audits/intake_recovery_20261027/missing-migration-parity.json`.
Restored those exact original bytes into the clean recovery checkout only.
No applied SQL was rewritten, remote history repaired or label sale replayed
against production. Whole-schema linked equivalence and fresh replay are next;
this object-level proof alone is not a complete migration-gate pass.

## Stage 2 diagnostic replay and forward reconciliation

The ordinary strict gate reaches the immutable October 12 alias migration, then
fails because an empty shadow lacks its required 647 catalog pairs. No historical
identity guard was edited or disabled. A new internal-network lab replayed the
unchanged source through the preceding version, inserted a declared synthetic
1,294-parent / 647-pair prerequisite, then applied the remaining original files
through the real local CLI. All 476 original hashes and ledger versions match;
there are zero Auth users or Vault copies. A no-op local push also passes.

This remains diagnostic evidence, not a full gate pass: the earlier reset
command's database phase completed but its subsequent local API restart returned
HTTP502. The failed receipt remains failed. A separate DB-only experiment also
failed because disabling Storage omitted its prerequisite platform schema; that
lab and its evidence were preserved. No populated lab was reset.

Pinned full public-schema inspection found no owner/grant/RLS drift. The remaining
differences are an existing production slab-evidence index and raw CRLF line
endings in ten function bodies. They are not normalized away. A new forward-only
source candidate at `20261027230000_app_intake_baseline_reconciliation_v1.sql`
preserves the exact captured live function bytes and the existing index.
Existing function definitions/owners/ACLs and same-named index definitions are
guarded; unexpected drift aborts. A path-specific Git attribute preserves the
new file's required bytes without changing historical files.

Four local tests pass: apply/rollback, repeated apply/rollback, rejection of a
changed function, and rejection of a wrong same-named index. The real local CLI
applied the candidate as version 477 with security unchanged. Production still
has 476 versions and zero writes from this work. Whole-schema comparison after
this candidate is recorded separately; no intake feature migration has begun.

## Stage 2b completed — successful fresh CLI replay and full comparison

The final new lab is `intake-ready-replay-476-v5-20261027`, internal Docker
network `10.253.31.0/24`, with only its relay publishing on loopback 60480/60481/
60484. It has no production credentials, zero Auth users, zero Vault copies,
and background workers disabled. All historical source hashes are unchanged.

The genuine CLI reset completed successfully at the empty prefix. Earlier
reset failures remain failures. Their cause was Storage receiving a new local
address while the owned Kong gateway retained the old address. The bounded
monitor restarts only this lab's gateway after observing its Storage restart
and checking the lab is empty. The relay returns only real upstream responses;
it retries only the CLI's idempotent bucket readiness GET. Mutations and other
GETs are forwarded once. No health response is manufactured or skipped.

After that successful reset, the explicit synthetic prerequisite was inserted,
the original 476 migrations completed, and a no-op push passed. The exact new
candidate then applied as local version 477; a second no-op push passed. Full
row digests for synthetic cards, sets and aliases remained unchanged. This lab
is now populated with fixture data and must never be reset.

Fresh whole-public-schema comparison using pinned pgkit 0.6.1 reports zero
remaining SQL and equal security metadata for 1,331 objects. Function-body
line endings remain significant. The existing approved physical column-order
handling applies only to `card_prints`, `pricing_jobs` and `sets`; every column
definition is checked. This is not an unrestricted drift filter.

Verification:

- Four reconciliation SQL tests pass, including repeated application and
  fail-closed rejection of unexpected function/index definitions.
- Four isolated relay behavior tests pass. The exact rendered v5 relay is
  checked separately from the earlier v4 test receipt.
- Current-main full contract suite: 8,397 tests, 8,386 passed, 11 skipped,
  zero failures. The initial missing-dependency failures are retained, followed
  by the successful rerun after installing the checkout's web dependencies.

Receipts are in `docs/audits/intake_recovery_20261027/`; full schema snapshots
and local credentials remain outside the repository in
`C:/gv_intake_recovery_private_20261027/`. Source remains in the separate clean
current-main recovery worktree; no unrelated app changes were staged or reset.

## Remaining release boundary

The default `AuditLinkedSchema` and `db pull` route still starts an empty shadow
without the historical prerequisite. That failed receipt remains failed.
The explicit migration-contract amendment now adds a bounded
`-AppIntakeReconciliationV1` qualification for this exact source-only
reconciliation. Its first AuditLinkedSchema invocation passes after frozen
source/proof checks, fresh production/local full comparison, retained-data
checks and four repeated rollback tests. Five new rejection tests pass. This
does not waive genuine reset/replay proof, allow another feature migration,
authorize an apply, alter historical SQL or change the ordinary gate.

Next are normal hooks, clean committed PrePush, exact dry-run and reconciliation
release/readback. Recovery's committed-source exit condition is still pending;
this checkpoint does not mark recovery, intake or the app complete. Only after
recovery may the
new intake feature migration proceed. It still needs null-safe confirmed-state
validation, repeat safety, durable failure evidence and real-account saving/
recovery checks. The old pending intake SQL is preserved and is not deployable
as-is. Build 502 is unchanged; reviewed saving is still blocked in production.
