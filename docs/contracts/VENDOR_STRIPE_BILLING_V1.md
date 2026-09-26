# Vendor Stripe billing V1 — implementation in progress

September22 actual-provider update: the existing account's test lifecycle passes
through hosted checkout/portal and test-clock renewal/failure/recovery/cancellation.
Read `../ops/STOREFRONT_STRIPE_ACCOUNT_20260922.md`; older no-resource notes below
describe the original implementation. Portal reads explicitly expand the allowed
product list. Cancellation projection also recognizes `cancel_at` equal to the
single item's current period end; Stripe's legacy boolean can remain false.
Neither change weakens invoice verification or permits automatic publication.

The founder selected the existing Grookai Stripe account for vendor subscriptions
and buyer payments. Custom domains are deferred. This branch adds billing after
the browse-only release; it must not be folded into the frozen release migration.
Existing Vendor Mode access remains unchanged.

## Implemented, locally tested provider boundary

`apps/web/src/lib/billing/vendorSubscriptionPolicy.ts` resolves a server-retrieved
subscription and its latest invoice to a time-bounded capability proposal. Only
the configured USD $30/month and $50/month licensed prices, quantity one, qualify.
The $30 plan enables `store_app`; $50 enables both store features. Missing,
truncated, foreign, unpaid or mismatched invoice evidence fails closed. Scheduled
cancellation preserves only the verified remaining paid period. No trial or unpaid
grace period is implemented; this policy must be reflected in the eventual billing UI.

`vendorStripeGateway.ts` uses exact SDK version 22.6.2 and API version
`2026-08-26.dahlia`. It verifies the raw body with Stripe's SDK, binds environment
and account, creates idempotent hosted subscription checkout with server-selected
prices and fixed return paths, and reads current provider state for reconciliation.
Connect events cannot grant subscription access. Checkout completion grants nothing.
The authenticated owner and signed webhook routes now invoke this boundary. No
remote prices, customers or subscriptions exist as a result of this implementation.
Required credentials are documented before use.
`vendorStripeServer.ts` is the `server-only` environment-reading entry point and
constructs a client lazily; no provider resource is touched during import/build.

`vendorStripeEnrollment.ts` retrieves the stored checkout session and its actual
bounded line items. Customer, immutable attempt reference, account/mode, original
package and subscription state must agree before it returns enrollment evidence.
Metadata and `payment_status` do not grant capabilities. Open sessions recover only
the Stripe-hosted URL; expired/recovered/mismatched sessions cannot enroll another
subscription. Customer creation uses an opaque durable-attempt idempotency key,
without resolving ownership by email. Ambiguous customer or checkout creation
attempts at least 23 hours old stop for recovery before any provider call, keeping
retries inside Stripe's minimum 24-hour key retention. Durable attempt reservation
and enrollment commit are connected through `vendorBillingService.ts`.

## Durable foundation, locally tested

Draft migration `20260919080000` adds owner/customer bindings, checkout attempts,
a uniquely keyed event inbox and service-only mutation functions. Binding is
immutable within the verified platform account/environment. Durable customer and
checkout attempt IDs survive retries. A completed but unenrolled checkout still
blocks another checkout. No event or completed checkout grants store access.

Customer leases expire after 120 seconds and advance a monotonic fence. Repeating
the same claim does not extend it; every subsequent mutation checks its token,
fence and deadline while holding the account row lock. Anonymous/authenticated
clients cannot read the base tables or execute these mutation functions. Deleting
an authenticated account with a billing binding is restricted until a separately
implemented financial closeout removes that binding. Do not enable account billing
before the closeout and retained-order obligations are handled.

The full 397-migration local reset, rollback behavior/idempotence and separate
connection race tests pass on the dedicated 176xx project. Four races observe
actual database lock contention. The original foundation retained all 9,494 preceding
schema objects. The later paid projection deliberately replaces two existing
function bodies while preserving their security metadata. Billing is not activated.

## Paid-access projection, locally tested

The same draft adds separate paid-plan/from/through fields to `user_entitlements`;
it never overwrites manual tier/role/features. A composite owner binding prevents
moving the paid contribution to another account. Database-time reads expire it
without a timely webhook. The web and public GVVI readers consume the effective
database record; manual fallback supports deployment before the additive schema.

The service-only projection commit validates the lease, customer and stored checkout
identity, then commits enrollment, paid contribution, publication suspension and
event processing together. It rechecks the lease after lock waits. Old subscription
events and processed duplicates cannot overwrite the current grant. Downgrades and
payment gaps suspend affected publication; upgrades never republish. Independent
manual/founder grants survive cancellation. Operator suspension remains enforced.
Read `../audits/vendor_stripe_billing_schema_v1/PROJECTION_PROOF.md` for exact SQL,
concurrency and web-reader receipts. The orchestration revision below supersedes
that historical schema hash without overwriting its receipts.

## Checkout, webhook and desktop orchestration

`/api/vendor-billing/owner` authenticates the user, checks mutation origin and a
bounded exact-key action body, and returns private uncached responses. Owner,
customer, price, subscription and redirect identifiers cannot be supplied by clients.
`/api/vendor-billing/webhook` verifies the bounded raw body through the pinned SDK.
Ownership comes from a previously bound customer; metadata is never authority.
Failed processing returns 503 for provider retry and retains a bounded failure code,
attempt count and exponential retry deadline. A failed callback cannot release a
successor's lease or overwrite its access.

Checkout validates rollout, entitlement ownership and suspension before any provider
call. Active legacy email grants require binding instead of a shadow grant. The
lease precedes provider reads; creation uses durable attempts and stable idempotency
keys. Known sessions resume. Ambiguous unbound attempts stop at 23 hours. Only
retrieved checkout, current subscription and paid invoice evidence can reach the
atomic projection. Redirects and checkout completion alone grant nothing.

`/account/store/billing` adds desktop package selection, pending checkout recovery,
payment refresh, cancellation status and Stripe billing/receipt management. The
portal requires an explicitly configured existing configuration: the two configured
prices only, quantity changes disabled, price-only updates with immediate invoicing,
end-of-period cancellation, payment method updates and invoice history. No portal
configuration is created automatically. Test mode is prominently labeled.

`GROOKAI_VENDOR_CHECKOUT_ENABLED` separately controls new checkout.
`GROOKAI_VENDOR_BILLING_ENABLED` controls processing and must remain enabled after
paid enrollment even when new sales are paused. Publication remains explicit.

## Bounded reconciliation and operations

`backend/billing/vendor_billing_reconcile_worker_v1.mjs --once` runs one bounded
pass through the shared webhook service. It reads at most 25 due events and 25
due accounts, processes each owner once, and stops dispatching after 60 seconds.
An already-running provider verification finishes under its existing lease; the
worker does not race a timeout against an unfinished database commit. The run
record must be created before any provider work. Results and safe failure codes
are persisted in private `vendor_billing_reconcile_runs`.

Successful projection schedules the next check in 15 minutes. Open checkouts poll
after five minutes; failures back off from one minute to six hours. Database-time
queues honor those deadlines and skip active leases. Account reads still expire
paid access immediately even if the scheduler is unavailable. Failed event and
account reconciliation never infer a paid grant. Unbound old creation attempts
require operator recovery and cannot create new provider resources in this worker.

`--health` is scoped and read-only, reports pending age, failed/recovery accounts,
stale runs and last-run state, and makes no provider call. A terminated process
leaves a visible started run; after 15 minutes it is stale, and the next run records
`worker_abandoned`. Terminal runs cannot be overwritten by late completion.
No raw provider message, payment data, credential or personal identity is logged.

Dispatch additionally requires `GROOKAI_VENDOR_BILLING_RECONCILIATION_ENABLED=true`
and billing processing enabled. Checkout may remain disabled. The executable
rejects user-token overrides and test/live database mismatches. It registers no
schedule. Governed deployment should dispatch every five minutes and alert on
stale/failed runs or increasing pending age; activation remains a release step.

## Remaining integration and activation evidence

Private financial closeout is implemented in `vendorBillingCloseoutService.ts` and
`vendorStripeCloseout.ts`. It requires a verified support-ticket hash and a fenced
lease, freezes both publication destinations and new billing, and checks the lease
before provider mutations. Only bound checkout/subscription identities may be
expired/canceled; unknown resources, incomplete lists or ambiguous creation stop
the flow. Cancellation creates no prorations or invoices. Independent readback
checks open/draft invoices, invoice items, expanded credit/cash balances and paid
time. Those obligations remain explicit review reasons, not automatic refunds.

The archive requires recent verification, no pending checkout/review/financial
hold, the matching request and a current lease. It locks Auth before checking holds
so concurrent hold creation cannot slip through. The archive has no Auth foreign
key and retains only selected financial fields with a hashed owner fingerprint.
Archived owners cannot recreate billing. Auth/Storage removal remains a separate
reviewed operation, and the account-deletion policy refuses billing/hold references.
Future buyer commerce must write these financial holds and preserve order access;
the hold table does not implement order fulfillment or payouts.

- Governed worker deployment/scheduler activation and actual provider recovery proof.
- Financial review resolution and investigation of unknown resources or missing
  original creation evidence. The private closeout and known-resource recovery
  commands are locally implemented; they are not a complete account-removal workflow.
- Existing-account Stripe test-mode lifecycle evidence, reviewed portal resources,
  native subscription entry/navigation and the complete billing repository gate.

See the current checkpoint for exact SQL, API and website receipts and their
distinction between synthetic provider evidence and actual Stripe verification.
The isolated source branch has a
draft migration and no production change. Retain 164xx native, 168xx release and
172xx reconciled-baseline proofs; billing runtime work uses only 176xx.

The private closeout command defaults to read-only planning, binding the request
ticket/target fingerprints, provider scope, exact financial state and implementation
hash. Its 15-minute plan requires matching argument/environment acknowledgement
plus separate closeout enablement to apply. State is read again under the fenced
account lease before any publication freeze or provider mutation. A wrong provider
scope cannot masquerade as an account without billing. Artifacts contain bounded
action/review summaries and hashes, not raw account/payment identities. See
`../ops/VENDOR_BILLING_CLOSEOUT_V1.md`; no force or financial-review waiver exists.

Private creation recovery verifies the original server-owned attempt against a
reviewed existing customer/session. Customer metadata must contain its immutable
attempt marker; checkout requires the retrieved original reference, correct customer,
package line items and status. Both require creation inside the original attempt
window, even when recovery occurs after idempotency retention. Read-only planning
and separately acknowledged apply recheck under the account lease. Existing binding
RPCs and independent readback persist identity only; no provider mutation, paid grant
or publication occurs. Already-closing accounts stay frozen. Fresh plans recognize
an already-bound resource without writing. Unknown IDs or missing original evidence
remain manual-investigation cases, never replacement creation or email matching.
See `../ops/VENDOR_BILLING_RECOVERY_V1.md`.

## Separate buyer commerce boundary

Seller Connect onboarding, charge model/fees, exact-copy and custom-stock reservations,
server-priced checkout, order snapshots, shipping/pickup, payment ledger, refunds,
disputes and payout reconciliation are still required. Subscription cancellation
must never remove access needed to fulfill/refund existing orders. Do not route
seller events through the subscription endpoint or equate manual disposition with
confirmed payment.

## Reference and rollback

Provider references inspected September 19, 2026:
[webhooks](https://docs.stripe.com/webhooks),
[subscription events](https://docs.stripe.com/billing/subscriptions/webhooks),
[subscription object](https://docs.stripe.com/api/subscriptions/object),
[invoice object](https://docs.stripe.com/api/invoices/object).
Enrollment references: [retrieve checkout](https://docs.stripe.com/api/checkout/sessions/retrieve)
and [idempotent requests](https://docs.stripe.com/api/idempotent_requests).
Closeout references: [subscription cancellation](https://docs.stripe.com/billing/subscriptions/cancel),
[expire checkout](https://docs.stripe.com/api/checkout/sessions/expire), and
[customer balance fields](https://docs.stripe.com/api/customers/object).

Billing defaults disabled. Future rollback must stop new checkout while retaining
signed event processing, reconciliation, cancellation access and existing order
obligations. Disabling payment verification for already-paid customers is not a
safe rollback. Do not delete additive billing records or mutate Vault ownership.
