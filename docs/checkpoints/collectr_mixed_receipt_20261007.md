# Collectr mixed receipt confirmation

PR607 is deployed. Its original seven-card incremental import succeeded and was
independently verified: 1,616 accounted copies and 543 review rows. All 1,322
previous source groups, all 3,216 previous owner copies, the original document
and exact costs are unchanged. The collection now has 1,329 source groups and
3,223 total owner copies. Do not submit a fresh import.

The old confirmation rule accepted historical printing edits only when a receipt
added zero cards. Adding seven cards made it reject an earlier owner printing
edit even though both the immutable source evidence and saved inventory were
correct. The browser retains its original successful request.

The website now captures complete owner/source-scoped group mappings before
invoking the V3 handler. Read failures abort before the writer. Readback requires
each historical group to match that snapshot exactly and bind the original card,
printing, source indices, quantity and copy IDs. Only those historical copies
may retain a later printing edit. New groups and V2 retain exact current-printing
checks. Current parent identity, presence, uniqueness and ungraded state remain
required. Browser input cannot supply the trusted snapshot.

On recovery the handler returns its durable receipt before the writer. Already
committed groups are historical in that request's server snapshot. This change
does not alter the writer, schema, catalog, inventory or permissions.

Focused regression tests cover mixed increments, recovery, V2, wrong fresh
printings, modified immutable mappings, owner/source isolation, pagination and
failed reads. Private real before/after snapshots reproduce the original failure,
pass mixed card/sealed verification and recovery with the fix, and still reject
a wrong new printing. These checks make no production writes.

Actual normal-hook, hosted-check, deployment and live browser outcomes belong to
`C:/grookai_vault_operator_artifacts/collectr_mixed_receipt_20261007/CHECKPOINT.json`.
Keep PR607's consumed save/recovery intents and private evidence intact. After
deployment, use the retained browser's same-request retry and independently
verify every saved group, copy and receipt unchanged. Do not claim UI completion
until its success screen is observed. Retain all labs and the pending graded-item
decision; no physical-device testing is required for this website repair.
