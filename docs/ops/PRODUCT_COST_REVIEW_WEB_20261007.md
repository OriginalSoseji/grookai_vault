# Web inventory cost review

Isolated source: `C:/gv_product_cost_review_web_20261007` now includes qualified
native cost-review `611231081`. Its Samsung journey and full normal hook pass
(7,574 contract cases, web checks, analysis and 1,526 native tests). The web changes
were preserved byte-for-byte across integration:17 hashes match the pre-merge
snapshot, and stash44b4967120897adf99c1c0c9318798669dc0cb0b is retained. This tree's
full normal hook is still pending; neither source nor screenshots imply deployment.

Inventory explicitly reviews only its currently loaded card copies. Search,
game and asking-price context travel through the existing exact-copy cost editor
and back to Inventory. Coverage refreshes from saved evidence on return. Sealed
products remain separate. Missing amount, missing currency, invalid evidence,
zero and foreign currency remain distinct. No inferred currency, conversion,
historical cost rewrite or bulk writer is introduced.

The owner-only GET route calls existing `vault_copy_cost_read_v1`, validates each
100-copy batch, disables caching and defaults off with `GV_COPY_COST_V1`. The
browser publishes coverage only after all requested batches pass validation.
Refresh clears old values; account changes permanently close the current view
and discard late replies. Existing exact-copy editing and recovery retain their
original journal and authority.

Qualification so far: 13 model cases, changed-file lint, type checking and 20
browser cases pass. Three review screenshots at 384, 768 and 1440 pixels have
been inspected. Browser cases cover all-or-nothing batching, local filtering,
owner mismatch, failed reads, account changes, default-off entry and existing
Inventory regressions. A development remount initially dispatched a redundant
read; the effect now cancels discarded mounts before dispatch. Visual inspection
then removed the duplicated Inventory rows while review is open; closing it
restores the original filtered Inventory. All20 browser cases pass after this
change. The final real Auth journey is separately qualified below.

## Actual authenticated acceptance

`runtime-1791423178595` passes against the retained full431 lab. Its actual GET
authenticates, rejects owner mismatch and oversized batches, excludes another
owner's copy, and returns private uncached evidence. Inventory search selects one
copy, clearing restores six, and recorded zero/CAD remain distinct. The existing
editor retains the12.00 amount and blank currency until the explicit USD save.
Returning restores review context with fresh4/6 coverage. IndexedDB confirms no
pending request; database readback confirms exactly one request, five other copies
unchanged and11 other business-table hashes unchanged during use. Cleanup restores
all14 retained hashes and both cost switches. Seven screenshots were inspected.
The local server/browser are stopped. No production data or primary app changed.

Injected failed reads clear coverage and retry restores it. Actual cross-tab
sign-out closes Inventory; the old token is rejected. A fresh sign-in then proves
feature-off denies new review reads. Earlier retained runs exposed harness timing
(click before hydration) and an invalidated-token assertion; both restored all14
hashes. `runtime-1791423049383` passed before the final duplicate-list refinement;
its receipt remains separate. No consumed fixture was replayed.

`scripts/audits/product_cost_review_web_fixture_v1.mjs` prepares, verifies and
cleans a fresh synthetic six-copy fixture in the retained full431 local lab.
It refuses mutation while native cost-review normal checks freeze that lab.
`scripts/audits/product_cost_review_web_runtime_v1.mjs <fresh-run>` drives actual
Inventory, existing cost editing, return context, read recovery and sign-out.
It verifies exactly one explicit currency repair and restores 14 retained table
hashes. Each runtime intent is consumed once. Keep failed receipts and never
reset populated labs or replay a consumed fixture. The private external
`product_cost_review_web_20261007/CHECKPOINT.json` records actual outcomes.

Run `node scripts/tests/run_product_cost_review_web_checks_v1.mjs commit` for the
normal managed commit hook. Freeze staged source and the retained lab until it
finishes. The external receipt binds source commit, log hash and unchanged lab
counts; only that receipt can establish the combined source's normal qualification.

Production application, feature activation, native uploads and iOS qualification
remain separate. Preserve all prior worktrees, journals and release evidence.
