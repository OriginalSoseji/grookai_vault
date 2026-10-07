# Product overhaul — October 7, 2026

## Current candidate

Workspace: `C:/gv_product_overhaul_20261007`

Branch: `feature/product-overhaul-20261007`

Base: `ecb33552cbbbf6ec9295f50a809ec393680e469c` (current main when work began).

Contract: [Product Workspaces V1](../contracts/PRODUCT_WORKSPACES_V1.md).

This is the first implementation slice following the DeckTradr comparison. It is
not the completed overhaul and has not been deployed. A separate local-test package
has passed Samsung acceptance; the primary app is unchanged. The [broader plan](../product/OVERHAUL_PLAN_20261007.md) defines the target
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

The first slice is committed as `994bcf94168b263811c2fea5402aeeb607a1ea84`.
Its normal pre-commit hook passed all repository checks: 7,456 contract cases
(10 skipped), full web type/lint/production build, Flutter analyzer and 1,357
native cases (two skipped). The previous attempt hit an unchanged ingestion
test's ten-second timeout; its focused cases and the complete retry passed.
Both runs retained the local lab's four copies and two users.

## Follow-up integration

The working candidate now includes keyboard QR-to-Desk input from the unchanged
scanner worktree, cancellation across retained native tabs and disabled intervals,
and accepted local journal writes that finish across SPA Back/Forward. Returning
to Desk waits for that owner's queued writes; account changes still invalidate
those writes. Failed local saves block ordinary links until an edit is retried.

The follow-up's nine browser cases pass together, including Back with an immediate
return, failed-save recovery and rejecting queued old-owner edits after sign-out.
Node's 20 shared scanner parser cases pass.
The 39 targeted native cases pass together, including a phone at double text size.
The large-text test exposed fixed stock-header overflow; stock controls and cards
now share one scroll surface, scanner controls wrap, and enlarged cards have room
for their prices/actions. The stock-row test scrolls and settles before its tap.
Actual authenticated route testing also exposed a missing mobile vendor dock when
collector chrome was suppressed. The vendor layout now owns that dock and its
keyboard visibility; the global collector dock yields on vendor routes.
Actual-auth runtime passed on the internal local430 lab: exact copies, owner
isolation, saved/unpriced amounts, cancelled results, archived copies and saved
draft restoration. The real Reports route opens for a synthetic owner without a
store, and Back restores the same three-copy draft. No sale or message was created.
The script restored control flags and removed only its fresh synthetic fixtures;
the before/after account, catalog and copy counts matched. The final combined
normal-hook result is recorded externally. This does not establish physical pairing.

The first combined normal hook passed all contracts, the production web build and
native analysis, then completed with 1,381 native passes, two skips and one failure.
That price-reference test still dragged the former GridView. It now reveals the
actual action and settles its scroll; all four price-reference cases pass with
their negotiated-versus-asking-price assertions intact. The corrected normal hook
passed and committed `5d24fa1f895d435825bdf28dc46f2c8886ca904c`: 7,476 contract cases
(10 skipped), full web type/lint/production build, analyzer and 1,382 native cases
(two skipped). Retained lab counts matched. Evidence: external `checks-1791405115425`.

Native device acceptance uses `integration_test/product_workspaces_local_test.dart`
with an external local-only fixture and the existing real sale writer. The test
simulates loss of the first committed response and requires an identical retry,
one receipt, one disposed copy, refreshed Reports and remaining Inventory.
Its driver writes evidence outside git. The physical Samsung run passed on
October 7 at 20:30 UTC, with six screenshots and independent database readback:
one USD 12.34 receipt, one disposition, the sold row archived and the spare active.
Reports reconciled, Inventory showed the spare, and sign-out cleared the workspace.
The retained lab's original counts matched after fixture cleanup. Evidence is under
external `native-acceptance/run-1791404973783/`. Earlier unsuccessful runs remain
preserved; launcher and scroll/RLS test corrections did not change production code.
The separate locked-acceptance package is build 408; the Samsung's primary app
remains build 409. The tested APK SHA256 is
`873535d685990368426c385a36093b2d8b4d88cbbb9e3f46b85833ad30d12988`.
This is a synthetic local-backend device test, not production release, camera
identification, Bluetooth pairing or iOS proof. Mac access is verified, but its
observed free disk space was only 1.7 GiB; no new iOS build was attempted.

## Owner Inventory follow-up

The next source slice adds `/account/store/inventory` independently of Store setup
and new-sale access, through the existing authenticated stock read. Compact exact
copies retain asking currency, zero amounts and private/sale/trade intent. Search,
price filters and incremental pages lead to the existing copy editor with a compact
vendor header, phone-first pricing and a return link that restores the search.
Sealed inventory reuses its existing gated owner panel. No new writer or schema.

Eighteen browser scenarios pass across the main run and the sealed-tab follow-up,
including 384/768/1440 layouts, dark/light contrast, account changes, pagination,
failed refresh and the existing Store form's discard guard on Inventory links.
This does not establish a Store form guard for browser Back. The actual-auth local
runtime script is `scripts/audits/product_inventory_runtime_v1.mjs`; external
`inventory-runtime/local-1791406406578/receipt.json` records its passing run:
anonymous/foreign isolation, 48+4 distinct copies, price filters without a storefront
or sales capability, a CAD 81.25 edit through the existing writer and independently
matched database state. Back restores the exact search; returning to Desk retains
the original three USD deal amounts. Scanner regression also passes. No receipt or
disposition was created, and scoped cleanup restored retained counts/control flags.
The previous run passed editing but the local Next warning badge intercepted the
bottom Desk link; the retry used the ordinary header link. Its fixture cleanup also
passed. Final combined normal checks for this source slice are still required.

## Reference prototype

[Component and authority specification](../product/PRODUCT_REFERENCE_SPEC_20261007.md)
and [six-screen prototype](../product/prototype/index.html) cover Vault, research,
scan review, Desk, Inventory and proposed event Reports. Run
`node docs/product/prototype/serve.mjs` to serve it on `127.0.0.1:32992` when that
port is free. The current review server serves the identical retained external
artifact and is open in Chrome. All data is synthetic and stays in page memory.

Phone/desktop flow checks cover hold/resume, sale-to-report, private intake without
a price and explicit deal pricing. Automated axe checks reported no violations
on the six phone screens after contrast repair. Event economics and alerts remain
proposed. The first implementation retains existing native/web visual tokens;
the prototype explores a proposed unified palette.

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
The original scanner files remain unchanged; the follow-up snapshot and merge
review are retained under external `scanner-integration/`. This integration is
local code, not a scanner hardware or release qualification.

## Next work and release gates

1. Complete the follow-up's corrected normal-hook run; preserve both worktrees
   and verify current-main ancestry before release preparation. Actual-auth web
   runtime and the designated physical Samsung sale/recovery flow have passed.
2. Complete Store form and owner-without-store Inventory parity, native device
   account/exit flows and large-text coverage beyond the verified Desk/scanner.
3. Carry the six reference journeys into the working Collector/card/scan surfaces;
   distinguish the completed sample prototype from implemented product behavior.
4. Obtain equivalent iOS evidence through the existing Mac release workflow.
   Retain the passing Samsung receipt/recovery and independent readback evidence.
5. Continue collector navigation and card hierarchy, then cost/price evidence and
   event economics. Do not label item sales as profit or invent portfolio history.

Public deployment/store submission still requires the repository's explicit release
authorization and gates. No public release or production-data authorization is
inferred from permission to implement the overhaul.
