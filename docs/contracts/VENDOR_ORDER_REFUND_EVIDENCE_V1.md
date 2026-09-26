# Order refund evidence and financial signals V1

Extends existing payment reconciliation after fulfillment commit
`3ee78aaae5f46de495be5975c23131afbb84a4c3`. All 407 migrations remain unchanged.
This is an implemented part of reconciliation, not completed refund issuance,
dispute resolution, payout reconciliation or financial-hold removal.

## Current provider evidence

The existing checkout verifier now includes a charge-filtered refund inventory in
each of its two complete observations. Each list uses the same verified connected
account as the original order and checks exact charge, PaymentIntent, USD currency,
amount, creation time, status and direct-charge shape. Refund V1 has no livemode;
mode still comes from the verified platform/connected balances and request scope.
The shared 60-second deadline, immutable order/scope checks and original in-process
proof requirement remain in force. A changed refund changes the evidence hash.

Each scan reads at most five pages of 100 rows. Duplicate IDs, malformed or empty
continuing pages, unexpected references and provider failures fail closed. A
bounded but incomplete scan produces an explicit review reason; it never claims
complete history or refund capacity. Sensitive refund metadata, destination
details, instructions emails and bank references never enter the ledger evidence.
The later durable-refund extension retains only a validated request UUID from
metadata as a discovery hint in its private inventory. It is never ownership or
payment authority; see VENDOR_ORDER_REFUNDS_V1.md for its additional binding checks.

Succeeded, pending/requires-action, failed and canceled amounts are separate.
Pending is never success, failure is never a negative refund and charge aggregate
mismatches remain review evidence. No computed total authorizes a new refund.
Any observed refund keeps an initial captured claim under review instead of
consuming it; already consumed stock remains consumed. Pending/action-required,
failed, incomplete and mismatched cases add specific retained review reasons.
The paid fact is preserved. Later clean reads cannot erase earlier review reasons.
The existing fulfillment boundary blocks new updates once review is recorded.

## Signed financial notifications

The order webhook now retains `refund.created`, `refund.updated`, `refund.failed`,
`charge.refunded`, and dispute created/updated/closed/funds-withdrawn/funds-reinstated
events. Signature, pinned API version, Connect account, mode and resource shape are
verified. These map only to their original PaymentIntent through the existing
scoped inbox. Client/order/vendor metadata, status and amounts cannot route an
order, prove a refund or change stock. Non-PaymentIntent external charges are
ignored; malformed/missing references are rejected.

The unique event key prevents concurrent duplicate insertion. Delivery only
acknowledges durable retention. Current periodic order reconciliation observes
these obligations; this change does not bring a six-hour paid-order job forward
or make the webhook a synchronous money/stock writer. Prompt signal-driven queue
scheduling and refund command arbitration remain part of the financial workflow.
Payout events still require their own seller/balance-transaction reconciliation.

## Remaining financial workflow and release

Next: immutable owner-authorized partial/full refund commands, serialized
outstanding amounts, provider idempotency and ambiguous-creation recovery, verified
refund receipts and buyer/vendor status, then governed dispute/payout resolution.
Do not add a provider POST before the durable command/recovery boundary exists.
Refunding is not restocking, fulfillment reversal, payout proof or permission to
clear account-deletion holds. Checkout fee/tax/refund policy and actual Stripe
test-account evidence remain required. No provider resources, workers, remote
migrations, credentials or rollout flags are activated here.

Rollback uses existing order acquisition/processing controls while retaining
payment, stock, inbox and financial histories. Never delete evidence or restore
ownership to remove a review flag.

Primary references checked September 20, 2026:
[Refund object](https://docs.stripe.com/api/refunds/object),
[bounded refund listing](https://docs.stripe.com/api/refunds/list),
[refund lifecycle](https://docs.stripe.com/refunds),
[Dispute object](https://docs.stripe.com/api/disputes/object),
[event types](https://docs.stripe.com/api/events/types).
