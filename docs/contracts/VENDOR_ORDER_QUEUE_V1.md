# Durable order recovery queue V1

Local candidate after `f7c62a2654d1eb30fc769ec62d183c3af8e8adbb`. Adds operational
retry ownership over existing orders. It does not add or change payment, stock,
ownership, checkout pricing, seller identity or fulfillment authority.

## Durable work and concurrency

`vendor_order_reconcile_scopes` stores a UUID scan cursor and fixed upper bound
for each platform account/mode. A page of at most 100 started attempts is enqueued
and its cursor advanced in the same transaction. The next complete sweep catches
attempts that started or were inserted behind the cursor. An interrupted process
resumes the persisted cursor. Seeding never removes jobs or resets a completed
job's retry delay. An initially unbound job may be brought forward once bound.

`vendor_order_reconcile_jobs` has one row per existing order, no copied price,
inventory, buyer or seller record. Due work is scoped through the immutable
attempt. A claim grants a 180-second lease and increments a fence. Scan, claim
and completion all lock scope before job; provider IO happens after transaction
commit. Concurrent callers cannot share a job lease. An expired lease is eligible
for a successor, increments the abandonment count and never changes payment stock.

`vendor_order_reconcile_events` retains immutable claim/completion receipts keyed
by order, fence and phase. Completion validates scope, token, fence and deadline.
A duplicate completion returns its saved receipt without another counter update;
a conflicting result or stale unfinished worker is rejected. If provider work
commits but completion is lost, a successor re-reads current provider evidence.
Queue receipts are operational observations, never payment evidence.

The queue includes bound obligations and started unbound attempts. Never-started
attempts remain governed by buyer cancellation. An unbound job is not claimable
until the original 23-hour creation window plus 120 seconds. Bound jobs use the
existing verifier; unbound jobs use bounded discovery and the same fenced binding.
No path creates a Stripe session, invents a new idempotency key, clears a stock
hold, or acknowledges a webhook merely because its queue work finished.

## Retry and health behavior

Verified unpaid/open obligations recur after 15 minutes; paid obligations recur
after six hours so later provider changes can be observed. Review-needed orders
remain visible and recur after one hour. Other failures and unresolved discovery
use 30-second exponential backoff capped at one hour. Successful verification
resets consecutive failures. Retained payment review reasons cannot be cleared by
a queue success; completion checks the current order and preserves review status.

The queue has a database control flag plus an independent default-off runtime
flag, `GROOKAI_VENDOR_ORDER_QUEUE_ENABLED`. Seeding/claiming require the DB flag.
Completion remains available after pause to safely record in-flight work. Existing
direct obligation reconciliation stays independently available. Acquisition,
onboarding, package and store publication gates do not block retained obligations.

POST `/api/vendor-orders/queue` requires the existing dedicated 64-character
operator credential before privileged runtime construction. It accepts only
`{"action":"tick"}` or `{"action":"status"}`, no order, account, cursor, limit,
price or payment data. Tick seeds one page, claims at most one job, verifies it and
requires a persisted completion receipt. A failed completion stays retryable.
An unresolved saved result returns 503 with its fixed result and next-run time.
Responses are bounded, private/no-store and stripped of unknown fields/errors.

Status uses the independent reconciliation lane and performs no provider work or
seeding. It remains available when the queue flag is off. It reports scope progress,
due/leased/expired/unresolved counts, abandoned claims and up to 25 attention rows.
Alerts cover a paused/unstarted queue, scan heartbeat over 15 minutes old, incomplete
full sweep over 24 hours, work overdue by 15 minutes, expired leases and unresolved
orders. Nonempty alerts return 503 for monitoring; this is not a payment or payout
health guarantee. The attention sample is not an exhaustive list of all failures.

## Local proof and release

All 405 prior migrations remain exact. New migration 20260919210000 adds only queue
objects. The first 216xx draft was preserved after lock-order review; the corrected
draft is fully replayed in separate 220xx. No completed project may be reset.
Use the final runtime/fixture/full-hook tools in the operations guide.

No scheduler, monitoring destination or production resource is activated. Release
requires actual Stripe test-account proof, a reviewed recurring invocation and
alert owner, cadence/load tuning, credential management and normal schema/catalog
integration gates. Production commerce policy and fulfillment/refund/dispute/payout
workflows remain separate. Disabling acquisition must never stop old obligations.
Rollback pauses the new queue and retains jobs/events, orders and inventory guards;
arrange the existing independently governed reconciliation path before disabling it.
