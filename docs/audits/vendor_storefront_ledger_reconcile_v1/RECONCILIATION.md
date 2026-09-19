# Applied One Piece migration reconciliation

The September 19 billing preflight found production ledger version
`20260919054500` absent from the storefront source. Main remained `a151794a9`.
Schema work stopped before authoring a billing migration. A new clean recovery
worktree was created from storefront commit `4939f55e3`; existing worktrees and
catalog repair evidence were inspected read-only.

The missing file is the One Piece repair's already-applied Foil game-scope
migration. Its exact source SHA256 is
`147d694a57228a18e644377ccf71a07feeb565117f0b180da8fed56197a23e83`.
A repeatable-read, read-only query confirmed that its sole ledger statement
matches the recovered source, allowing only CRLF/LF normalization, and that the
current Foil registry scope is MTG plus One Piece. The source itself is retained
without modification. No catalog writer, repair plan, partial application change
or data executor from the dirty repair worktree was imported or run.

This was a missing applied source migration, not an unrepresented Studio DDL edit.
A generated schema pull would not reconstruct its data-only registry change;
recovering the exact applied SQL preserves the existing ledger without a new
remote reconciliation mutation. Repository integration/commit is still required.

## Fresh isolated evidence

A separate `grookai-vendor-billing-20260919` project uses loopback 172xx ports,
an internal database network, a fixed-destination relay and zero background
workers. The original 164xx and 168xx projects remain intact. The new project
first replayed the previous 394 baseline, then performed a guarded full reset
with the recovered migration to produce the current 395-row production baseline.
It contains no users, card inventory or cron executions.

The strict read-only baseline audit passed against current production: all 395
ledger rows agree, the complete public schema has zero remaining SQL differences
after the existing exact three-table column-order comparison, and all 893
supplementary security objects agree. Production sanity counts remain 170,658
cards, 3,399 sets and 32,903 traits. This audit wrote no application data or schema.
The CLI initializes its own login role for authenticated reads.

The first preflight failure and the original local baseline are retained privately.
A local guard initially rejected a Windows path-separator comparison before any
reset; that comparison was corrected without changing the pinned target. Four
negative tests prove the new baseline-audit option rejects apply/prepush, arbitrary
migrations and combined exceptions before CLI access. Their first assertion run
failed on PowerShell error wrapping; the boundary rejected correctly throughout.

`replay_storefront_reconciled_v1.mjs` passed the bounded 396-file reset,
including the pending storefront migration. All 9,494 public schema/security
objects match the original storefront release; the intended One Piece registry
scope is present, every rollout flag is false and no application fixtures remain.
This database can now support the complete application hook. Production PrePush/application
remain separate: the old 394-row baseline is historical evidence, and the
unapplied storefront ID now precedes the production ledger head. A release plan
must explicitly verify the exact older pending migration and its ordering.

The schema reconciliation does not change native/web application source. Signed
archive 326 remains bound to `4939f55e3`, including the proven cold-launch fix.
No storefront grant, publication, worker, deployment, upload or payment occurred.
