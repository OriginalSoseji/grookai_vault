# Private known-cost profit report V1

This local candidate extends overhaul release 2. It does not declare the event,
expense, discount, historical correction or full economics scope complete.

Read the existing receipt book and private immutable sale-cost snapshots through
the authenticated owner client. No current inventory cost, public listing or
customer receipt fields are a substitute for missing cost-at-sale evidence.
Opening or filtering Reports must not open a deal or mutate any ledger.

The same selected receipts determine sales and profit coverage. Validate each
receipt's item subtotal, recorded discount, tax and total. Contradictory duplicate
receipts or unsafe monetary values make the calculation unavailable. Identical
copies of a receipt count once. Aggregate monetary arithmetic uses BigInt and
returns decimal strings; formatting must not convert those strings to Number.

A snapshot must align on version, receipt ID, sale instant, USD sales currency,
ordered item indexes, quantities and gross sales amounts. Exact-copy IDs must be
unique and quantity one. Known cost requires matching decimal amount/minor units,
known classification and USD. A mismatched snapshot qualifies no lines. Missing
snapshots, unlinked items, missing/invalid amounts or currencies, oversized legacy
evidence, and foreign-currency cost remain distinct uncovered reasons.

Known-cost profit = sales on qualified lines minus their recorded costs. Show
qualified/total lines and units, known sales and uncovered sales beside it. Zero
cost qualifies; zero qualified lines means profit unavailable, not zero profit.
Losses remain negative. Tax, incoming trade credit, split tenders and cash change
do not change this calculation. It is gross profit on covered items, before event
expenses, fees, refunds and other unrecorded adjustments, not business net profit.

Existing snapshot V1 records gross line amounts without discount allocation.
If a discounted receipt lacks that allocation, reconcile its net item sales and
show `discount_allocation_missing`; do not silently allocate or qualify profit.
Implementing recorded per-line discounts remains subsequent release-2 work.

Private API, UI, owner-change invalidation, browser tests and real authenticated
readback are still required before this calculation becomes a released report.
Production activation and all existing migration release gates remain separate.
