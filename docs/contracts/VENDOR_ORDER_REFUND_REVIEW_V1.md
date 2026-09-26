# Desktop refund outcome review V1

Source-only extension after `2f9cffbfd`. Reuses all 412 migration files without
schema changes. An authenticated seller can request a fresh review from the order
page, including while new refund issuance, store publication and packages are off.
The existing local-only refund runtime must still be enabled.

`POST /api/vendor-orders/refunds` accepts exactly `action: "review"` and `orderId`.
Origin and actual Auth are checked before service access. The private refund
context enforces the original seller owner before any provider read. No request
accepts actor, provider identity, amount, clearance, package or fulfillment flags.
Responses use private/no-store and vary by Cookie/Authorization.

The existing sealed provider verifier supplies a read-only snapshot. The response
uses `VENDOR_ORDER_REFUND_REVIEW_V1`, verified amounts and fixed public issue
categories. Internal reasons and provider identities are not serialized. Unknown
internal reasons become a generic review category. Both server projection and
browser parser reject affirmative clearance/fulfillment flags and inconsistent
review decisions. Failed/canceled attempt totals may exceed the original payment
after repeated attempts; they are never presented as money returned to the buyer.

The desktop panel shows its check time, outcome, sent/pending amounts, failed/
canceled attempts, and next-step explanations. Starting any other action or a new
review removes the prior snapshot. A failed/malformed response cannot leave a
previous success visible. Buyer pages have no review control; direct buyer or
foreign-owner requests also fail. The panel fits narrow screens.

This is review preparation, not resolution submission or approval. It makes no
refund, observation, hold, fulfillment, stock, ownership or payment write. A failed
refund is not buyer consent to fulfill. Approval authority remains an open policy
decision, and no actor gains an unblocking action. Historical holds, notification
generations and buyer agreement must be checked in the future governed resolution
transaction; this snapshot is never a clearance token.

Official Stripe refund statuses and failed/canceled behavior were checked on
September 22, 2026: [refund guide](https://docs.stripe.com/refunds) and
[refund object](https://docs.stripe.com/api/refunds/object). No actual Stripe
account request or production action is part of this candidate.
