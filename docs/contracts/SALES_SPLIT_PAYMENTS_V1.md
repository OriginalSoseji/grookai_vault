# Sales Desk split external payments

The website and native Sales Desk can record a sale paid through up to four
distinct methods: cash, an external card terminal, bank/payment app, and Other.
These entries describe a completed external exchange. They never charge a card,
move funds, issue store credit or confirm an online processor payment.

The optional **Split payment / cash change** editor preserves the existing
single-method flow. Amounts are integer USD cents. Applied amounts must equal
the absolute balance after tax and trade credit. Incoming cash may exceed its
applied amount; the difference is change. Other methods and customer payouts
must have tendered equal to applied. An even trade has no payment entries.
Changing a cart does not silently reallocate a previously agreed payment split.

## Authority and recovery

`vendor_sales_payment_control` defaults off. The authenticated capability RPC
requires both that control and the existing Sales Desk capability. Environment
flags and client feature state cannot authorize a sale. Existing v1/v2 writers
are unchanged. The new v3 writer validates payment entries against recomputed
cart/trade totals and commits intake, exact-copy disposition, customer data,
receipt and recovery record in one transaction. Existing ownership and stock
reservation boundaries still arbitrate availability.

The receipt book is locked before outgoing stock, and stock locks use stable
copy ordering. A repeated request ID and identical payload returns the original
receipt, including after feature disablement. A changed payload is rejected.
Owner isolation, private base tables and authenticated recovery remain intact.

Optional draft payments are retained in the existing device/browser journal.
Incomplete allocations may be saved as drafts; completion requires strict
validation. An attempted v3 request retains its exact ID and payload. No draft
sync or cart reservation is added by this feature.

## Receipt and reporting

The version 1 `payments` snapshot contains signed `balanceMinor`, `entries`
(`method`, `amountMinor`, `tenderedMinor`) and `changeMinor`. A multi-method
receipt uses `method: "Split payment"`; a one-method receipt uses that method,
and an even trade uses Other. Receipts without this snapshot retain their legacy
meaning. A Split payment label without a valid snapshot is rejected on import.

Cloud backup parsing, printed/shared receipt text and native sharing retain the
breakdown. Existing receipt immutability applies. Reports allocate the signed
applied amount to each method, exclude cash change from income and count the
receipt once. Filtering by a constituent method includes its entire transaction;
summary totals describe those matched transactions. CSV adds breakdown, cash
tendered and cash change columns without changing older column meanings.

## Rollout and rollback

Migration `20261006140000_sales_split_payments_v1.sql` is additive except for the
existing receipt validator gaining the optional structured payment field.
It does not activate the new control. Retain all tables, receipts and journals
on rollback; disable the new control to stop new split sales while preserving
recovery. Old clients that reject new receipt fields must not be used to edit
or restore books containing split receipts. Deploy compatible readers before
enabling new writes.

The local clean replay includes the separate, still-disabled receipt-delivery
migration. That is not authority to apply or activate receipt delivery in
production. The production migration package must reconcile the actual ledger,
be rehearsed from that exact baseline and pass the governed PrePush gate.
Sending receipts through a provider remains deferred.
