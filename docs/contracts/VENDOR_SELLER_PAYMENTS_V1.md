# Vendor seller payments V1 — provider boundary candidate

Current disabled desktop extension: `VENDOR_SELLER_ONBOARDING_V1.md`. This document
retains the earlier read-only boundary scope; provider activation remains separate.

The founder selected the existing Grookai Stripe account for subscriptions and
buyer checkout/payouts. Store URLs remain `grookaivault.com/store/{slug}`; custom
domains are deferred. This contract covers the seller payment authority, which
is independent of vendor subscription entitlements and manual sale/trade receipts.

## Implemented read-only boundary

`apps/web/src/lib/payments/vendorSellerPolicy.ts` projects current Stripe evidence
into a private versioned readiness result. Its binding includes an opaque binding
ID, owner, store, platform account, connected account, environment and expected
controller configuration. The gateway requires the authenticated owner and checks
that binding before any provider request. These inputs must eventually come from
immutable server storage, never browser-supplied account IDs or metadata.

`vendorSellerStripeGateway.ts` uses the existing pinned Stripe 22.6.2 SDK and
`2026-08-26.dahlia` API version. It retrieves the platform account, the exact bound
connected account, and Balance under that connected-account request header. V1
Account has no `livemode`; the scoped Balance read supplies independent mode
evidence. The output contains no balance amounts, identity fields, bank details,
provider error messages or individual verification field names.

Readiness requires exact expected controller responsibilities/dashboard, platform
control, submitted details, enabled charges and payouts, active `card_payments`
and `transfers`, complete requirements evidence, no disabled reason, no current or
past-due requirements, and no pending verification. Current requirements block
even during Stripe's grace period. Future threshold requirements alone do not
block. Unknown fields/statuses fail closed. An observation taking 60 seconds or
longer fails; its timestamp is request start. A failed read never falls back to a
previous ready result.

This is provider capability evidence, **not checkout authorization**. The eventual
checkout service must retrieve current evidence again and independently enforce
store publication, current grants, exact-copy/custom-stock eligibility, atomic
reservations, server prices and financial/account suspension. No browser return,
saved snapshot, client flag or signed event body can enable checkout by itself.

## Connect signals

The bounded raw-body verifier uses a separate Connect webhook secret, pinned API
version and event mode. It rejects platform events, organization-context events,
foreign account payloads, future event creation timestamps and invalid signatures.
`account.updated` produces only a refresh signal. An
`account.application.deauthorized` signal requires binding invalidation in the
future durable handler. Other event types cannot become readiness or payment
confirmation. Subscription callbacks remain under their existing authority.

No Connect HTTP route or durable inbox is exposed yet. Signature verification is
not deduplication, account ownership proof or an ordered event ledger. The future
handler must resolve a stored scoped binding, persist a uniquely keyed event,
fence reconciliation and re-read current provider state. Deauthorization must
prevent sales, including races with account refresh or checkout.

## Configuration and unresolved model

The reader defaults disabled unless `GROOKAI_VENDOR_PAYMENTS_ENABLED=true`.
Enabled configuration requires `STRIPE_PAYMENTS_MODE=test|live`, the existing
`STRIPE_SECRET_KEY` and `STRIPE_ACCOUNT_ID`, and a separate
`STRIPE_CONNECT_WEBHOOK_SECRET`. Subscription activation does not enable this
reader. No environment flag currently exposes an onboarding/checkout route.

The fee payer, charge model and fulfillment choices are awaiting founder input.
The policy compares controller fields against its supplied **server binding**;
it does not choose a business model, create an Express/Standard account, impose
a commission, or accept financial liability. Synthetic full-Dashboard and Express
fixtures prove matching only, not approval of either model. Do not provision a
seller until model, durable binding and closeout obligations are implemented.

## Next implementation and release gates

The durable SQL foundation is now covered by `VENDOR_SELLER_BINDINGS_V1` and its
separate proof. It supplies immutable bindings, attempts, fenced leases, event
references and closeout protection. No HTTP/provider orchestration is connected
yet; the following steps still require end-to-end implementation and evidence.

1. Durable owner/store/account binding, fenced creation attempts, ambiguous-create
   recovery and deletion/financial-obligation preservation, with fresh strict
   schema preflight and an isolated local replay project.
2. Authenticated desktop onboarding, protected single-use hosted links, safe
   return/refresh routing and current provider readback; event inbox/reconciliation.
3. Reservations shared with manual disposition/archive/transfer, server-priced
   buyer checkout, immutable orders, signed payment ledger and late-payment handling.
4. Shipping/pickup, refunds, disputes, payout reconciliation and retained order
   access independent of subscriptions, followed by actual Stripe test evidence.

Local transport tests do not prove account/platform eligibility, actual onboarding,
payment or payout behavior. Existing production migration/catalog, provider access,
pilot and release gates remain open. No new schema, route, worker or provider
resource is activated by this boundary. Preserve all existing proof environments.

## Primary provider references

- [Stripe-hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding):
  returning from onboarding does not prove completion; links are temporary and
  must only reach the authenticated account holder.
- [Account object](https://docs.stripe.com/api/accounts/object): controller,
  capabilities and requirements fields.
- [Balance object](https://docs.stripe.com/api/balance/balance_object): environment
  evidence on the connected-account request.
- [Connect charge types](https://docs.stripe.com/connect/charges): fee/loss and
  payment-location choices require an explicit model.

See `../audits/vendor_seller_payments_v1/PROOF.md` for exact local evidence.
