# Split payments implementation checkpoint

Worktree: `C:/gv_sales_split_payments_20261006`.
Branch: `feature/sales-split-payments-20261006`.
Source baseline: main `04980f98dc574cacbf42702e92711d7962e450c6`.
Contract: [Sales split payments](../contracts/SALES_SPLIT_PAYMENTS_V1.md).

This batch adds external split payments and cash change to desktop and native
Sales Desk, held deals, atomic sale completion, receipts and tender reporting.
Existing single-payment writers, catalog authority and collector access remain
unchanged. No actual money or provider messages were sent during implementation.

Evidence lives outside source at
`C:/grookai_vault_operator_artifacts/sales_split_payments_20261006`.
`CHECKPOINT.json` owns the latest check/release state. Production was audited
at 428 migrations, with zero normalized schema drift. The separate receipt
delivery migration is still pending; do not apply it merely to close the gap.

Local proof uses distinct internal Docker networks and loopback relays:

- `sales-pay-full-430-v2-20261006`, database 32840, API 32841;
- `sales-pay-upgrade-430-v2-20261006`, database 32860, API 32861;
- local web 32880, guarded `NEXT_PUBLIC_SALES_PAYMENTS_LOCAL_TEST` mode.

Full replay/reset/no-op push passed all 430 source migrations. Upgrade from429
retained two copies and a legacy receipt book, with zero normalized schema
drift against clean replay. These are local proofs, not remote apply receipts.
The initial longer project name was truncated by the CLI, causing a startup
timeout before proof; preserve `full-430-v1` and its consumed start intent.
The shorter v2 names corrected that setup issue.

Authenticated RPC proof covers all shared JS/Dart/SQL money vectors, private
tables/helpers, default-off authority, owner isolation, rollback on invalid
payment totals, idempotency, competition with legacy/manual sales, even trades,
customer payouts, immutable receipt books and recovery after disablement.
Browser proof uses synthetic owners, blocks external browser requests and
verifies desktop/phone layouts, held split reload and a deliberately lost
response after successful commit. Native widget proof verifies the same v3
payload survives an unconfirmed response. See external receipts for exact runs.

Release remains a separate governed action: reconcile the production428 package
with pending receipt429, prepare exact upgrade/parity proof and PrePush gate,
deploy compatible web/native readers, then enable split writes and read back.
Do not reuse old migration, upload or release intents. The currently released
website/TestFlight346 remain the prior refined Sales Desk until a new release
receipt explicitly supersedes them. Direct receipt sending remains deferred.
