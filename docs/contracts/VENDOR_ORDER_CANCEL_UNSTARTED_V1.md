# Cancel an order before checkout starts V1

Local candidate after reconciliation commit6dc24f662. The additive200000 migration
adds an immutable vendor_order_cancellations receipt and a private governed
mutation. All404 earlier migration bytes remain exact. No catalog writer, Vault
ownership, price, quantity, payment fact or provider resource is changed.

The server derives the buyer through getUser. POST /api/vendor-orders/cancel takes
only orderId, exact same origin and a bounded512-byte body. The service-only
vendor_order_cancel_unstarted_v1 independently checks the persisted buyer under
READ COMMITTED. Anonymous/authenticated callers cannot invoke it or read/write
the base receipt table. Service-role direct receipt writes are denied too.

Cancellation takes stock, reservation, order and attempt locks in the same order
as checkout/settlement. It succeeds only for an unpaid, unreviewed payment_pending
order with a pristine attempt: no creation_started_at, lease, fence, session or
payment intent. It atomically inserts one receipt, increments order revision and
releases the reservation using order_canceled_unstarted. A second request returns
that same receipt. Direct release without the receipt remains blocked by the stock
trigger. No fake provider observation or refund is recorded; inventory quantity
and exact-copy ownership/archive state are unchanged.

Checkout winning the lock race sets creation_started_at and makes cancellation
fail. Cancellation winning releases the claim and makes checkout preparation fail
before provider access. Missing session, expired lease, timeout or missing webhook
never establish that checkout was not attempted. Such orders remain held for
provider recovery. Known pre-checkout cancellation retries survive unpublication,
downgrade and acquisition shutdown. An old quote recovers the canceled order; it
cannot resurrect it or create a replacement under the old request identity.

The participant-only cancellation status RPC returns only canCancel and canceledAt.
The buyer sees a two-step Cancel order / Confirm cancellation control. Sellers see
the retained result without that control. Lost responses retry the same order;
the page reloads authoritative status after success. Existing order lists/status
and payment evidence stay intact. A status read is advisory, never release authority.

GROOKAI_VENDOR_ORDER_CANCELLATION_ENABLED defaults off and currently permits only
the fixed21240 synthetic local origin, API alias15439 and local staging/telemetry
guards. It needs no Stripe credentials, subscription or acquisition flag. Quote
policy additionally recognizes21240 for browser proof; provider checkout remains
restricted to its existing20040 fixture and is not activated here. Cancellation
status/history remain readable independently of the mutation flag.

This closes only never-started abandonment. Started/ambiguous unbound attempts,
provider session expiry, durable monitored retries, actual Stripe test proof,
production fee/tax/fulfillment policy and refund/dispute/payout workflows remain
separate. No release/deployment, provider action, automatic timer or account erasure
is authorized. Rollback disables new mutations and keeps all receipts/stock guards.
