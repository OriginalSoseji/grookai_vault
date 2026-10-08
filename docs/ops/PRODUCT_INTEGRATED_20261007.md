# Combined private economics workflow — October 7

Worktree `C:/gv_product_integrated_20261007`, branch
`feature/product-integrated-20261007`.

The base is cost editor `bead8c328`; report `dc630120c` is merged with conflicts
resolved in the documentation and shared browser fixture. Both fixture entries
remain available. Shared environment guards are identical. The combined product
is committed locally at `12f806945`; 43 browser scenarios and normal hook
`checks-1791415086901` pass (7,525 contracts, web types/lint/build, native analysis
and 1,382 native tests). The native cost candidate includes this exact base.

Reuse the existing [cost evidence](../contracts/VENDOR_COST_EVIDENCE_V1.md),
[private report](../contracts/VENDOR_PROFIT_REPORT_V1.md) and editor contracts.
No new schema or writer is introduced by this integration. Production switches
stay off, retained labs stay intact, and no historical costs are inferred.

External status:
`C:/grookai_vault_operator_artifacts/product_integrated_20261007/CHECKPOINT.json`.

Combined actual-auth proof passes in `runtime-1791414918049`: enter USD12 through
the owner editor, recover its lost response with one recorded request, complete
the existing mixed v3 sale, then read $8 covered profit from actual Reports.
Unknown-cost/manual/foreign-currency exclusions remain explicit; later inventory
changes do not rewrite the sale. Owner checks, filtering, API failure/recovery and
feature-off behavior pass. Cleanup restores all 13 retained table hashes.
The producer is `scripts/audits/product_integrated_runtime_v1.mjs`, local33240 only.

Run the combined browser suite with `playwright.economics.config.ts`, then the
ordinary managed merge hook with
`node scripts/tests/run_product_integrated_checks_v1.mjs commit`. Stage reviewed
source first; do not edit it or mutate retained full431 during the hook. External
receipts own the final results. The browser suite includes inventory/pricing,
workspace navigation, cost journal and report regressions together.

The report's standalone normal hook passes 7,509 contracts, web types/lint/build,
native analysis and 1,382 native tests. The editor has its own complete normal-hook
receipt. These do not replace combined proof. Release-gate commit `13c6764d` is
still separate; independent shadow qualification is also pending.

Daily-workflow iPad Pro 11-inch M5 simulator/iOS26.5 acceptance now passes at
`2c7bd7242`: exact-copy scan, simulated lost response, identical-request recovery,
one $12.34 receipt/disposition, remaining inventory, reconciled Reports and account
closure. Six screenshots and independent database readback are retained. Cleanup
restored original local430 counts and flags, stopped the relay and removed only
the new task simulator. This establishes simulator coverage, not physical iOS,
camera accuracy, scanner pairing or store-release acceptance.

Next product scope remains native cost entry, recorded discounts, historical cost
revisions, events/expenses, collector history and the wider overhaul plan.
