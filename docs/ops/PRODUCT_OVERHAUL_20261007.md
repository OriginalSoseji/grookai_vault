# Product overhaul — October 7, 2026

## Current candidate

Workspace: `C:/gv_product_overhaul_20261007`

Branch: `feature/product-overhaul-20261007`

Base: `ecb33552cbbbf6ec9295f50a809ec393680e469c` (current main when work began).

Contract: [Product Workspaces V1](../contracts/PRODUCT_WORKSPACES_V1.md).

This is the first implementation slice following the DeckTradr comparison. It is
not the completed overhaul and has not been deployed or installed on the founder's
phone. The [broader plan](../product/OVERHAUL_PLAN_20261007.md) defines the target
journeys and releases. The source audit remains in
`C:/grookai_vault/docs/audits/decktradr_competitive_review_20261007/`.

## Implemented locally

- Native lazy, retained vendor navigation; direct signed-in header entry.
- Compact exact-copy inventory with the existing editing and disposition actions.
- Native workspace exit coordination for pending prices and held-deal draft saves.
- Stock refresh on return to Desk without changing negotiated deal amounts.
- Native and web Reports entries that read receipts without opening another cart.
- Web workspace navigation, direct inventory entry, and queued-draft link guard.
- Narrow-screen report filters collapsed behind an explicit control; keyboard access
  to the hourly chart.
- Account-change invalidation and synthetic responsive fixtures.

No database migrations or production record writes were made for this slice.
Existing schema/read/writer access checks remain authoritative.

## Evidence

External checkpoint and build logs:
`C:/grookai_vault_operator_artifacts/product_overhaul_20261007/`.

- Targeted Flutter cases: 21 passed across the suite and focused follow-up
  (workspace, compact inventory, reports, current Sales Desk, draft restore,
  uncertain-response recovery and retaining the selected report period).
- Targeted Flutter analyzer: passed with no issues.
- Six browser cases passed across the fixture suite and its focused follow-up at
  384, 768 and 1440 pixels, including account-response isolation, queued-write
  navigation, a reachable phone deal action and serious/critical axe checks.
- Changed web files: ESLint passed with zero warnings. TypeScript passed.
- Full check reached 7,456 passing contract tests (10 skipped), runtime gates,
  full web lint/typecheck and the strict Next production build. It then stopped
  on an unnecessary import in the new Flutter test; that import was removed.
  Full native regression and the final normal-hook run remain separately recorded.
- Full native follow-up: analyzer passed; 1,357 tests passed with two skipped.
  Main was fast-forwarded to `a7b2e8ceb` before this run; its upstream change only
  updates the founder operations snapshots.
- Native renders: `.local/product-overhaul/inventory-{384,768,1440}.png`.
- Browser renders: `apps/web/test-results/vendor-workspace/`.

Android compilation initially failed on the machine's Java certificate trust.
A task-local JKS made from already-trusted Windows roots is used for the retry;
TLS verification stays enabled and the installed JDK trust store is unchanged.
Debug APK compilation passed after that trust repair. Test compilation uses
loopback Supabase and a dummy public key, not production configuration; the retained
APK is compile evidence, not an operational or installed customer build.

Run `node scripts/tests/run_product_overhaul_checks_v1.mjs shipcheck` for normal
repository checks against the retained, attested 430-migration local lab. The
runner verifies source hashes and container identity, uses a read-only database
connection, sanitizes credentials and records before/after copy and account counts.
It does not reset or reseed the lab. Its `commit` mode runs the normal hook after
the reviewed candidate is staged. External `latest-checks.json` owns results.

The initial read-only environment check matched the configured production project:
171,181 card prints, 3,401 sets, 32,903 traits and 985 Vault view rows at
2026-10-07 18:55:40 UTC. These counts establish audit routing only, not a test target.

## Preserve concurrent work

`C:/gv_sales_scanner_20261007` remains separate. Do not reset it, its retained lab,
or existing import/receipt/deal requests. This candidate has narrow changes in
`SalesDesk.tsx`, `sales_desk_screen.dart` and `sales_cart_service.dart`; integrate
them deliberately with that scanner work before releasing the combined workflow.
No scanner functionality was copied or claimed as integrated here.

## Next work and release gates

1. Finish normal repository shipcheck and compilation; resolve current-main and
   scanner overlap without discarding either change.
2. Verify the actual authenticated web paths, store-form navigation, browser Back,
   large text and native account/exit flows against fresh synthetic local accounts.
3. Complete the six reference journeys from the broader plan, including Collector
   Vault, card research and Scan review. The current renders cover only this slice.
4. Prove a designated device deal through receipt and uncertain-response recovery;
   obtain equivalent iOS evidence through the existing Mac release workflow.
5. Continue collector navigation and card hierarchy, then cost/price evidence and
   event economics. Do not label item sales as profit or invent portfolio history.

Public deployment/store submission still requires the repository's explicit release
authorization and gates. No public release or production-data authorization is
inferred from permission to implement the overhaul.
