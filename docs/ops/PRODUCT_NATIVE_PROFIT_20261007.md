# Native private profit report — October 7

Worktree `C:/gv_product_native_profit_20261007`, branch
`feature/product-native-profit-20261007`, now includes combined release
commitda46e8d9. It passed7,574 contracts,1,437 native tests, web types/lint/build
and analysis. The independent430 shadow proof also passes. Its separate worktree
remains clean and its fresh PrePush and CLI dry-run pass. Only the cost migration
is pending; production429 is unchanged. The native-profit stash/snapshot is retained; all12
non-conflicting file hashes match after integration and both documentation
histories are preserved. Native-profit product bytes are still uncommitted.

This slice adds native read-only parity with the qualified web known-cost report.
The exact BigInt model uses immutable cost-at-sale snapshots, never current copy
cost. Forty fixed web/native comparison vectors pass, plus independent assertions
for covered profit, missing evidence, numeric failures and input preservation.
Zero, loss, foreign currency, manual lines, discounts, malformed evidence and
conflicting duplicates preserve the web semantics. Tax, trade credit and payment
movements do not change covered item profit. No new dependency or SQL is needed.

The owner-bound service uses existing vendor_sale_cost_read_v1 in batches of100,
with15-second per-read bounds. It publishes a result only after all batches pass
owner and receipt-scope validation. A failed later batch cannot masquerade as
missing cost. Account changes invalidate the service permanently, including an
away-and-back sign-in and late responses. The service has no mutation method.
Twelve service tests and44 model tests pass. Superseded filtered reports stop
before dispatching further batches; late results remain hidden.

Native Reports passes its currently filtered receipt rows into a private panel.
The compile-time GV_VENDOR_PROFIT_V1 flag defaults false. Revenue/receipt access
continues if the private history cannot load. The panel clears stale values while
filters change, suppresses late/account-changed results, explains unknown coverage
and lets failed reads refresh. Nine widget cases pass, including actual Reports
payment filtering, default-off behavior and360px double-text-size scrolling.
Receipt sharing and CSV continue to use the existing receipt/report authorities;
the private panel is not added to customer output.

The final73-case focused run passes, including the9-case panel suite. Full Flutter
analysis and the subsequent cancellation-change analysis pass. Earlier lint/test compilation errors were
corrected; preserve their logs. Real authenticated Samsung acceptance now passes
in device-1791420069764, with six inspected screenshots. Two real receipts produce
USD8 covered profit,1/4 line coverage (1/3 when filtered), explicit foreign/manual/
historical exclusions and read failure/recovery. The historicalUSD12 cost remains
unchanged after the synthetic sold copy's current cost is changed to9999.
Account closure removes private metrics; entry-off makes no cost reads.
The device changes none of13 business-table hashes outside Auth session lifecycle;
scoped cleanup restores all14 retained table hashes and every control flag.
The primary app path is unchanged; locked acceptance410 is stopped and task ADB
mappings are removed. The final pluralization-only correction passes the9 widget
cases after screenshots; calculations, reads and interaction paths are unchanged.
The normal commit hook and iOS profit qualification remain outstanding.

Use only a fresh synthetic fixture against the retained local cost lab after
the combined-release hook and retained-lab release audits are terminal. Preserve the primary Samsung app, journal
data and all populated labs; install only the existing locked acceptance package
with matching signer and retained prior APK. Do not replay a consumed fixture.
Prove known/missing cost coverage, immutable history after a later cost edit,
read failure/recovery, filtered report agreement and account closure. No production
activation, database application, store upload or overhaul completion is implied.

The device fixture producer is scripts/audits/product_native_profit_fixture_v1.mjs
(prepare/verify/cleanup). Never reuse its consumed manifest. The external
run-samsung.ps1 attaches to the preserved locked acceptance app through a VM
forward; it does not use the Flutter install/uninstall path. Build with the
existing trusted task JKS, build-number410 and only the fresh private defines.
Run normal checks using `node scripts/tests/run_product_native_profit_checks_v1.mjs
commit` after staging; freeze this source until the hook is terminal.

External evidence:
`C:/grookai_vault_operator_artifacts/product_native_profit_20261007/CHECKPOINT.json`.
