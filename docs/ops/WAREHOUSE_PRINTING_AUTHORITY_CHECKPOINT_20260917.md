# Warehouse Printing Authority Checkpoint

Date: 2026-09-17 UTC
Worktree: `C:/grookai_vault_warehouse_printing_authority_20260917`
Branch: `fix/warehouse-printing-authority-20260917`
Base: `1587eafa361e712b74640f212a747d602f56917b`

## Live Safeguard Verification

The same read-only run `35193527355` is now terminal. Do not redispatch it to
clear its result. Discovery and shadow reconciliation succeeded; the final
publication enforcement failed because the catalog still has unresolved gaps.

Offline verification checked all 22 listed artifact hashes, frozen source SHA,
selected/result identity parity, source/candidate counts, shadow authority and
no-write settings. Reconciliation mismatches: zero. The unavailable Japan product
source is recorded as HTTP 403/access denied; only the three available source
lanes supplied set candidates. GitHub issues #478, #475 and #382 reference this
run; the old shadow failure #459 is closed. The source-denial fix is proven live,
not a claim that catalog publication passed.

- 2,389 audited sets: 1,382 Pokemon, 61 One Piece, 946 MTG.
- 1,371 sets have printing diagnostics, including 956 empty Pokemon scopes with
  no printing coverage checked. These are not 1,371 proven corrupt sets.
- 54 Pokemon Master Index update candidates remain evidence-only.
- One MTG shadow candidate remains unauthorized for execution.
- Media-reader diagnostics do not prove every displayed cover image is absent.

Exact receipts and the verifier are preserved under
`C:/grookai_vault_operator_artifacts/catalog_source_access_release_20260917/`
in `deployed-verification/verified-terminal/` and `verify-deployed-run.mjs`.

## Local Implementation

The new `printing_authority_v1.mjs` freezes source bytes plus an exact reviewed
manifest and target into a JSON-safe package. It verifies full supplied parent
identity, scope, candidate, finish and printing GV-ID. It cannot authorize writes.

Staging and execution now consume the evidence package. The stage freezes its
preflight fingerprint; execution requires exact parity. The old unchecked SQL
insert and UUID-only no-op paths are removed. The new transaction inserts raw
evidence, child and verified review, preserving existing rows and five scoped
dependency digests. Pre-commit/post-commit checks include public options. A
SUCCEEDED stage still requires exact readback. Unknown commit/rollback stops the
batch for reconciliation. API writes require explicit boolean `apply: true`.

An isolated clone of the prior local rehearsal database proves full three-table
rollback, rollback after forced review insertion failure, rollback after failed
public-option proof, commit/independent readback and zero-write repeat. No original
database was reset or deleted. Final source-hashed readback also passes. Receipts:
`C:/grookai_vault_operator_artifacts/warehouse_printing_authority_20260917/`.
The first fixture setup failed on generated `number_plain` and rolled back;
the corrected fixture leaves that generated field to PostgreSQL. Preserve the
successful isolated database and do not rerun fixture setup over it.

The first broad contract run exposed a missing React dependency in this new
worktree, not an application assertion failure. Pinned root/web dependencies are
now installed. Full-suite v2 failure is preserved in `contracts-v2.tap`/`.json`;
v3 passed: 3,692 passed, zero failed, three skipped (3,695 total). It includes
61 new warehouse tests. No production worker ran, no production data
changed, and this work has not been committed or pushed.

## Lifecycle Follow-up

Local receipts `lifecycle-v1.json` through `lifecycle-v6.json` preserve the complete
progression, including failures. V1 reproduced the staging `payload_snapshot`
ReferenceError. Regression tests also cover the proof's prematurely captured
null stage ID. Both defects are repaired. V2 correctly blocked a fixture lacking
the explicit founder approval event; no catalog rows changed in that attempt.

- V3: retained verified printing, stage/claim/events, exact no-op and repeat.
- V4: new printing with two competing executors; one applied, one claim only,
  one child/raw/review, exact readback and zero-write repeat.
- V5: execution COMMIT completed but its response was deliberately lost;
  reconciliation-required, independent committed-state proof, no blind retry.
- V6: the same lost-response test at staging, followed by independent readback
  and complete execution of the single retained stage.
- `sidepath-v1.json`: alias mapping/archive plus all six image update paths in
  serializable transactions, each rolled back with full table digest equality.

Claim/rollback uncertainty and failure-ledger unavailability also have regression
tests. Failed advisory-lock cleanup discards the pooled connection. Both CLIs
signal blocked/failed/reconciliation states through nonzero exit codes.
The pre-final-edit contract run v4 passed 3,698 tests, zero failures, three skipped.
Final-source contract run v5 passed 3,708 tests, zero failures, three skipped
(3,711 total), including 77 warehouse authority/admission/lifecycle tests.
Normal shipcheck/hooks and production read-only checks remain required.

The first normal commit hook passed contracts/web/analyze, then failed while
Flutter loaded `vault_quick_action_sheet_test.dart` with a loopback HTTP connection
closure (725 other tests passed). No test was bypassed or app source changed.
The unchanged targeted test file then passed. Preserve `commit.log`/`commit.json`
and `flutter-targeted-v2.log`/`.json`; the normal hook must pass before release.

Read-only verified-TLS production queue inspection at 08:26:41Z found no child
printing stages or approved/staged child candidates. History contains 262 failed
and 757 succeeded parent stages and two succeeded image stages; one parent
candidate remains staged. None was changed or retried. Receipt:
`production-queue-v1.json`. Final source-hashed read-only local replay verified
all four succeeded synthetic stages in `final-readback-v1.json`.

This remains an unreleased candidate. Complete normal shipcheck and review,
production queue compatibility inspection and release verification. See
`docs/contracts/WAREHOUSE_PRINTING_AUTHORITY_V1.md`.
Historical Prize Pack batch scripts invoke these workers; preserve their frozen
evidence rather than treating historical approval as new printing authority.
Their inspected CLI wrappers check worker results; parent/stamp creation is not
rewritten by this child-printing change. Legacy child stages lacking the new
authority package fail closed and must not be silently grandfathered.

The McDonald's executor and frozen production plan remain separate and unchanged.
Its exact production authorization is still pending; no approval is inferred here.
