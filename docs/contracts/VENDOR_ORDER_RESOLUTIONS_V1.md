# Retained order resolution workflow V1

Continues the integrated storefront at `031a090375`. Stripe activation is deferred
by the founder. This local step records a seller request, the actual buyer's
response, and an independent operator decision. It grants no financial clearance,
fulfillment permission, inventory release, refund, or payment authority.

The first supported request is to continue the original paid order after all
observed refund attempts failed or were canceled. Successful, pending, unbound,
disputed, or otherwise inconsistent financial outcomes remain outside this path.
No original order price, items, stock, payment or ownership facts are rewritten.

## Identity and authority

Each immutable case references one existing order and stores a bounded server
snapshot for review. An append-only event ledger records request identity, actor,
sequence, action and server time. Buyers consent only as the original authenticated
buyer; a seller's assertion or uploaded note never substitutes for buyer consent.
Participant reads survive subscription downgrade and publication changes.

Operator decisions require an active database entitlement bound to the actual
user UUID, `founder_admin` tier, founder/internal role and the explicit
`order_resolution_operator=true` feature. Environment allowlists, email-only grants,
client role flags and service credentials without an authenticated actor do not
grant this permission. An operator cannot decide their own seller or buyer case.
No production entitlement is created by this implementation.

V1 operator acceptance records that the proposed resolution was reviewed. It is
not hold clearance. The buyer can withdraw agreement and the seller can withdraw
the request; both remain retained events. A later clearance transaction must read
the latest consent and decision under lock, not treat a prior acceptance as a token.

## Concurrency and evidence

Writes use the existing notification scope-before-order lock order, followed by
case/event inspection. Request UUIDs enforce exact retries; changed payloads or
stale expected sequences fail. No provider IO occurs while database locks are held.
Creation must use the existing sealed provider evidence service, with current
original payment/refund/dispute checks and matching retained request states.
Positive responses recheck the stored order/refund basis and notification progress.
Withdrawal and rejection remain available when financial evidence has changed.

All controls default off. Public base-table reads/writes and direct privileged
RPC execution remain denied. Authenticated, origin-checked server handlers supply
the actual actor and reject caller-provided owner, role, amount or clearance flags.
Private DTOs expose review terms and event roles, without provider IDs or other
account identifiers. Responses are private/no-store.

## Proof boundary

New isolated 248xx project: `grookai-resolutions-20260922`. Preserve every existing
environment, migration byte and consumed preparation/reset receipt. Compare a
fresh 400-migration baseline with the linked schema/security before authoring the
additive migration; only the exact 12 existing local pending files are excluded.
The strict baseline exception cannot apply migrations or choose another target.

Required proof covers participant/operator isolation, owner-as-buyer substitution,
forged roles and consent, stale financial basis, pending notifications, exact retry,
changed-request conflict, competing responses, withdrawal, retained history, and
unchanged payment/stock/fulfillment/hold state. Record actual progress in the ops
checkpoint; this contract is a design boundary, not a completion receipt.

Rollback disables new workflow writes and keeps cases, decisions and participant
reads. Final hold clearance, successful-partial-refund resolutions and real Stripe
payment/dispute/payout proofs remain separate work.
