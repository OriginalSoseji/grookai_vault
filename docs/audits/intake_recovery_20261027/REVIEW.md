# Intake baseline reconciliation review

The local recovery proof passes. Production reviewed intake remains unavailable;
this is a source-only reconciliation candidate, not an intake release.

## Source

- Base: current main `30b3c99a893c61e173204a5568f6d46a4969dfcb`.
- Restored original migration: `20261023120000_lot_label_sales_v1.sql`, recovered
  from commit `b1f4cd289bb3aedf06097c8a4b90fe63f2127ea8`, SHA256
  `03aa6bf13897a0d0d1fe20df33ef0d894821d0a617e91aeb99521be4fe112578`.
- New forward-only candidate:
  `20261027230000_app_intake_baseline_reconciliation_v1.sql`, SHA256
  `c330b8cbc5f3b21590607862f7121be4a455422a644206ccc5ca23c442c17af2`.

The candidate preserves the existing live slab-evidence index and ten exact
live function definitions, including their raw CRLF body bytes. It guards
known definitions, owners and ACLs before replacing anything, and rejects an
unexpected same-named index. It changes no business semantics, customer data,
identity data, permissions, policies or RLS. A specific Git attribute preserves
its required bytes. All previously applied SQL remains byte-for-byte unchanged.

## Evidence

| Check | Result | Receipt |
| --- | --- | --- |
| Original source/object shape | Match; CRLF normalized for classification only | `missing-migration-parity.json` |
| Genuine fresh CLI reset, then declared prerequisite and unchanged history | Pass, 476 versions | `historical-replay-v5.json` |
| Apply/rollback, repeat, bad function and bad index rejection | Four pass | `baseline-reconciliation-tests.json` |
| Fresh candidate apply and no-op push | Pass, 477 local versions; retained digests equal | `fresh-reconciliation-proof.json` |
| Entire public schema and governed security | Zero remaining SQL; 1,331 equal security objects | `fresh-final-full-schema-parity.json` |
| Exact rendered v5 relay, network disabled | Four pass | `relay-v5-tests.txt` |
| Full current-main contract suite | 8,386 pass, 11 skip, zero fail | `current-main-contract-tests-summary.json` |
| New bounded qualification and rejection tests | AuditLinkedSchema pass; five gate tests pass | `strict-audit-receipt.json` |

The full comparison uses pinned pgkit 0.6.1 without normalizing function text.
Only the existing approved column-order handling for `card_prints`,
`pricing_jobs` and `sets` applies; column definitions must still match. The raw
generated difference is never executed. Security comparison includes owners,
grants, RLS, forced RLS and function configuration.

Canonical production was read through the official CLI in an explicit
repeatable-read read-only transaction. It still has 476 migrations. This work
made zero production writes. Local proof uses synthetic catalog prerequisites,
zero Auth users and zero Vault copies on an internal Docker network. Failed
attempts and all consumed/populated labs remain preserved.

## Release limits and next dependency

The ordinary linked shadow/pull route still fails because the immutable October
12 migration requires 647 existing catalog pairs. The explicit migration-contract
amendment now provides `-AppIntakeReconciliationV1` for this exact reconciliation
only. Its AuditLinkedSchema invocation passes after fresh production/local reads,
source/proof hash checks, retained-data checks and four repeated rollback tests.
It requires the genuine successful CLI reset and complete source replay. The
default gate and all other scopes remain unchanged. Five tests prove malformed
invocations and changed/extra SQL are rejected before connections. No hook was
bypassed. This scope cannot qualify any future intake feature migration.

This recovery source is not yet committed, merged or applied in production.
The next gates are normal hooks, clean committed PrePush, exact CLI dry-run,
atomic reconciliation apply and independent readback. The recovery playbook's
exit condition is not yet met. The pending intake feature migration must follow that
recovery and needs its own confirmed-state, idempotency, failure persistence,
ownership and recovery qualification. Build 502 remains installed and unchanged.
