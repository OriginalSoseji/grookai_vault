# Automatic uncertain-refund recovery V1

Candidate afterdd01fe969. Reuses all412 migrations and the retained240xx local
environment without reset. No provider creation, schema or financial-hold clearance
authority is added.

After fresh payment reconciliation records its observation, the worker reuses the
original sealed in-process refund inventory to inspect retained refund commands.
It rereads current order identity/revision, accepts at most one unbound command,
and requires exactly one scoped provider match with the original request identity,
charge, intent, amount and creation window. Metadata is a discovery hint only.
The existing recovery lease/fence and binding RPC serialize concurrent attempts.
An expired creation window permits GET-proof recovery but never a new refund POST.

Absence remains unresolved and returns needs_review to the existing queue. Multiple
matches, mismatched scope/amount, stale proof, concurrent revision changes, and
active competing leases cannot bind. A revision conflict requires completely new
provider evidence. Identical observations may legitimately retain their revision.
Partial progress is durable; a later retry rereads current state. Recovery works
with new issuance, acquisition, publication and paid packages disabled.

The private read-only reviewResolution method reports held or operator_review_required.
Only fully failed/canceled outcomes without pending/successful refunds or current
disputes can reach operator review. It never clears financial holds, erases historical
review reasons, restores stock, confirms buyer intent or permits fulfillment. It is
not a public HTTP action or a clearance token. Further review must recheck historical
holds, notifications, current facts and the buyer's agreed resolution.

Policy question remains open: operator approval versus explicit seller confirmation
for resuming after failed/canceled refunds. This candidate conservatively retains
operator review; neither actor has gained an unblocking action. Partial/full refunds,
ambiguous absence, disputes, financial-hold clearance and payout reconciliation need
separate governed resolution workflows. Actual Stripe-account and release proof remain.

Provider references checked September22,2026:
[refund object](https://docs.stripe.com/api/refunds/object),
[idempotent requests](https://docs.stripe.com/api/idempotent_requests).
These document separate refund statuses and finite idempotency retention; they do
not authorize treating an absent refund as failure or a failed refund as buyer consent.
