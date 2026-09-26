# Buyer quote and confirmation V1 — disabled local candidate

Baseline `aac61a631b388593025bb712cb21eef4f6ef45cf`. Extends order, stock,
checkout creation and HTTP contracts without changing any of the403 migrations.

POST `/api/vendor-orders/acquire` requires exact same origin and server-verified
Auth. A quote accepts only an exact store/item UUID, copy/custom kind, quantity
and random retry UUID. Copy quantity is one; custom quantity is1–100, subject to
current stock. Browser prices, buyer/seller IDs, shipping, tax and paid flags are
rejected. Bodies are bounded3072 bytes; responses are private/no-store and
no-referrer. GET never reserves or creates an order.

The existing service-only reserve RPC checks publication, active DB package,
sharing, ownership, selection, qualified printing/custom listing and stock under
locks. Its immutable asking-price snapshot supplies integer minor-unit totals.
No market price, image, finish or inventory identity is inferred. A two-minute
hold is signed with a separate HMAC key, bound to buyer, request, exact reservation,
snapshot hash and original expiry. Requoting cannot extend the hold. Signing key
rotation changes tokens without changing request identities; request the same
quote again to obtain a token under the current key.

Confirmation accepts only that signed token. It reloads the buyer's reservation
and invokes the existing atomic order function, which independently rechecks
current eligibility/publication/privacy and expiry. Deterministic IDs and database
uniqueness create one order and attempt per request, including concurrent retries.
Known orders recover after response loss, quote expiry or seller downgrade.
Cancellation releases only a held reservation. It cannot release a pending/paid
order; a concurrent confirmation either wins atomically or is refused. Retrying
an ambiguous cancellation or confirmation never creates replacement stock.

`/account/orders/new` preserves safe authentication destinations. The browser
persists only its retry UUID and selection in the URL before requesting a quote;
signed tokens stay out of URLs. It shows unit price, quantity and total before
explicit confirmation. Store cards link to this review only while enabled and
outside owner preview. Existing card/detail routes remain intact. The order page
offers payment continuation only to its authenticated buyer when separate checkout
configuration permits it. That button reuses the existing guarded checkout route;
it neither marks payment paid nor redirects to unvalidated destinations.

## Local policy and remaining release gates

`GROOKAI_VENDOR_ORDER_ACQUISITION_ENABLED` defaults off. Enabled configuration
requires `GROOKAI_VENDOR_ORDER_QUOTE_POLICY=local-synthetic-pickup-v1`, a dedicated
64-character lowercase hexadecimal `GROOKAI_VENDOR_ORDER_QUOTE_SECRET`, exact
synthetic test platform, local staging flags, API alias15439 and origin20040.
Hosted/live environments always reject it. Quoting needs no provider key or call.
Checkout continuation has its own independent default-off flag.

Zero shipping/tax and pickup are explicitly synthetic, not a production tax or
fulfillment policy. No platform fee policy is established here. A confirmed order
enters payment_pending even before opening hosted checkout. Such stock must never
be released by a local timer; safe abandonment of an order without a provider
session still needs a separately governed cancellation/recovery workflow before
activation. Existing retained-binding reconciliation cannot discover an unbound
attempt. Durable monitored scheduling, actual Stripe proof, production quote/
fee/tax/fulfillment policy, refunds/disputes/payouts and controlled release remain
open. No provider request, resource, payment, worker or production action is part
of this candidate. Rollback disables acquisition and checkout while retaining
orders, selected inventory and independent obligation processing.
