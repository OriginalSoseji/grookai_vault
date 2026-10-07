# Known-cost reporting — October 7

Worktree `C:/gv_product_profit_20261007`, branch
`feature/product-profit-20261007`, based on backend `3f3a30e88`.
The cost editor and release gates are separate worktrees. Do not edit either
while its normal hook runs. Read [the report contract](../contracts/VENDOR_PROFIT_REPORT_V1.md).

The candidate adds exact report arithmetic, a private snapshot API and a panel
inside existing Reports. Server `GV_VENDOR_PROFIT_V1=1` reveals the panel and
enables the GET-only API. Reads use the signed-in owner's existing RPC, bounded
to 100 IDs; partial batch failure makes all cost metrics unavailable. Reports
bind receipt-book requests and responses to the same owner, and discard late
responses after an account change. Date/customer/method filters select the same
receipt rows for sales and cost coverage. No schema changes, cost backfills, historic receipt edits,
production reads/writes, deployment or activation belong to this slice.
UI/API work must reuse the existing owner receipt book and snapshot RPC.
Preserve all retained labs and synthetic fixture receipts.

Private evidence:
`C:/grookai_vault_operator_artifacts/product_profit_20261007/CHECKPOINT.json`.
Run the core proof with `node --test tests/contracts/sales_profit_v1.test.mjs`.
The current core has 27 passing cases. Browser fixture configuration is
`apps/web/playwright.profit.config.ts`; 17 profit/workspace scenarios pass, with
phone/desktop screenshots and no serious/critical Reports-region accessibility
violations. The first failed test was an alert locator also matching Next's
route announcer; its evidence is retained. Types and focused lint pass.
Real authenticated database-to-screen proof passes in
`runtime-1791413364310/receipt.json`: old v1 manual sales and v3 stock/trade/split
payments reconcile to $8 profit on one of four lines, with $20 uncovered sales.
Later inventory cost edits leave the sale snapshot unchanged. Phone/desktop
readback, owner checks, API failure/recovery and flag-off behavior pass; browsing
uses only GET and cleanup restores all 13 retained table hashes. Production
requests: zero. The earlier selector failure and its successful cleanup remain
recorded. The payment selector now has an explicit accessible name.

Visual inspection also caught light Reports headings over the light page surface.
The Reports shell now supplies its own dark background, including loading and
closed-account states. The final 17-case browser run includes the entire Reports
region in accessibility checks, rather than only the profit panel.

Complete normal hooks are tracked externally. Run
`node scripts/tests/run_product_profit_checks_v1.mjs commit` after staging reviewed
source. The helper uses the retained full431 lab read-only, verifies before/after
counts and runs the ordinary managed commit hook. Do not edit source or mutate
that lab while it runs. Integration and production release remain separate.
