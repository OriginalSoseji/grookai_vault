# In-person checkout trade-ins

Extends the Sales desk cart with customer trade consideration. The vendor selects
an existing canonical card and governed printing, or enters a quick receipt-only
description. Each line records agreed USD value, quantity and an explicit rate
from 0.01% to 100%. Credit is rounded half-up to cents once per extended line:
`floor((valueMinor * quantity * rateBps + 5000) / 10000)`. It is neither an automatic
market quote nor a discount. Tax remains a separately entered collected amount.

Checkout and receipts expose every card, valuation, rate, credit, purchase total,
total trade credit and remaining balance. A zero balance is an even exchange;
a negative balance records money paid to the customer. The vendor confirms the
physical exchange and payment/payout already happened. No Stripe charge, refund,
stored credit balance, online reservation or customer-to-vendor ownership transfer
is created. Purchase totals stay gross; reporting separates trade consideration,
money received and money paid to customers.

Canonical trade lines have quantity one. An explicit unchecked-by-default option
adds one incoming Hold copy to the vendor's Vault when recording the deal. Quick
trade lines never create catalog or Vault inventory. Drafts/cancel have no writes.
No market evidence, finish, canonical identity or source ownership is inferred.

`vendor_sales_cart_complete_v2` derives Auth ownership, uses the existing locked
receipt book and durable request journal, rechecks eligible printing identity,
calls the existing Vault creation and outgoing disposition writers, validates the
receipt and commits everything atomically. Any failure rolls back incoming and
outgoing inventory and receipts. Retries with the identical owner/request/payload
recover once; changed reuse rejects. Recovery remains possible after disablement
or subsequent quarantine. The independent trade control defaults OFF and requires
existing sales-cart/receipt-cloud availability. V1 ordinary sales stay intact.

Receipts retain the version1 base schema with an optional strictly validated
`tradeIn` snapshot. Existing immutable receipt equality protects it from removal
by older clients. Web cloud parsing, backups, text, print/download/share and email
or SMS drafts preserve the complete snapshot. A short settlement summary is also
appended to the receipt note for older native readers; trade notes allow350chars.
Messages are composed only, never automatically sent. There is no new staff grant.

Release requires a fresh426 baseline, dedicated full427 replay/no-op push and
retained426 upgrade, real Auth/RPC math/rollback/concurrency/ownership/quarantine
tests, actual native/web receipt parity, normal hooks and governed migration,
web and TestFlight readbacks. Web support must be live before enabling trades.
Rollback disables the trade control, retaining receipts, inventory and recovery.
