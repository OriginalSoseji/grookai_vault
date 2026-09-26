# Durable order refunds V1

Local candidate after `0dc7b9193`. This adds owner-issued partial/full requests,
retained status and desktop controls. Production policy, financial-hold resolution,
disputes and payouts remain separate. All407 prior migration files stay exact.

## Authority and recovery

Private requests retain immutable owner, original order, amount, reason, provider
scope, request version and first creation time. One unbound request blocks another
key. The order lock serializes preparation with refunds and fulfillment. Unbound,
pending, action-required and succeeded commands block new fulfillment pending a
separate resolution workflow. Refunds never restore stock or rewrite ownership.

Only service functions mutate requests/observations. Authenticated clients receive
an owner/buyer projection of at most20 requests, without provider identities or
leases. Access survives package/publication changes. Database and runtime issuance
default off; runtime recovery is independent of issuance.

The service requires original fresh payment proof and its sealed in-process refund
inventory. Serialized lists, client metadata and a POST response cannot establish
financial facts. Complete bounded inventories are required; pending amounts reduce
capacity. Existing payment reconciliation records refund observations after its
atomic payment apply. Failure of that second step is retryable and never undoes
the paid fact or restores stock.

V1 sends original charge, explicit amount, requested_by_customer or duplicate,
refund_application_fee=false and reverse_transfer=false using the stored connected
account. Stable key: `grookai-refund-v1-{request UUID}`. A future fee/charge model
requires a new version; ambiguous retries preserve original bytes. Current payment
verification accepts only the existing direct-charge model without application fees.

Uncertain responses retain the command. Same-key creation retries require a fenced
lease and the original23-hour window. Later recovery is GET-only. Absence never
proves failure. Metadata UUID is only a discovery hint; original charge/intent,
scope, amount, creation time and exactly one matching inventory row are checked.
Bound refresh uses retained refund identity, independent of mutable metadata.
Ambiguous/conflicting outcomes remain unresolved. Provider errors currently retain
uncertainty even where a future governed flow could prove definitive rejection.

## Desktop boundary

POST `/api/vendor-orders/refunds` accepts exact preview/create/refresh shapes.
Origin and real Auth precede privileged construction. Clients supply no actor,
provider scope, inventory, paid flag or enablement. Responses are private/no-store.
The form checks availability, parses integer cents, requires explicit confirmation
and persists the exact command in session storage before sending. Reload can
resume an unbound command from the ledger. Buyers receive history without controls.

Runtime allows only the synthetic22840 lab. Compiled browser proof now passes
with actual cookie Auth/SQL and the real SDK on a fixed loopback simulator; it is
not actual Stripe-account validation. Owners cannot submit invalid amounts or
start another refund after the verified balance is exhausted. Buyer headings show
partial/full refunds without replacing unresolved payment-review status. The
ordinary full commit hook remains the commit gate. No production enablement.

## Remaining work and rollback

Prompt financial-event scheduling, definitive rejection/ambiguous absence handling,
financial-hold resolution, disputes and payout reconciliation remain unfinished.
Successful partial refunds conservatively hold fulfillment; no clearance policy
exists yet. Actual Stripe, approved checkout policy, operations and pilots are
required before release. Rollback disables issuance/client controls while retaining
data, participant history and independent reconciliation. Never delete histories,
clear review flags or undo stock to roll back.

Primary references checked September20,2026:
[refund creation](https://docs.stripe.com/api/refunds/create) and
[idempotent requests](https://docs.stripe.com/api/idempotent_requests).
