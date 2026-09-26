# Seller-recorded order fulfillment V1

Local candidate based on7e188be1f08605241a4bb44afab090d9c7c60e7c. The new ledger
records seller assertions about shipping/pickup, separate from payment evidence,
carrier confirmations, refunds, payouts, inventory and ownership. No Stripe call
or production activation is added. All406 previous migration files remain exact.

One private append-only `vendor_order_fulfillment_events` table retains request ID,
order, actor, increasing per-order sequence, action/state, tracking and server time.
It references the immutable existing order; it copies no inventory, quantity or
price. The latest event is the projection, avoiding a second mutable status table.
Global request ID uniqueness and `(order_id,sequence)` uniqueness enforce retries
and ordering. Update/delete triggers retain history. Base-table writes are denied
even to service_role; mutations use the governed function.

`vendor_order_fulfillment_record_v1` is service-only. The web server authenticates
the caller and supplies that identity; the function checks the immutable order
owner. It locks the order, requires READ COMMITTED, paid state, consumed stock and
no unresolved review. It acquires no subsequent inventory/reservation locks, so
the existing stock/reservation/order settlement order cannot cycle with it.
Publication, sharing, package, acquisition and onboarding do not gate retained
fulfillment obligations. A separate default-false control gates new events; a
missing control fails closed. Exact saved receipt recovery works after pause or
review. A changed request or stale expected sequence cannot append another event.

Allowed paths:

- Pickup: unfulfilled → ready for pickup → collected.
- Shipping: unfulfilled → shipped → delivered.
- While shipped, tracking corrections append a new event and retain prior values.

Shipment/correction require a bounded carrier enum and 3–100 character tracking
number containing letters, digits, spaces or hyphens. Other actions reject hidden
tracking inputs. Delivery carries forward the latest tracking. Terminal states
cannot be reversed through this workflow. Corrections to mistaken terminal records
require a future governed support workflow; never rewrite the retained ledger.

Fulfillment does not modify paid/review facts, stock, ownership or financial holds.
In particular, completed fulfillment does not establish payment/refund/payout
resolution or authorize account deletion. A concurrent recorded payment review
prevents a new fulfillment update; the completed physical-progress history remains
readable. The current payment ledger remains authoritative for whether an update
may be recorded; this operation does not independently refresh Stripe evidence.

`vendor_order_fulfillment_status_v1` is an authenticated owner/buyer projection with
current state, role, permission flags and the latest20 ordered events. Foreign
accounts receive no data, and anonymous access is denied. No provider identity,
other-account identity or internal review reason enters the DTO. Reads remain
available after package/publication changes and processing pause.

POST `/api/vendor-orders/fulfillment` verifies exact origin and real Auth before
privileged construction. It accepts only the exact bounded command, never an
owner, paid flag, price, state or force option. Responses are private/no-store.
The independent runtime flag defaults off and currently permits only the isolated
22440 browser fixture. Production enablement requires the separate release gate.

The desktop order detail page provides explicit confirmation, tracking correction,
same-request retry after uncertain responses and seller-recorded progress. Buyers
see current tracking and recent history without mutation controls. The UI reloads
the persisted record after success; it never optimistically confirms fulfillment.
Retained order lists still link to the same detail destination.

This implements fulfillment recording, not shipping-label purchasing or carrier
integration. Shipping address capture/validation belongs to the remaining real
checkout policy work, including charges and tax. Current shipping test orders use
synthetic zero-charge quotes, not an approved production shipping flow.

The new224xx project replays407 migrations, preserving10,035 existing schema
objects and adding34 fulfillment objects. No existing payment/stock function is
changed. Local provider responses remain intercepted. See the ops guide and proof.
Rollback disables new mutations and client controls while retaining ledger reads,
events, financial holds and independent payment reconciliation. No data deletion.
