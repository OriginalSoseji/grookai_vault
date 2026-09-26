# Order dispute evidence V1

The existing checkout verifier now reads up to five pages of100 disputes filtered
to the original charge under its immutable connected-account scope. Platform and
mode checks precede the scan; the complete payment/refund/dispute observation is
repeated and hashed. A changed observation or failed provider read cannot produce
payment proof. Page exhaustion reports incomplete review, never an empty list.

Each row validates charge, intent, mode, status, amount, creation time, response
deadline and evidence-submission summary. Amount/currency are preserved because
a dispute can differ from the original charge. Evidence bodies, customer data and
metadata are excluded. Balance transaction IDs are references for later financial
reconciliation; this code does not claim to reconcile movements or payouts.

Current disputes retain review even if the Charge disputed flag is false. Missing
records while that flag is true also retain review. Needs-response and loss get
explicit reasons. Won/closed/prevented do not clear old holds, restore stock or
authorize fulfillment. Even a failed-charge path cannot release stock while its
observed disputes remain unresolved. The private inventory accessor accepts only
the original fresh sealed payment proof and returns a defensive copy.

No migration or new permission is needed. Existing atomic payment apply persists
review reasons and financial holds, and existing fulfillment checks enforce them.
All408 source migrations remain unchanged. Actual Stripe test-account proof, seller
dispute response UI/submission, financial resolution and payout reconciliation are
still required. This is current evidence enforcement, not a finished dispute workflow.

Primary references checked September20,2026:
[dispute object](https://docs.stripe.com/api/disputes/object),
[charge-filtered pagination](https://docs.stripe.com/api/disputes/list).
