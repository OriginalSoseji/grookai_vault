# Vendor stock reservations V1

Locally tested foundation for the requested buyer checkout; not an activated
commerce service. The authoritative stock remains `vault_item_instances` for an
exact physical copy and `vendor_store_custom_products.available_quantity` for a
custom product. Reservations record temporary claims and a server-read offer,
never replacement ownership or an editable second stock quantity.

## Authority and lifecycle

`vendor_stock_reserve_v1` is service-only. A future authenticated buyer handler
must derive the buyer identity from its verified session; no public reservation
endpoint exists in this candidate. Neither authenticated owners nor buyers can
read or mutate the base reservation/rollout tables. Even the service role has no
direct reservation INSERT/UPDATE/DELETE grant. The new database rollout defaults
false and must remain false until the order/payment integration is complete.

The request has a durable UUID, one store, a buyer, and exactly one exact-copy or
custom-product target. Copy quantity must be one; custom quantity is 1–100. A buyer
can hold at most ten active requests per store. The same UUID and exact request
recover the same row, including a released or expired request. A changed request
under that UUID fails. Retry does not refresh a deadline or authorize payment.

Creation checks the published web destination, active database store_web grant,
store rollout, non-self buyer, and a bound non-closing seller. Exact copies use the
existing quarantine-aware printing, canonical visibility, sharing, asking-price,
ownership and explicit-selection boundary. Custom items require existing governed
publication eligibility and enough unreserved stock. No market value, printing,
canonical identity or artwork is inferred. The narrow offer snapshot captures the
current asking amount and identity, not payment or ownership evidence. This initial
payment foundation accepts USD with two decimal places; other browse currencies
remain unchanged and need explicit payment currency handling before checkout.

| State | Stock claim | Allowed transition here |
|---|---|---|
| held | Until the database-generated 120-second expiry | released, payment_pending |
| payment_pending | Indefinite until authoritative reconciliation | None in this foundation |
| released | None | None |

`vendor_stock_start_payment_v1` must commit **before** any payment-provider create
request. It rechecks listing, profile, package, quarantine, publication and seller
state while holding the stock row. The reservation UUID will anchor the durable
payment attempt. A repeat call recovers the same state/timestamp; it is not a new
authorization to call Stripe. Provider readiness, exact platform/account/mode,
creation lease and immutable order authority must still be checked by the future
payment service. No provider request is made by any function in this migration.

`vendor_stock_release_v1` can release only pre-provider holds, including expired
ones, independently of subscription or rollout state. Released rows and snapshots
are retained. Clock expiry and a browser cancellation never release payment-pending
stock. This deliberately leaves settlement and provider-confirmed terminal release
to the forthcoming payment/order ledger. There is no consume, paid, refunded or
ownership-transfer transition in this candidate.

## Shared mutation boundary

All new operations lock in this order: request advisory lock when needed, store,
seller, physical stock, reservation. Cancellation takes only physical stock then
reservation. Existing manual disposition, archive, bulk archive and interaction
transfer writers already lock or update the physical stock row. New BEFORE
triggers read committed claims without acquiring a reservation-row lock.

A held copy cannot be archived, deleted, transferred, repriced, reassigned or
have its protected identity/condition/intent changed. A held custom product cannot
be archived, deleted or have its offer changed; quantity can only be adjusted to
at least the total active claims. Unpublication and privacy controls remain usable.
Store owner/currency changes are guarded too. Ordinary unaffected stock retains
legacy behavior. No existing function or canonical writer is replaced.

The boundary requires READ COMMITTED for reservation operations and protected
stock changes. This is deliberate: a transaction using an old repeatable-read
snapshot must not overlook a newly committed reservation. VOLATILE trigger queries
take fresh command snapshots after row-lock waits. Higher-isolation callers receive
`stock_requires_read_committed` and must retry in a new READ COMMITTED transaction.
Concurrency tests cover a direct UPDATE begun before a competing reservation
commits, as well as both manual-sale/reservation commit orders.

## Retention, integration and release

Reservation IDs, parties, stock references, quantities, offers and timestamps are
immutable. Restrictive foreign keys retain buyer/seller/store/stock references.
Expired reservations therefore need a separately reviewed retention/closeout path;
this foundation does not authorize account erasure. Payment-pending holds must be
included in future seller resolution and order reconciliation. Existing seller
freeze prevents new handoff but does not release prior claims.

Current browse DTOs remain unchanged. Checkout availability, buyer rate limits,
multi-item atomic carts if offered, complete order snapshots, tax/shipping totals,
fulfillment, refunds, disputes, payout reconciliation and verified provider terminal
release remain unimplemented. A reservation snapshot is not the immutable order
ledger. The earlier independent provider/fee/fulfillment/pilot questions remain open.

The additive migration introduces triggers/dependencies on existing stock/store
relations. Recheck current main and frozen catalog repair dependency fingerprints
before integration or remote apply. Local replay is not PrePush authorization.
Disable creation and provider entry points for rollback, retain rows/triggers and
resolve existing payment-pending holds; never drop protection to unblock a sale.

References: [PostgreSQL function visibility](https://www.postgresql.org/docs/17/xfunc-volatility.html)
and [Stripe Checkout expiry](https://docs.stripe.com/api/checkout/sessions/expire).
The local 120-second preparation hold is not a Stripe Checkout Session deadline.

Read [operations](../ops/VENDOR_STOCK_RESERVATIONS_V1.md) and
[proof](../audits/vendor_stock_v1/PROOF.md) for exact targets and receipts.
