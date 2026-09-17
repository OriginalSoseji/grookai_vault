# Master Printing Execution V1

Date: 2026-09-17
Status: Bounded executor implementation; production mutation not authorized by this file.

## Scope

The first execution scope is McDonald's 2021 English base release, set UUID
`05b97782-d4b8-49eb-8030-7f990cdd6776`. Reviewed truth is checked in under
`docs/catalog/master_printing_authority_v1/mcd21/`. Actual preserved source
bytes are required at runtime and must match their manifest bindings; the
checked-in facts are not permission to substitute different source evidence.

Exactly 25 parent identities, 25 retained Normal children and 25 supported Holo
children produce 50 options. Reverse Holo is not part of this release. No
regional/error or outside-base variants are implied.

The transaction admits one raw evidence record, inserts 25 Holo children,
recovers only absent provenance_source/provenance_ref on 25 existing rows,
and appends 50 verified truth reviews. Parent UUIDs, child UUIDs, images, mapped
products, ownership, prices and existing records are not replaced or deleted.

## Execution

`scripts/audits/master_index_printing_execution_v1.mjs` supports:

- `prepare`: fresh read-only production schema/state capture and frozen plan.
- `preflight`: read-only exact before-state, schema and dependency comparison.
- `rollback`: bounded full transaction, exact RPC assertion, rollback verification.
- `apply`: same transaction and assertions, with durable commit.
- `readback`: independent read-only exact-state verification.

Every mode checks the complete local producer file hashes and actual evidence
bytes before connecting. A new output directory and run_plan.json must exist
before connection. Target checks bind the canonical pooler hostname, project,
database and allowed ports. Pinned CA chain, hostname, validity and signatures
are verified before authenticating; verification is never disabled for the
credentialed connection. Environment sanity is required.

Read-only modes force the database session read-only. Write modes require an
explicit founder authority record binding exact plan/producer fingerprints,
counts, boundaries, modes and expiry, with the original approval record/text.
Never manufacture this record from a general program instruction or a source
adjudication. Its hash is recorded in the run plan. `apply` also requires a fresh
matching production rollback receipt; local simulation does not satisfy it.

Inside the transaction: serializable isolation, bounded statement/lock timeouts,
per-set advisory lock, parent/child row locks, full schema and RPC fingerprint,
full parent/retained-child comparison, global candidate UUID/GV-ID collision
checks, exact review/raw state, dependency digests, compare-and-swap updates,
and exact public options. Unreviewed triggers or rewrite rules block execution.

The raw row uses a deterministic negative bigint to avoid advancing a sequence
in rollback tests. Source evidence enters raw_imports before canonical changes.
An already-exact state executes zero mutations, including zero raw inserts.
Partial states and collisions fail closed, rather than completing a partial batch.
Every mode compares dependency footprints with the frozen plan, including exact-
state readback and zero-write replay. Equality within one transaction cannot
certify preservation across executions. Later legitimate collector activity can
therefore require investigation; never silently rebaseline to clear a mismatch.

COMMIT acknowledgement loss is recorded as uncertain. Stop and independently
read back; never retry blindly. A failed rollback is also explicitly uncertain.
No post-commit automatic deletion is permitted. A recovery that would alter
attached user data requires its own reviewed plan.

## Evidence And Limits

Full local rehearsal covers raw ingress, production-equivalent table schemas,
actual duplicate-key rollback, exact RPC, independent readback and repeat-run
safety. The local admin role is not proof of production/application permissions.
Five scoped dependency digests complement full retained-row and parent equality;
they are not a claim to enumerate every JSON/application-level reference.

Production completion additionally requires exact live readback and collector
search/detail/printing/Vault verification. This executor does not establish
catalog-wide authority, enable automatic arbitrary writes, or expand to another
set merely because its dimensions look similar.
