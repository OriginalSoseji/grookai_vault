# Vendor preorder drafts V1

Vendors choose payment terms independently for each upcoming release: reservation
without payment, full payment upfront, or a fixed deposit per unit. These are saved
preferences. This version creates private drafts only. It does not accept customer
reservations, collect deposits, charge balances, or promise allocation.

`vendor_preorders` belongs to an existing owner store. It contains title,
description, expected date, USD price in integer cents, allocation limit, payment
mode, optional deposit, terms, draft/archive status and optimistic version.
It creates no Vault copies, custom-product stock, reservations or orders.
Deposits must be positive and strictly less than the price; other modes require
no deposit. Database checks enforce bounds even through direct RPC calls.

Authenticated owners can inspect retained drafts after entitlement loss. Saves
require the existing active database store_app grant and app rollout. RLS limits
table reads to the store owner; direct table writes and anonymous access are
revoked. The API applies authentication, origin checks and a 40 KB body bound.
Owner lists use 25-row pagination. A store has at most 1,000 draft/archive records.

The browser retains a generated ID across retries. The writer serializes on the
owner store, checks the expected version and treats an identical repeated save
as the same result. Conflicting stale edits fail. No public reader includes drafts.
Archiving is reversible and retains the record.

Store onboarding now links directly to profile identity, public-profile permission,
Vault sharing and separate explicit app/web publication controls. It uses existing
profile and publication writers. Profile branding is preserved. Creating a store,
saving visibility, or gaining a capability never publishes the store automatically.

Customer booking and paid preorder execution are a separate implementation gate.
Before enabling them: immutable accepted terms, confirmed allocation, reservation
capacity/concurrency, cancellation/refund rules, deposit/balance tracking, provider
payment confirmation and fulfillment/reconciliation proof are required. A draft's
payment_mode is never evidence that a customer paid or received stock.
