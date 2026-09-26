# Order notification recovery V1

Candidate follows catalog recovery commit 0be676602. Signed provider signals
remain lookup hints, never payment, refund, stock, ownership or payout authority.
Existing financial review and refund holds remain in force.

## Durable scheduling

The platform/mode scope row is created before locking. One scope lock serializes
signal retention, association, queue seed/claim/completion, and new fulfillment.
Queue paths acquire scope before job; fulfillment acquires scope before order.
Settlement retains stock/reservation/order/attempt order and never takes scope
or queue locks. Provider IO starts after a committed claim, outside these locks.

The private immutable vendor_order_signal_associations table binds each original
platform/seller/mode/event key to its exact persisted session or payment intent.
Each new association increments requested_generation on the existing queue job.
Claim captures claimed_generation. Successful fresh reconciliation acknowledges
only that claim; a later event remains due immediately. Failed checks do not
acknowledge and retain bounded backoff. Duplicate delivery does not reset retries.
Successful needs_review checks may acknowledge the notification while existing
financial review independently continues to block fulfillment.

Association batches contain at most100 rows. Signals received before binding
remain in the inbox and are associated on later seed, claim or completion. New
fulfillment checks both pending generations and matching unassociated signals.
After waiting for the order lock it rechecks the latest intent binding, so
settlement and pre-binding events cannot expose stale eligibility. Pausing the
queue does not discard signals or permit fulfillment. Exact existing fulfillment
receipt recovery remains available despite newer events or disabled controls.
Participant projection exposes only the existing readiness booleans, no internal
provider IDs or generations. Only the existing private service RPCs are callable;
new helper functions and association writes are revoked even from service_role.

## Local proof and operational scope

Dedicated project grookai-notifications-20260922 uses API24021/DB24022, internal
network, loopback relay, pinned PostgreSQL image and zero workers. All411 earlier
migration files remain byte-identical. A new412-file replay adds one table and
three queue columns, changes six function definitions with grants preserved,
and leaves10,132 prior schema objects unchanged. Idempotence is tested in rollback.
Preparation and reset are consumed; never rerun them or older232xx/236xx helpers.
The failed232xx attempt remains historical evidence, untouched.

A fresh read-only AuditLinkedSchema -VendorOrderNotificationsV2BaselineAudit
compares the fixed400-migration baseline with production. Only the exact eleven
previous pending IDs are accepted. Apply, arbitrary targets, combined exception
modes and altered prior source fail closed. No production apply authority changes.
Read docs/ops/VENDOR_ORDER_NOTIFICATIONS_V1.md and the local proof for actual
verification status. Full SQL concurrency/ACL regression and the ordinary full
commit hook are required. Actual Stripe-account proof, financial-hold resolution,
dispute/payout workflows, checkout policy and controlled release remain separate.
