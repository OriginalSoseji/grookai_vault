# Repository Reconciliation Decision Ledger

This ledger records source-to-destination decisions made after the immutable
preservation package was proven restorable. It is not branch deletion authority.

## Decision Rules

- Preserve current production behavior when it supersedes stale source behavior.
- Migrate capabilities, not branch histories.
- Do not merge a stale branch wholesale.
- Keep migrations unapplied until their domain review and mutation gate pass.
- Record every accepted, superseded, deferred, or rejected source with evidence.

## Wave 1: Lot Sharing And Pricing

| Field | Value |
| --- | --- |
| Source | `fix/lot-sharing-pricing-main-v1` |
| Source SHA | `91e4c043f076a71721cd95c27715c3737eba78ed` |
| Original commits | `c1eb2e93a`, `91e4c043f` |
| Disposition | `superseded_by_main` |
| Destination authority | `3b2f86462a0ff593f76b95b76a883ca12808ce08` (PR #230) |
| Application changes migrated | None |
| Reason | PR #230 squash-merged both lot commits and added a newer printing-identity correction. Original commit SHAs are not ancestors of main, which caused the initial ancestry-only ledger to classify the branch as divergent. Behavioral and path comparison proved the source capability is already present. |
| Safety proof | A trial replay produced only stale deltas and was neutralized with a forward revert on the non-production candidate. No production branch or deployment was changed. |
| Verification | Four authoritative Flutter test files, 30 tests passed. |

The source branch and its recovery refs remain preserved. This decision does not
authorize deleting the source branch or worktree.

## Wave 2: MTG Catalog Supervisor Batch Bound

| Field | Value |
| --- | --- |
| Source | `C:\grookai_vault_mtg_supervisor_batch_size` |
| Source SHA | `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4` plus two dirty tracked paths |
| Disposition | `migrated` |
| Destination | `integration/reconciled-main-v1` |
| Migrated paths | `.github/workflows/mtg-catalog-supervisor.yml`; `tests/contracts/mtg_catalog_supervisor_v1.test.mjs` |
| Behavior | Bound a supervisor dispatch to 25 sets and document the six-hour GitHub runner constraint. |
| Excluded behavior | No catalog run, production write, workflow dispatch, or source worktree mutation. |

The source dirty state remains byte-preserved in the recovery package and unchanged
in its original worktree.
