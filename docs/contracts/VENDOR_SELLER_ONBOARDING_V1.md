# Vendor seller onboarding V1

This extends the committed durable binding foundation `d445c973` with an
authenticated desktop page, server orchestration and Connect event ingestion.
It adds no migration. All 400 migration hashes and earlier proof projects remain
unchanged. It does not implement buyer checkout, orders, refunds or payouts.

## Identity and provider authority

`/account/store/payments` is private. Its owner API derives the owner from verified
Auth and looks up their store on the server. Requests accept only `onboarding` or
`refresh`; IDs, controllers, destinations and client entitlement flags are rejected.
Cookie mutations require the exact site Origin. Responses are private/no-store
with no-referrer. Disabled processing still exposes the owner's bounded retained
binding status through the existing authenticated RPC.

Creating a seller account requires an immutable database reservation and a current
fenced lease. Preparation rechecks database rollout, active store access and
financial holds, then records the first creation time. Stripe platform identity
and actual Balance mode are checked before account creation. Retries use the same
parameters and platform/mode/attempt idempotency key. At 23 hours the attempt
requires recovery; it cannot silently allocate another account.

The returned account is independently retrieved before binding. Its identity,
controller, binding/attempt metadata, creation window and scoped Balance mode must
agree. Incomplete capabilities are expected during setup and do not block identity
binding. No business identity, country, bank detail or terms acceptance is invented.
No account quantity, inventory or entitlement is written by onboarding.

Private recovery can verify a reviewed existing account using GET requests only,
including an old attempt or a closing account. It retains closing/deauthorized
state. This is a service primitive, not a public recovery action or a completed
operator plan/apply workflow. Unknown account IDs still require investigation.

## Hosted onboarding and current status

Account Links are generated only after verifying the bound account. Return and
refresh destinations are fixed to the private desktop page. Links must use
`https://connect.stripe.com`, carry no userinfo/fragment and have valid expiry.
They are not stored, logged or sent outside the authenticated response.
Authorization and lease/state are checked again before delivering a link.

Returning from Stripe requests fresh provider readiness. It never confirms setup,
payment, an order, publication or a payout. Expired links require an explicit owner
retry. Provider failure clears any old UI readiness observation. A current ready
observation still does not authorize future checkout; checkout must independently
recheck binding state, package/publication, provider readiness and inventory.

The separate raw Connect webhook verifies SDK signatures, API version, mode and
connected-account scope before atomically enqueuing bounded event references.
Duplicate callbacks are idempotent. Deauthorization invalidates the database
binding/lease; refresh snapshots never grant readiness. Unrelated payment and
subscription events are ignored. Database failure returns retryable failure.
No scheduled seller reconciliation worker is added.

## Configuration and activation

Seller processing defaults off (`GROOKAI_VENDOR_PAYMENTS_ENABLED`). New onboarding
also requires `GROOKAI_VENDOR_ONBOARDING_ENABLED=true`, database onboarding rollout
and active database store access. The server must explicitly set
`STRIPE_SELLER_ACCOUNT_MODEL=direct_full_vendor_fees_v1` to enable onboarding.
This model uses full Dashboard, Stripe requirement collection/loss handling and
the seller paying Stripe fees. It is a reversible local implementation assumption;
the founder's fee/liability choice remains open before creating real accounts.

The existing Grookai Stripe platform, credential mode and distinct Connect webhook
secret remain required. Never put credential values in documentation, browser
configuration or receipts. Do not enable provider operations merely because local
tests pass. Real provider eligibility/model verification, seller financial closeout,
production migration/dependency gates and controlled release remain necessary.
Shipping and pickup remain working assumptions for later commerce, not implemented
by this change. Disable onboarding to stop new links; keep event handling available
for existing bindings where possible. Retain all seller data and obligations.

## Verification

Read `../audits/vendor_seller_bindings_v1/ONBOARDING_PROOF.md`. Tests replace the
entire Stripe SDK transport and use only the dedicated 188xx Supabase project.
Run API, browser and full-hook processes sequentially. Never rerun completed
schema resets or modify older proof projects. Browser enabled states are explicitly
synthetic; real local Auth/PostgREST service proof is recorded separately.

Provider references: [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding),
[account creation](https://docs.stripe.com/api/accounts/create),
[Account Links](https://docs.stripe.com/api/account_links/create).
