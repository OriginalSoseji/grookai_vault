# Vendor checkout evidence V1

Private, read-only prerequisite for authoritative order settlement. This candidate
does not create orders, payment attempts, Checkout Sessions or ledger rows, and
does not consume/release stock. No endpoint or worker invokes it. All 401 migrations
and the disabled stock rollout remain unchanged.

## Immutable order input contract

The future order repository must load `CheckoutOrderBinding` from persisted,
server-owned records, never from browser input or webhook metadata. The projection
binds buyer, order, reservation, creation attempt, seller/account/mode, exact
Checkout Session ID and creation time, any bound PaymentIntent, order revision and
stock state. It includes USD integer unit price, quantity, shipping and tax totals.
The total is derived from those fields and bounded to Stripe's eight-digit amount.
The creation timestamp must belong to the original bounded idempotency attempt;
an ambiguous old attempt must be recovered, not silently recreated.

This input contract is not an implemented order repository. Shipping, tax and fee
policy still require their own authoritative finalized quote path. A provider/client
total must not simply be copied into an expected amount to make verification pass.
One fixed-price line, USD, card payments, explicit automatic capture, no discounts,
no subscription/Payment Link, no destination transfer and no application fee are
the currently supported local evidence model. Other models require separate
implementation and tests. These restrictions do not change browse-store behavior
or approve the pending fee/fulfillment choices for activation.

## Current provider evidence

`readVerifiedCheckoutEvidence` uses the existing pinned Stripe SDK and API version.
Every request is GET-only. It verifies the actual platform account and Balance
mode, connected-account identity and scoped Balance mode, then reads the bound
session, its bounded line items, PaymentIntent and latest charge. All connected
resources use an explicit `Stripe-Account` request scope.

The resource chain must agree on immutable IDs, metadata correlation, mode,
currency, integer totals, line quantity/unit price, creation time and direct-charge
semantics. Correlation metadata never establishes ownership or selects an order;
the stored session/attempt binding is the authority. Unknown, incomplete or
mismatched evidence fails closed. Truncated/multiple line items cannot be treated
as the expected single product.

The financial chain is read twice within 60 seconds. A changed observation,
reversed clock, provider failure or changed input produces no proof. This is not
an atomic Stripe/database transaction; the subsequent ledger transaction and
ongoing refund/dispute reconciliation remain necessary. Seller readiness and paid
store access are deliberately not prerequisites for reading an existing payment:
a downgrade or payout restriction cannot erase an obligation.

| Observed result | Private recommendation |
|---|---|
| Complete paid session, succeeded intent, exact amount received and captured charge | Consume a still-pending stock claim |
| Same payment against already-consumed stock | No second consumption |
| Full/partial refund, dispute, contradictory session or payment after stock release | Retain the paid fact and require review; no automatic consumption |
| Expired unpaid session with no intent, or canceled zero-received intent and no successful charge | Release a still-pending claim |
| Unpaid result against consumed stock | Review; no stock restoration |
| In-progress, authorized-only, missing capture or inconsistent payment evidence | Retain claim; no settlement recommendation |

The local reservation deadline, Checkout redirect and event name never establish
payment or safe release. A manually expired session need not wait for its original
deadline. A retryable PaymentIntent or open session is not terminal unpaid evidence.
Stripe recovery links are excluded so they cannot revive a released claim.

Results contain a narrow private financial summary, IDs and evidence hashes, with
no customer/address, client secret, card, receipt or banking details. They are
registered in a process-local WeakMap. `requireVerifiedCheckoutEvidence` accepts
only the original unchanged result, within 60 seconds, for the same order revision
and scope. Copied or JSON-supplied proofs fail. This guards trusted application
callers from accidentally accepting serialized client input; it is not an external
signature, a durable payment ledger or database authorization.

## Signed wake-up signals

`verifyCheckoutSignal` verifies the raw body/signature using the separate Connect
secret, size/time limits, pinned API version, account and mode. Recognized session
and PaymentIntent events return only event ID, account/mode, creation time and
resource ID. Routing must look up a pre-existing durable binding by that scope and
resource ID. Event metadata, a vendor ID, a success page and telemetry cannot create
an order or credit. Subscription/account/payout/refund events remain in their own
authorities. A duplicate signal has the same key for the future atomic inbox; no
inbox or concurrency deduplication is claimed in this candidate.

## Required next integration

Implement immutable orders, line snapshots and durable creation attempts; an
append-only scoped event inbox; and a locked idempotent settlement/release RPC.
The transaction must reload the persisted revision and stock state, accept only
fresh verified evidence, and reconcile the existing reservation exactly once.
Payment arriving after release must retain financial evidence for resolution and
must not consume someone else's stock. Provider errors and contradictions must
remain retryable/reviewable rather than discarding obligations.

Checkout creation, buyer/desktop order surfaces, fulfillment, refunds/disputes,
payout reconciliation, retention/closeout and actual Stripe sandbox proof remain
open. No public route or environment switch activates this module. Keep stock
creation disabled until that full authority exists. Rollback is to stop new entry
points while retaining all stock/financial records and guards.

Primary references: [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment),
[Session object](https://docs.stripe.com/api/checkout/sessions/object),
[PaymentIntent cancellation](https://docs.stripe.com/api/payment_intents/cancel),
[Charge object](https://docs.stripe.com/api/charges/object).
Read the [local proof](../audits/vendor_checkout_evidence_v1/PROOF.md).
