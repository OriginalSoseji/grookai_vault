# Vendor cost evidence V1

Local candidate for release 2 of the product overhaul. No production application
or activation is authorized by this contract. Both new switches default off.

## Authority and privacy

Use the existing exact copy's `acquisition_cost` and `acquisition_currency`.
Never replace ownership, inventory, cart completion or receipt-book authorities.
An owner can read their costs and explicitly edit an active copy. No storefront,
vendor entitlement or customer permission confers cost access. Costs stay outside
customer receipts, customer display, shared cards and public listings.

An edit has a durable owner/request UUID and an expected old amount/currency pair.
It locks that copy, checks the expected pair and updates both values together.
An identical retry returns the original result, even after a sale or switch-off.
A changed request is rejected. An intervening cost edit or archived copy conflicts.
Unknown is a null pair; zero is a known cost. A new amount requires explicit
uppercase currency, finite nonnegative decimal value and at most two decimals.
Legacy amounts without currency remain visible and require owner review.

## Native editing and recovery

Native Inventory uses the existing owner-only RPCs and a separate app-sandbox
SQLite journal. `GV_COPY_COST_V1` defaults off for new entry. Pending recovery is
independent of that switch and active inventory, including archived copies.
This does not replace existing sale drafts, import receipts or public pricing.

Persist the exact owner/copy/request payload in a transaction before dispatch.
Revision checks reject stale screens; an unresolved payload cannot be changed or
cleared by normal editing. Only a matching confirmation or a specifically known
definitive server rejection can settle it. A transport error, timeout or failed
local acknowledgment retains the same request. Failed reads never mean zero cost.

Keep raw proposals separately from immutable requests. Serialize device writes
and drain them before saving or leaving. Device-storage failure keeps text visible
and blocks departure; reloading a stored proposal requires an explicit choice.
Account changes hide private fields and invalidate the service and late replies.
Never use current copy edits to revise immutable historical sale costs.

Qualification includes real SQLite rollback/reopen/CAS, account-scoped paging,
large-text UI, loss of a successful response followed by actual process restart,
and recovery from empty Inventory after archival. Local fixtures must restore
their retained table hashes and leave the primary installed application intact.

## Inventory completeness review

Review an explicitly included set of card copies from Inventory search/filters.
Do not present it as all-owner coverage or sealed-product coverage. Read existing
owner-only cost evidence in bounded batches; publish coverage only after complete
validation. An absent or archived copy is unavailable, never a missing-cost edit.
Known zero and known foreign currency are recorded costs; no implicit conversion
or USD profit inference. Missing amount, missing currency and invalid evidence
remain separate. Account changes close private review; failed refresh clears old
metrics. Repairs reuse the existing journaled per-copy editor and reread on return.
New entry remains behind the existing flag; pending recovery remains independent.

## Sale evidence

A default-off AFTER INSERT trigger on the immutable cart receipt ledger captures
private per-line costs in the same transaction as the existing v1/v2/v3 sale.
Those writers already lock all outgoing exact copies in stable order. Cost edits
lock a single copy and never take the receipt-book lock, avoiding inverse order.
If capture fails, the sale rolls back; no successful sale may claim a partial
snapshot. Malformed legacy costs become explicit unknown classifications rather
than preventing an otherwise valid sale.

If legacy cost evidence exceeds 1,500 bytes, the snapshot records an explicit
`oversized_legacy_value`, no usable cost, a bounded currency when available and
a SHA-256 fingerprint of the original classified evidence. The original copy
values remain unchanged. Fifty such lines must still complete within the journal
size bound. This fingerprint is provenance, never a usable price or currency.

The snapshot records receipt ID, sale time, USD sale currency and ordered lines.
Each line retains quantity, sales amount, exact instance where linked, original
cost amount/currency, classified status and exact decimal-string minor units when
qualified. Foreign-currency cost remains recorded but is excluded from USD profit.
Manual/unlinked lines, missing amount, missing currency and invalid cost are
distinct. No implicit currency, FX conversion or zero replacement is permitted.

Completed snapshots cannot be updated. Cost edits cannot alter previous snapshots.
Owner deletion can cascade private evidence; direct client writes are denied.
Old receipts and retries do not receive today's costs as retrospective evidence.
Missing snapshot means cost-at-sale unknown, regardless of current inventory cost.
The existing receipt JSON and recovery response remain byte-equivalent.

## Reporting boundary

Native Reports uses the same immutable evidence and exact arithmetic as the web
report. GV_VENDOR_PROFIT_V1 defaults off; all private cost reads remain owner-bound.
Every bounded read batch must validate owner and requested receipt scope before a
complete result becomes visible. Failures cannot become empty history or zero
profit. Filter changes clear old metrics, account changes hide private values and
invalidate late responses. Customer receipts and existing exports exclude this
private panel. Native device/release proof remains separate from calculation tests.

Revenue, taxes, external payment movements and trade credit remain distinct.
Known-cost profit uses only evidenced lines in a compatible currency and displays
coverage. Costs use exact decimal strings and integer arithmetic, never floats.
Event association, expense revision, discount allocation and historical cost
correction require their own explicit evidence; this migration does not invent it.

## Qualification

Verify fresh replay, no-op push, populated upgrade retention, schema parity and
idempotent rerun on dedicated labs. Prove disabled defaults, owner isolation,
anon denial, cost-zero handling, currency/precision errors, optimistic conflict,
identical/mutated retries, sale/edit ordering, rollback and cost privacy. Exercise
all three cart writers and foreign/unknown/manual costs. Do not reset prior labs.
Strict linked baseline is read-only against actual production429. Source430
includes deferred receipt delivery; a future release package must explicitly
exclude it unless separately authorized. Full schema/release gates remain pending
until their independent receipts pass.
