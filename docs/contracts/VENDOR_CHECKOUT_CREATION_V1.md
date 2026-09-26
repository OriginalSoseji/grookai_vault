# Private checkout creation and recovery V1

Candidate based on `4ccbb8c7364b6130ab78840bda3c1554e4337776`. This extends the
durable order and payment evidence contracts. It is not enabled or exposed by an
HTTP route. No actual Stripe request, resource or payment is authorized by its
local proof.

## Creation and resume

`vendor_order_checkout_prepare_v1` accepts a server-derived authenticated buyer
and existing order ID. It locks store, seller, stock, reservation, order and attempt
in the established order. Both new and already-bound checkouts recheck database
grants/rollout, explicit publication, profile/sharing, selected copy, governed
printing eligibility, custom product availability, seller state and retained
paid/review/stock state. A buyer cannot substitute another order. Public clients
cannot execute this RPC; service-role writes remain governed.

The private service defaults disabled. It validates the immutable order projection,
performs scoped seller readiness and actual platform mode checks, and reauthorizes
before a POST. Only the existing seller-account model is accepted. An unbound
attempt must own the current fence with at least 60 seconds left and remain within
its original 23-hour window. Missing/stale evidence stops creation.

V1 only transports a pre-existing server-approved, USD, zero-tax pickup quote.
Shipping, nonzero shipping/tax and unsupported fulfillment are rejected, never
dropped from the amount. This is a local fixture capability, not a decision that
real sales are tax exempt. Production quote policy must be implemented and applied
before creating an order. A refused/ambiguous payment claim is not automatically
released. General abandoned-attempt resolution remains separate.

The request uses one immutable amount/quantity line, card-only automatic capture,
order/attempt/reservation metadata on both session and intent, disabled discounts,
adaptive pricing, automatic tax, recovery links and post-purchase invoicing. No
platform fee, transfer, on-behalf-of, stored customer or future-payment consent is
inferred. [Stripe direct charges](https://docs.stripe.com/connect/direct-charges.md?platform=web&ui=stripe-hosted)
use the saved connected-account scope.

The key is `grookai-order-v1:<attempt UUID>`; it never includes the lease fence.
Parameter bytes are deterministic. No current-time expiry or caller-provided
redirect enters the request. V1 return origins are fixed by mode: canonical
`https://grookaivault.com` or isolated test `http://127.0.0.1:20040`, with
`/account/orders/{orderId}?checkout=returned` for both outcomes. Return navigation
does not cancel stock or prove payment. Those buyer pages are still to be built.
Preserve this version's parameters when supporting additional hosts/policies;
introduce a persisted request version before changing behavior for active attempts.
Stripe can prune [idempotency keys after 24 hours](https://docs.stripe.com/api/idempotent_requests),
so the original attempt is retained and POST stops at 23 hours.

The create response is only a candidate identity. Current GET evidence verifies
the financial chain before durable binding. Binding precedes reconciliation and
link delivery. Retries of a bound session use GETs, not another POST. A URL must be
an open/unpaid/unexpired hosted session at the exact `checkout.stripe.com/c/pay`
path for that session, with expected return URLs and fixed pricing settings.
Fragment data is allowed because Stripe's hosted URLs use it. Final financial,
readiness and database checks precede delivery. A revoked grant/freeze or current
payment state cannot silently be bypassed by the old bound-session fast path.

These checks govern issuing/resuming links. They do not remotely expire a link
already delivered to a buyer; any resulting financial obligation must still be
reconciled. Provider cancellation/expiration policy is not introduced here.

## Recovery and reconciliation

`vendor_order_checkout_recovery_v1` may fence only an attempt whose creation already
started. It preserves its original identity/time and works after downgrade,
freeze, disabled acquisition or 23 hours. It grants no create authorization: the
existing creation RPC still rejects an old attempt. The private recovery method
takes a reviewed candidate session ID, verifies GET evidence against the stored
order/seller/attempt, binds it and reconciles. It returns no checkout link and
never clears a hold. No HTTP handler accepts candidate IDs or payment metadata.

`reconcileVendorOrderPage` is an explicitly invoked private sweep over durable
bound orders in platform/mode scope. It validates ordered UUID keyset pagination,
caps a page at 25 orders (default 10), and stops starting/continuing verification
when its 60-second budget is exhausted. Each provider request still has the SDK
timeout; an in-flight call can finish after the page deadline and then fails
freshness checks. Failed IDs and exact continuation cursor remain visible to the
operator. No signal is deleted or acknowledged. A new sweep may safely revisit
orders; callers must continue the cursor and retry failures rather than repeatedly
starting at the first page. This catches lost/pre-binding signals once the durable
session is bound. Unbound candidates require the separate recovery path.

No scheduler, worker activation, webhook route or automated operator command is
installed. Existing signed-signal verification, paid fact, review retention and
atomic stock rules remain unchanged. Fulfillment/refunds/disputes/payouts are
separate authorities; none are implemented by this adapter.

## Proof and release

Read the local proof and operations guide. Migration 403 adds only two private
functions; all 402 earlier files and 9,939 earlier schema objects remain unchanged.
Use the dedicated 200xx project and ordinary full hook. Keep all earlier projects.
Do not rerun completed preparation/baseline/reset tools. Remote apply still needs
normal PrePush, refreshed catalog dependency evidence and governed release.

Before activation: implement quote/tax/shipping/fee decisions, authenticated buyer
and desktop order journeys, HTTP/webhook/reconciliation runtime, actual Stripe
test account proof, abandonment/refund/dispute/payout/retention policies and release
validation. Roll back acquisition by disabling it; retain attempts, bindings,
financial history and old-obligation recovery. Never create a replacement attempt,
release ambiguous stock or restore consumed inventory to recover a failed request.
