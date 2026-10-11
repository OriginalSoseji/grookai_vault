# Recorded sale discounts

This is local release-2 work from qualified event commit072705f7, not a deployed
capability. The fresh read-only baseline1791474532222 passes live429/source434,
zero normalized drift,1170 security definitions and canonical counts171736
cards/3403 sets/32903 traits. Preserve every prior migration byte and populated
lab. New entry defaults off; no production apply or activation is included.

## Amounts and recorded allocation

The existing receipt already records a whole-sale discount. Extend its current
authority with request/writer v6 for Sale, including single or split external
payment recording. Keep public receipt envelope version1 and its existing fields.
Do not change v1–v5 writers, historical receipts or their exact pending payloads.
Buy and negotiated Trade retain their current semantics. Discounted negotiated
Trade remains a distinct follow-up compatibility scope; neither its credit nor
reference prices may be manipulated to disguise a sale discount.

Allocate the integer discount proportionally to gross line amounts. First take
each exact integer floor, then assign remaining cents in descending fractional
remainder order, breaking ties by original line index. All arithmetic is exact.
The recorded allocation has method proportional_largest_remainder_v1 and retains
ordered gross, discount and net minor-unit strings. Its sum must equal the receipt
discount and every net line must be nonnegative. Never recalculate history from
current prices or inventory. Quantities1–999,1–50 lines and positive unit prices
remain bounded; gross subtotal and final total are at most100000000 cents.
Discount0 is allowed; discount cannot exceed subtotal. The existing positive
receipt-total constraint remains: a zero total is rejected. Tax is separately
recorded, never inferred or recalculated by this feature.

The server uses the net allocated amount for each exact-copy sale disposition.
A rounded allocation may make a line zero even when the deal total is positive.
Introduce a private zero-capable sale helper and broaden only that nonnegative
disposition constraint; preserve the old public v2 writer's positive-only contract.
Never substitute a fictitious cent or record gross proceeds as net proceeds.
Retain the existing stock locks, archival authority, reservation guards and
rollback behavior. No second inventory or receipt ledger is introduced.

## Private evidence and reporting

The same transaction records immutable cost snapshot version2 for v6 sales,
including the full allocation and existing exact-copy cost classifications.
Other writers continue recording the original version1 shape. v6 capture cannot
be silently skipped after entry: the committed receipt must have its complete
version2 snapshot or the entire transaction rolls back. Costs and allocation
remain owner-private; public receipt/share/customer views expose only the
existing subtotal, discount, tax, total and payment information.

Compatible report readers require the recorded allocation, validate its complete
shape and exact deterministic reconciliation, and use each net amount for covered
or uncovered sales. Missing, foreign and unlinked costs stay uncovered; a known
zero cost qualifies. Discounts never alter tax, incoming trade credit, tender,
cash change or event expenses. Existing event reports and scoped exports consume
the same validated calculation. Historical version1 discounted receipts retain
discount_allocation_missing. Do not backfill them with a new allocation or cost.

## Entry, persistence and recovery

A separate default-off capability requires current Sale, external payments and
cost capture. The writer locks the existing owner receipt book, checks exact
stored request replay before controls and commits all customer, receipt,
disposition and evidence changes atomically. A changed request ID reuse fails.
Use the existing owner journal and full-request acknowledgement with additive
owner-only read-v3 recovery. The old read-v2 remains restricted to Trade v5. A
matching total alone cannot confirm a request or its outgoing physical copies.

Extend the existing web/native journals with a new version/discriminator so old
clients refuse unsupported drafts instead of silently dropping a discount.
Retain the same owner key, all held deals and older pending versions. Preserve
the exact request durably before dispatch. Uncertain outcomes block clearing or
changing it; feature-off recovery and account invalidation remain available.
Changing a discount cannot silently reallocate an agreed payment split. Show
the discount in private review and the deliberately opened customer view.

Returning an uncertain v6 sale to editing requires a durable server cancellation
fence. A missing receipt, stock conflict, timeout or feature-off error alone never
authorizes clearing it. Cancellation serializes with completion on the existing
owner receipt-book lock. If completion won, return its exact full acknowledgement;
otherwise retain an immutable owner/request/cart cancellation. An exact retry of
cancellation returns the same terminal acknowledgement; a changed cart rejects.
Both paths remain available with entry off. The cancellation acknowledgement is
exactly `{version:1,request:{id,cart},status:'cancelled'}`. Clients validate the full
echo against the durably saved pending bytes before clearing. Editing requires a
new request identifier and another explicit settlement review. Cancellation only
fences recording a sale; it does not refund or reverse an external payment.

The original435 discount migration has no cancellation authority. Qualify an
additive follow-up before enabling entry. Preserve its qualified fixtures and
old v1-v5 writer bodies. A receipt-insert guard must reject a cancelled identifier
even if a delayed legacy writer tries to reuse it; the entire transaction rolls
back, including inventory and receipt-book changes. Existing committed receipts
remain authoritative and cannot be cancelled or altered.

## Required proof

Shared JS/Dart/SQL cases cover one-cent ties, unequal weights,50 lines, quantity,
maximum products beyond floating-point exactness, discount0/full subtotal, zero
net lines, positive-total bounds, malformed/reordered evidence and mixed cost
coverage. Actual Auth proves isolation, anonymous/direct-write denial, concurrent
same/changed retries, last-copy rollback, immutable old history and entry-off
recovery. Prove fresh replay, retained upgrade, exact reapplication and independent
shadow on new isolated labs. Real browser and Samsung must complete a discounted
deal, lose its response, restart, recover exactly once and reconcile Reports,
event totals, CSV and customer view. Existing source-bound normal/release gates
need dedicated new wrappers. Physical iOS and full overhaul remain open.
