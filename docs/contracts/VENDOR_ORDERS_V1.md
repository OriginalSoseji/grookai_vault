# Vendor orders V1 — private local candidate

Source baseline: `f8ddf34ccae68349845f5712aa48505f2314bdc8`.
This extends the stock reservation and checkout evidence contracts. It enables no
buyer checkout, provider creation, webhook endpoint, scheduler or production use.

## Authority and persistence

`vendor_order_create_v1` derives the immutable offer, unit price, quantity, buyer,
owner and seller scope from a locked reservation. One order and one durable
creation attempt are allowed per reservation. A repeated exact request recovers
the same record; changed quote/request identity fails. The order and payment claim
commit together. Creation defaults disabled by `vendor_orders_rollout`.

The service-only quote reference, shipping/tax minor amounts and fulfillment mode
are immutable inputs, not a public pricing API. A future server quote policy must
derive and authorize them before creation. Current fixtures use synthetic zero-tax
pickup quotes; they do not approve production tax, shipping, platform fees or
seller fee liability. Amounts are USD, integer minor units and bounded at
99,999,999 total. Exact-copy stock has quantity one; custom quantities remain in
the existing product authority. The order stores a historical snapshot, not a
second live inventory.

Attempts retain platform, connected account, mode, UUID idempotency anchor, first
creation timestamp, 120-second lease, increasing fence, immutable session and
eventually immutable PaymentIntent. Claim rechecks package, profile, publication,
selected copy/printing eligibility and seller freeze. Provider readiness must also
be freshly verified by the future creation adapter. Session binding is private and
must receive a provider-verified creation/recovery response. No creation adapter
exists yet. Expired leases preserve the original attempt; after 23 hours creation
requires recovery, never a fresh key. This is conservative relative to Stripe's
[idempotency retention](https://docs.stripe.com/api/idempotent_requests).

## Payment and stock transaction

`reconcileVendorOrder` loads the binding from SQL, verifies current provider
resources through `readVerifiedCheckoutEvidence`, requires its original branded
result, and calls the service-only atomic apply RPC. It accepts no serialized
client payment proof. A revision conflict permits one complete reload and new
provider observation. Unknown storage/provider errors are redacted.

SQL locks stock, reservation, order and attempt. It checks revision, fresh timestamp,
scope, immutable session/intent, amount/currency and bounded evidence. Observations
are append-only and unique by order/evidence hash; provider signals separately use
platform/account/mode/event uniqueness. A concurrent duplicate cannot repeat stock
movement. A different stale observation cannot be rebased onto a new revision.

- Verified clean capture consumes the reservation once. An exact copy is archived
  and its existing legacy count recomputed; no buyer copy, ownership transfer or
  owner-asserted manual sale is created. A consumed-copy trigger prevents legacy
  unarchive, transfer, repricing and identity changes. Noncommercial notes remain
  editable. Custom stock decrements exact units, advances history version, and
  unpublishes at zero while honoring other reservations.
- Verified terminal unpaid evidence releases a payment-pending claim. Browser
  return, local timeout, lease expiry, cancellation, flags and downgrade cannot.
- Paid-after-release, refund/dispute and contradictory observations retain the
  financial fact and review hold. They do not take another reservation's stock.
  Paid is monotonic; later unpaid evidence cannot restore consumed inventory.
- Existing review reasons cannot be cleared by a subsequent clean observation.
  Review resolution, returns, refunds and restocking need a separate governed path.
- Ledger insertion, stock change, legacy count, history and financial holds share
  one transaction. A stock failure rolls all of them back.

The only previously existing schema changes are three named reservation check
constraints and two stock functions. The live-quantity function excludes a pending
claim only when its current immutable observation authorizes consumption inside
the same locked transaction. There is no client-set bypass context. READ COMMITTED
remains required. All 401 earlier migration files stay byte-exact.

## Signals, privacy and retained obligations

`recordVendorCheckoutSignal` verifies the untouched signed Connect body and stores
only a resource lookup hint. It never reads order/vendor metadata for routing.
Events received before session binding remain in the inbox. Duplicate delivery can
resolve a subsequently bound session; a future bounded reconciler must also scan
retained unmatched signals. No webhook route or background job is installed here.

Base tables and payment mutations deny anon/authenticated access. Service-role
table writes also deny access; mutations use governed RPCs. Owner/buyer status is
an exact-ID authenticated projection with price/offer, paid fact, stock state and
review flag, without provider IDs, other-account identity or internal evidence.
This is a read primitive, not completed buyer/desktop order UI.

Settlement/status do not require an active package or publication flag. Financial
holds and restrictive references preserve obligations through downgrade and block
account deletion. Retention policy and removal/closeout resolution remain open.
Payment capture is not fulfillment or payout proof. Public-store suspension and
republishing behavior remain unchanged.

## Local proof and release

Use only the fixed 196xx project described in the operations guide. Strict
read-only baseline and full 402-migration reset are separate proofs. Preserve the
failed initial syntax draft/log and corrected replay receipts. Earlier projects
remain untouched. Do not rerun completed preparation/recovery/reset tools.

Roll back new acquisition by disabling orders/reservations; preserve additive
tables, order history, stock resolutions and obligation reconciliation. Do not
restore consumed stock, delete orders or erase financial holds as a rollback.
Remote apply requires normal PrePush and refreshed catalog dependency evidence.
Actual Stripe test evidence, policy decisions, checkout creation, reconciliation,
fulfillment/refunds/disputes/payouts, desktop/buyer UX and release remain separate.
