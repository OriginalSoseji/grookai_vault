# Collectr receipt recovery after a printing edit

The original USD sealed import succeeded: 165 sealed copies added across 100
source rows, no new card copies, 1,540 accounted copies, and 578 retained review
rows. Independent readback confirms all 1,375 prior mapped card copies and the
eight pre-existing sealed copies are unchanged. The original document and all
old source groups are unchanged. Do not submit a fresh import request.

The owner browser retained its original V3 request because confirmation found a
printing difference on one previously imported card. That difference existed in
the before-import snapshot. Both the immutable original group and the current
copy must be preserved; changing inventory to satisfy a historical receipt is
not a recovery mechanism.

The candidate accepts later printing edits only for V3 card readback with zero
new card copies. It verifies the original card, printing, source indices,
quantity and mapped copy IDs against the immutable group first. Current card
identity, presence, uniqueness and owner-scoped access are still required.
Fresh card additions and V2 retain their strict printing checks. No writer,
schema, catalog, inventory or permission change is included.

Verification: `node --experimental-strip-types --test
tests/contracts/collectr_card_receipt_recovery_v3.test.mjs
tests/contracts/collectr_sealed_save_v3.test.mjs` covers recovery, strict fresh/V2
behavior, altered source/group evidence, missing/duplicate copies, wrong current
card, grading and review counts. Both readback functions also pass against the
privately retained real database snapshot after the repair. TypeScript passes.
Normal hooks, hosted qualification, deployment and owner-browser recovery remain
until their receipts exist.

Private evidence and actual release status live outside the repository under
`C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005/usd-original-import`.
Keep `save-intent.json`, the successful request, `before.private.json`,
`after.private.json`, `verified.json`, and all populated labs. The browser must
retry its retained request after deployment; never clear its session storage or
create another import. A separate intermittent catalog query timeout was
reproduced and retained in `diagnostic-requests.private.json`; it is not fixed by
this receipt repair.
