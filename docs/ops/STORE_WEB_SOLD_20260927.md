# Store inventory manual sale action — September 27

Baseline main2e59493297141b7828dc4399d2baa30333ff517b. Isolated worktree
C:/gv_store_sold_20260927, branch fix/store-inventory-mark-sold-20260927.
The website already records sales/trades on the exact-copy Vault page, but its
owner store inventory omitted the action. This exposes Mark sold directly on
each physical card entry, without leaving the workspace.

The dialog shows the copy identity, requires the actual USD amount received,
allows an optional buyer label and asks for explicit confirmation. It reuses
recordVaultDispositionAction and the existing authenticated disposition V2 RPC.
No mutation authority, schema, package or payment setting changes. The server
still verifies ownership, archives the exact copy and independently reads back
its private receipt. Marking sold neither charges a buyer nor transfers ownership.

Double submission is locked. After an uncertain response, details stay frozen
for identical retry/receipt recovery. A confirmed sale is removed locally before
inventory refresh; a refresh failure preserves success and offers manual refresh.
The modal supports keyboard dismissal and protects unfinished details. Manual
disposition remains available to the owner with retained inventory access, even
when store editing is unavailable. Managers receive no additional permission.
Custom-product stock sales and paid checkout are outside this exact-copy fix.

Local proof: run the existing disposition input tests plus
tests/contracts/store_inventory_sale_v1.test.mjs. The latter exercises owner
isolation, denied writes, confirmed actual price, lost-response recovery and
changed retries against the unchanged transaction service with synthetic clients.
For actual compiled UI proof, run
`node scripts/tests/store_inventory_sale_preview_v1.mjs`, then use loopback26446.
The fixture has synthetic copies and an intercepted server-action transport;
it performs no DB or provider calls. Its buttons simulate response loss and
inventory refresh failure. /proof contains the synthetic requests and receipts.
Do not use this fixture as proof of production inventory mutation.

Normal commit/push hooks, review, deployed source identity and read-only live
button/form checks remain the release gates. Do not record a real user's sale
merely for smoke testing. No shared service reset, schema apply or payment action.
Current release evidence/checkpoint is retained outside source under
C:/grookai_vault_operator_artifacts/storefront_production_20260926/STORE_WEB_SOLD_CHECKPOINT.md.

PR525 review: confirmed receipts release the modal submission lock before
refreshing inventory. A stalled read cannot block Done, Close or Escape.
The synthetic fixture uses the same no-store read policy as production and
adds a stalled-refresh mode. Source-bound follow-up proof: review.json in
docs/audits/store_inventory_sale_v1; one sale, dismiss and manual refresh passed.
The original browser.json retains its original source hashes and evidence.
