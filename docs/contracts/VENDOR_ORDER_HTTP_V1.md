# Order HTTP boundaries V1 — disabled local candidate

Source baseline `d79acf6a6939a77551f992cab127e934ce540dfc`. Extends the existing
orders, checkout creation and order UI contracts. All 403 migrations remain exact.
No provider resource, live credential, payment, scheduler or deployment is created.

## Three independent operations

| POST route | Authority | Behavior |
| --- | --- | --- |
| `/api/vendor-orders/checkout` | Exact same origin and server-verified buyer Auth | Accepts only a persisted order UUID. Calls governed preparation, scoped creation/resume and verification. Never accepts price, quote, quantity, seller, buyer, return URL or payment proof. |
| `/api/vendor-orders/webhook` | Separate order endpoint signature and strict platform/account/mode/API-version envelope | Retains an immutable scoped resource signal before acknowledgement. Does not fetch provider state, consume stock or infer payment. |
| `/api/vendor-orders/reconcile` | Dedicated 64-character lowercase hexadecimal operator secret, constant-time comparison | Bounded retained-binding page or explicit failed-order retry. Reads current provider evidence and applies the existing atomic ledger boundary. |

GET cannot mutate any operation. Responses are private/no-store with Cookie and
Authorization variation and no-referrer. Unknown provider/storage errors are
redacted. Browser return and event metadata never establish ownership or payment.

Checkout takes an existing service-created order; it does not expose reservation,
quote or order creation to buyers. SQL independently verifies that exact buyer and
all current acquisition boundaries. Even an existing Checkout URL must pass that
check. Only the validated Stripe hosted URL or a narrow reconciled result returns.

The acquisition flag is `GROOKAI_VENDOR_ORDER_CHECKOUT_ENABLED`, separate from
subscription checkout. This candidate permits it only with
`GROOKAI_VENDOR_ORDER_QUOTE_POLICY=local-synthetic-pickup-v1`, test-mode credentials,
the isolated local staging flags, API alias15439 and web20040. Live mode and hosted
deployments always reject it. This is an honest restriction: production tax,
shipping, fee, quote expiry and buyer confirmation policy are not implemented.
No browser purchase button is enabled by this change.

## Retained notifications and reconciliation

`GROOKAI_VENDOR_ORDER_EVENTS_ENABLED` and
`GROOKAI_VENDOR_ORDER_RECONCILIATION_ENABLED` enable independent obligation lanes.
They reuse the existing Stripe key/account/mode authority but require a distinct
`STRIPE_ORDER_WEBHOOK_SECRET`, never the seller-account endpoint secret. They do
not depend on seller onboarding, subscriptions or acquisition flags. All default
off. Missing/malformed configuration fails closed before work.

The webhook keeps the bounded signed UTF-8 payload intact through verification.
Invalid signatures/envelopes return400; unavailable durable retention returns503
for retry; stored or irrelevant valid events return200 without order IDs. Concurrent
duplicate signals use the existing database unique key. Pre-binding events remain
retained, and full reconciliation sweeps revisit bound orders even if no callback
arrives. A200 acknowledges signal retention, not payment or fulfillment.

The operator credential is `GROOKAI_VENDOR_ORDER_RECONCILE_TOKEN`. Cookie sessions,
client entitlement flags, Stripe signatures and URL credentials never grant this
operation. Authenticate before runtime creation. Request bodies are capped at512
bytes; webhook bodies at256KiB. No arbitrary RPC or provider target is accepted.
Reconcile `{after?,limit?}` defaults to10, max25. A page returns attempted success/
failure IDs and the cursor of the last attempted ID. Failed IDs or a time budget
exhaustion return503 with that structured retry information. `{orderId}` retries
one known obligation. A scan's `complete` means the selected page was traversed,
not that every order succeeded. Never discard failed IDs when advancing a cursor.

The existing sweep budget is60 seconds between operations; an in-flight provider
request can finish later. Endpoint maximum duration is120 seconds. Abrupt timeout
is safe to retry: signals and verified order changes are durable/idempotent.
There is no scheduled task or persistent operator cursor in this candidate.
Production release requires a separately provisioned, monitored complete sweep
with durable retry/cursor handling, including recurring passes over old orders.
Current event kinds cover Checkout and PaymentIntent signals. Refund/dispute
changes are detected by current-resource sweeps; dedicated event coverage remains
part of the later refund/dispute workflow. Unbound ambiguous sessions still require
the private reviewed GET recovery path, never a replacement attempt.

## Primary references and release

Stripe requires signature verification against the untouched request body and
documents duplicate/out-of-order delivery in its [webhook guide](https://docs.stripe.com/webhooks).
Connected-account events carry account scope as described in
[Connect webhooks](https://docs.stripe.com/connect/webhooks). No SDK/API version is
changed here. These references inform transport handling, not payment authority.

Read the operations guide and proof before local tests. Keep rollout disabled;
preserve the fixed200xx and prior projects. Rollback disables new acquisition and
reverts clients/routes while retaining order/stock/evidence data and a reviewed
obligation reconciliation path. Do not erase financial records or restore consumed
stock. Provider proof, policy, worker deployment, fulfillment/refund/payout and
production integration remain separate release gates.
