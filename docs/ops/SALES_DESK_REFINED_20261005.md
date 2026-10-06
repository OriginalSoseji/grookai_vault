# Refined Sales Desk checkpoint

Worktree: `C:/gv_sales_desk_refined_20261005`
Branch: `feature/sales-desk-refined-20261005`
Recorded main: `b5444e82f726359d149b7cf78d18655e0aec31b3`
Integrated receipt source: `103c1838f05a30d242acb4559e37ea8fd6791e79`

The founder authorized the refined desktop/iPad workflow without repeated
implementation approvals. Preserve the original receipt checkout, its draft
PR598 and signed but unuploaded iOS345 archive. TestFlight344 remains the last
verified release. Twilio identity/sender setup was explicitly deferred.

Read [the contract](../contracts/SALES_DESK_REFINED_V1.md). Source adds the desktop
Sales Desk, held carts on browser/native, customer displays, web hourly reporting,
progressive native startup and paged trade search. It reuses current authenticated
catalog/sale writers. No new migration or production mutation belongs to this
refinement. The integrated receipt migration remains a separate unreleased gate.

Authoritative evolving receipts:
`C:/grookai_vault_operator_artifacts/sales_desk_refined_20261005/CHECKPOINT.json`.
The read-only preflight in `PREFLIGHT.json` records production428, 171053 cards,
3401 sets, 32903 traits and 979 Vault rows. These are baseline reads, not writes.

Local runtime proof uses the retained receipt full429 lab, API32701/database32700,
and a task-owned Next listener32740. It never resets the lab or uses repair data.
The stopped loopback relay was restarted after verifying its exact container,
network and bindings; no shared database service was restarted. Synthetic IDs are
recorded for every attempt. Cleanup uses the existing fixture-only transaction
pattern for append-only card-event fixtures and restores original rollout flags.
Do not apply that cleanup pattern to production or unrelated evidence.

Failed attempts and their recovered cleanup are retained. Browser traffic is
restricted to loopback, telemetry is off and provider messages are zero. Native
widget tests cover both phone and tablet layouts; they are not a TestFlight proof.

The new operations ledger, split tender, returns, cross-device held carts and
collector/vendor matching remain future batches. No follower-membership charging
or automated outreach is authorized by a CRM draft. Keep sender setup checkpointed.

Before release, reconcile current main/open work again, run normal hooks, retain
the receipt migration gate, and verify a new website/native build. Do not upload
the old345 archive as if it contained these changes. Rollback retains all data.
