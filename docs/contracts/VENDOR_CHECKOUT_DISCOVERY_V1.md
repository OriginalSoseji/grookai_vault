# Interrupted checkout discovery V1

Local candidate based on `79b6398cc0a84fa59ba1b4d3ff4b818459deef69`.
All 405 migrations remain byte-identical. No schema, catalog, ownership, provider
resource, worker or deployment change is part of this extension.

The operator reconciliation endpoint accepts exactly `{discoverOrderId}` as a
third operation, distinct from a bound-order retry or page. It requires the
existing dedicated operator credential before constructing privileged clients,
the default-off reconciliation flag, and the existing provider configuration.
Buyer/seller Auth, event metadata, candidate session IDs, connected accounts and
pagination cursors are not accepted as discovery authority. Results are private,
no-store and narrowed to order ID, state and a fixed unresolved reason.

Discovery loads the existing service-only recovery projection and acquires its
120-second fence. It never calls checkout preparation or creates a provider
session. A bound retry uses its retained session directly. An unbound attempt is
searched only after its original 23-hour creation window plus 120 seconds; this
delay allows ordinary in-flight requests to finish, but is never proof of payment
absence. Younger attempts use the existing same-key creation/recovery rules.

The server verifies actual platform identity and mode, then lists sessions under
the immutable connected account. The fixed interval matches the existing evidence
boundary: creation start minus five seconds, inclusive, to start plus 23 hours,
exclusive. It scans every status, at most three pages of 100 sessions, and follows
the last returned opaque session cursor. Invalid scope, time, ordering, duplicates
or list envelopes fail closed. A 60-second budget is checked before/after provider
reads and before binding; an in-flight SDK request may finish later. Database lease
and revision checks remain authoritative, and reconciliation reads fresh evidence.

A session is a candidate only when all three persisted metadata IDs and the client
reference match. Any partially matching identity or multiple candidates yields
`conflicting_sessions`. No candidate yields `not_found`; an unfinished three-page
scan yields `scan_limit`. All three return an unresolved, retryable HTTP 503 and
retain the original hold. List completeness is not proof that payment never began.
Large-volume accounts may need a later governed resumable search; this version
does not accept a caller cursor that could hide earlier conflicting candidates.

Exactly one candidate from a completed scan enters the existing GET verifier,
fenced binding and atomic order reconciliation. List metadata/payment flags never
authorize payment or stock changes. Changed price, seller, capture or session
evidence prevents binding. Current verified capture may consume stock; current
verified terminal-unpaid evidence may release it. No session is expired remotely,
no replacement attempt is created, and no checkout URL returns to the operator.
Downgrades, store unpublication and acquisition shutdown do not block obligations.

Source references: Stripe documents date filtering and cursor parameters in
[List Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/list) and
reverse chronological traversal in [Pagination](https://docs.stripe.com/api/pagination).
These are lookup semantics, not a financial absence guarantee. The existing V1
request/idempotency contract remains unchanged.

This is an explicit recovery operation, not a scheduler or durable monitored
queue. Persistent retry ownership, complete recurring sweeps, account-volume
escalation, actual Stripe test-account proof and production policies remain open.
Rollback disables the reconciliation route while retaining all bindings, receipts
and stock safeguards and arranging an independently reviewed obligation path.
