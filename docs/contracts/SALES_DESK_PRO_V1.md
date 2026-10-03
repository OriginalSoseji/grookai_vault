# Sales desk workflow and reporting V1

The iPad/phone Sales desk keeps the existing exact-copy transaction authority.
Hold a card thumbnail and drag it to the cart, or use the accessible tap action.
Portrait has a persistent drop target above inventory. Both paths require an
explicit actual sale price. A physical copy can appear only once per cart.

Catalog search reuses the canonical resolver and public printing reader. Search
is bounded to 30 results; late responses cannot replace a newer query or card.
The operator explicitly selects a printing and condition. Choices are: keep one
copy in the Vault, mark it for sale with an asking price, or add it to the current
cart with an actual sale price. A cart add remains Hold until the sale completes.
Listing uses existing profile-sharing permissions; no copy is enrolled into a
store automatically. Manual unlisted receipt items remain a separate option.

`vendor_sales_catalog_add_v1` derives its owner from Auth, requires existing
sales-cart/receipt-cloud availability, rechecks canonical visibility and the
same-parent quarantine-aware public printing boundary, and calls the existing
Vault creation authority for one copy. It never writes canonical catalog data.
The request and result commit together in a private owner/request table. Identical
concurrent retries return the same exact copy; altered request reuse rejects.
Recovery remains available after rollout disablement or subsequent quarantine.
No new foreign keys point into inventory or catalog tables.

The client persists the exact request before sending. An uncertain response
locks that request for recovery across reopening. Confirmed transaction rejection
allows correction. Account changes hide the desk and dismiss its dialogs.
Adding a copy is explicit and durable even if the unsubmitted sale cart is later
discarded. It does not mark sold, charge a buyer or reserve online stock.

The dashboard reads the account receipt book shared with the website. One receipt
is one transaction, including multiple physical copies/manual quantities. Sales
exclude tax and deduct recorded discounts. Separate totals show units, transaction
count, average sale, tax and total received. Hourly buckets use the device's local
time; repeated daylight-saving hours combine without losing transactions. Date
ranges use inclusive local dates and an exclusive following-midnight bound.

Date, payment and text filters apply to both metrics and history/export. History
uses 25-row pages, newest first. Receipt details support copy and the system share
sheet. CSV escapes quotes and neutralizes spreadsheet formulas in text fields.
No export or share is sent automatically. Private customer wants/notes are absent.

These are vendor-recorded in-person receipt totals, not profit, tax liability,
Stripe settlements, online orders or unreceipted legacy dispositions. The UI
states this coverage. Those ledgers cannot be combined by summing raw copy rows.
The existing checkout/reconciliation candidate remains separate.

Release requires isolated full417 replay, retained416 upgrade, actual Auth/HTTP
concurrency and negative-boundary proof, native interaction proof, normal source
hooks and strict schema gates. `SalesDeskProBaselineV1` is read-only; it cannot
admit PrePush. `SalesDeskProReleaseV1` accepts only migration20261003230000 and
hash-bound proofs. Rollback to the prior client retains copies/history; disabling
sales-cart availability blocks new catalog adds while preserving recovery.
