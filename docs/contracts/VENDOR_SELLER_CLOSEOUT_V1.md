# Vendor seller closeout V1 — retained-data freeze and review

This adds private support operations over the existing seller binding, lease,
freeze and financial-hold tables. It adds no schema, route, scheduled worker or
owner deletion action. All 400 migration files remain unchanged. Seller-paid fees
and the full Dashboard controller remain local working assumptions, not approval
to activate real seller accounts.

## Financial evidence

The read-only reviewer verifies the platform account, platform Balance mode,
bound seller account/controller and connected-account Balance mode. Every financial
list request carries the same connected-account scope. Refund V1 has no livemode
field; it is not invented. Available, pending, reserved, instant, issuing and
refund/dispute prefunding balances are validated where present. Nonzero source
balances cannot be hidden by offsetting totals or currencies.

PaymentIntents, refunds, disputes, payouts, Checkout Sessions and charges are
scanned sequentially, at most five pages of 100 per resource type. Missing, malformed,
duplicate, wrong-mode or unknown-status evidence fails closed. A remaining page
sets an explicit incomplete-inventory reason. A 60-second deadline prevents stale
observations. Balances are read before and after; changes require review. Failed
refunds/payouts, open or unpaid sessions, pending payments, uncaptured/disputed
charges and unresolved disputes remain review items.

Only counts, reasons and a hash of narrow identity/financial evidence leave the
reviewer. Raw provider objects, buyer/merchant details, bank destinations and
resource IDs are not written to plan artifacts. No status or zero-balance result
authorizes deletion. The scan is not an atomic provider snapshot and does not cover
every possible Stripe product. Full-Dashboard sellers can act outside Grookai.
Unbuilt local order/fulfillment/refund/dispute reconciliation and future claims
always require retained records. `deletionPermitted` is always false.

## Reviewed local freeze

The private request contains an independently verified owner UUID, one stable
closeout UUID and a support ticket reference. Planning performs reads only. Plans
bind the target, provider scope, request, exact implementation/schema hashes,
durable binding, holds and financial evidence. They expire after 15 minutes.
No raw owner, seller or ticket reference enters the plan/result artifact.

Apply requires the exact reviewed digest both as an argument and a separate
environment acknowledgement. It rereads the plan, claims the existing fenced lease,
rechecks the plan under that lease and calls the existing freeze RPC. Freeze records
the closeout ID, moves the binding to closing and invalidates in-flight workers.
New account creation/onboarding cannot resume. All obligations, holds, balances,
Auth/store records and ownership remain retained. A concurrent new hold remains
intact; this operation cannot clear it or authorize final removal.

A lost freeze response may be recovered only against the same immutable closeout
request. It performs no second provider operation or deletion. Foreign scope,
changed evidence, stale plans, competing leases and different closeout requests
fail closed. An ambiguous account-creation attempt may be frozen for investigation
without creating another account; read-only identity recovery remains separate.
An explicitly deauthorized binding can be frozen without pretending provider
evidence is available.

## Provider and release boundary

Both plan and apply are GET-only at Stripe. They never cancel a merchant's payment,
issue refunds, pay out funds, disconnect access, accept terms or delete its Stripe
account. A local freeze does not stop activity in the seller's Stripe Dashboard.
Current Stripe rules do not permit API deletion of live full-Dashboard accounts
where Stripe handles negative balances. Even in test mode this worker cannot
delete provider resources.

The command defaults disabled and has no schedule. Test scope is fixed to the
188xx project; live scope must be the canonical project and verified live credential
mode. Production use still requires existing schema/catalog, provider/model and
operations review gates. A local proof is not production authorization.
See `../ops/VENDOR_SELLER_CLOSEOUT_V1.md` for the exact operator workflow and
`../audits/vendor_seller_bindings_v1/CLOSEOUT_PROOF.md` for receipts.

Remaining: completed order/financial ledgers, fulfillment/refund/dispute resolution,
retention policy, subscription-closeout coordination, any eventual reviewed
disconnect or Auth removal, real Stripe evidence, reservations/checkout and release.

Primary references: [Balance](https://docs.stripe.com/api/balance/balance_object),
[Refund](https://docs.stripe.com/api/refunds/object),
[Dispute](https://docs.stripe.com/api/disputes/object),
[Payout](https://docs.stripe.com/api/payouts/object),
[Account deletion](https://docs.stripe.com/api/accounts/delete).
