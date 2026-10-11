# Native inventory cost review — October 7

Worktree `C:/gv_product_cost_review_20261007`, branch
`feature/product-cost-review-20261007`, now includes native profit `9dcebf64c`.
That commit passed 7,574 contract tests, web checks/build, analysis and 1,502 native
tests (two skipped), with retained lab counts unchanged. Its Samsung proof passed.
Cost-review changes were stashed, fast-forwarded and reapplied; all nine product/
test file hashes match and both documentation blocks are preserved. Keep the stash
and snapshot in external pre-integrate-v1. The source/lab freeze is now lifted.
This slice implements the next cost-completeness workflow without changing SQL,
imports, historical snapshots or existing edit/recovery authorities.

Inventory offers Review costs for matching copies only with existing
`GV_COPY_COST_V1` entry enabled. Its search/filter result defines an explicit
card-copy scope. It does not claim platform-wide, whole-Vault or sealed coverage.
The review starts with copies needing attention, with separate missing amount,
missing currency, recorded and unavailable filters. Zero is recorded; a valid
foreign currency remains recorded in that currency, without conversion or a USD
profit claim. Original amounts without currency stay visible for explicit review.

The existing owner-only `vault_copy_cost_read_v1` supplies batches of at most100.
No result is published until every requested batch passes owner, identity and
shape validation. Missing/archived copies are unavailable rather than missing
cost. Contradictory evidence cannot count as recorded cost. Account changes,
including away-and-back, close the review and hide late replies. Refresh clears
old coverage before reading; read errors never become zero coverage or costs.

Each repair opens the existing exact-copy editor after its existing price-edit
exit guard. Returning rereads the same scope and preserves review search/filter.
Recovery still uses the SQLite journal and original request UUID; this screen has
no save or bulk-write method. New entry off preserves pending recovery access.

The first85-case focused suite passed; the final24-case new review suite also
passes, including14 service cases, eight screen cases and two actual Inventory
navigation cases. Full analysis and subsequent changed-file analysis pass. Two
synthetic phone renders were inspected; those are not physical-device proof.
After integration, all89 combined cost-review/profit focused cases and full
analysis pass. No product source changed during integration.
External `C:/grookai_vault_operator_artifacts/product_cost_review_20261007/`
records actual outcomes. Web equivalent, combined-source
normal checks and iOS qualification remain separate. Do not claim deployment.
Use fresh synthetic fixtures only; retain all old labs, journals and evidence.

## Samsung acceptance

Real Auth/device proof now passes in `device-1791421920504` with eight inspected
screenshots. The actual Inventory search selects one copy; the explicit Clear
search action restores all six copies before opening the next review. Three known
costs become four after explicitly adding USD to the saved12.00 amount. The other
five copies remain unchanged and exactly one immutable request is recorded.
Zero and CAD costs remain recorded; unknown and invalid precision remain distinct.
Failed reads clear coverage, retry restores it, and sign-out closes private data.
Entry-off makes no review reads and keeps pending-save recovery reachable.

Database verification passes:11 other table hashes are unchanged during device
use, and cleanup restores all14 retained hashes and both control flags. Locked
acceptance411 is stopped, task ADB mappings removed, primary installed app unchanged.
The host retained the original acceptance APK; never replay consumed fixtures.

Earlier attempts are retained. Negative fixture cost was rejected by an existing
constraint and rolled back. Two device runs kept a one-copy search scope after
test text replacement; diagnostics showed the API classification was correct.
The visible Clear search action plus return/reopen regression passed11 focused
navigation cases and the final device run. A temporary const-decoration compile
error was corrected before that run. No original inventory or production changed.
The final98-case combined focused suite passes on the Samsung-qualified sources.

The producer is `scripts/audits/product_cost_review_fixture_v1.mjs`, with prepare,
verify and cleanup modes. The checked-in integration driver saves external PNGs
and a structured response. Private host `run-samsung.ps1` preserves the installed
locked package via install-r and matching signer; it never uninstalls. Build with
the existing trusted task JKS and fresh private defines. Normal qualification uses
`node scripts/tests/run_product_cost_review_checks_v1.mjs commit`; freeze staged
source and the retained full431 lab while it runs. Web equivalent and iOS remain
unqualified; production release is separate.
