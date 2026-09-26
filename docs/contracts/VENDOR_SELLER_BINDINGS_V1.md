# Vendor seller bindings V1 — local foundation

This extends `VENDOR_SELLER_PAYMENTS_V1` with durable identity and coordination.
It does not expose onboarding, create a Stripe resource, collect a payment or
make a payout. Controller configuration is retained as an immutable server input;
the pending fee/fulfillment choices are not decided by this schema.

## Authority

`20260919130000_vendor_seller_bindings_v1.sql` adds private seller accounts,
Connect event references and a disabled-by-default onboarding rollout row. One
owner has one binding for one store. The account's platform, mode, controller,
creation attempt and eventual connected-account ID cannot be reassigned.
A composite store/owner foreign key prevents pairing another owner's store or
changing that pairing later. Its supporting unique index is the only addition
on an existing table. No catalog, printing, Vault, price or publication data is
copied or mutated.

All base-table access is denied to anonymous/authenticated clients. Service-only
RPCs reserve, claim, prepare, bind, release, freeze and enqueue. The sole owner
RPC derives its owner from `auth.uid()` and returns a small status projection,
without provider IDs, attempt IDs or lease tokens. Retained status does not
require an active subscription. A bound state is not payment readiness.

New reservations and creation preparation require both database rollout gates,
active `store_app` authority and no financial hold. Retrying an existing matching
reservation retains its identity after downgrade. That does not permit account
creation: preparation checks access again. There is no environment-allowlist grant.

## Creation and fencing

Reservation allocates one opaque creation attempt. Preparation starts a durable
clock immediately before the future provider request. Retries keep both values;
after 23 hours, creation fails for explicit read-only recovery rather than risking
another account after Stripe's idempotency retention. Provider creation/recovery
must verify the actual account against the attempt and expected controller before
calling `vendor_seller_bind_v1`; the database cannot verify Stripe itself.

Each claim has a 120-second deadline and increasing fence. Same-token retries do
not extend the deadline. Every mutation rechecks its claim after acquiring locks.
Released, expired, superseded or invalidated workers cannot bind or release a
successor's work. Provider calls happen between separate RPC transactions; do not
hold database transactions open across network requests.

## Event ordering and closure

Only SDK-verified signals may reach enqueue. Scope/event ID uniqueness makes
duplicate receipts atomic; a different account, kind or timestamp under the same
ID is rejected. Service roles can append/read events, not update/delete them.
Unknown-account events are retained so deauthorization before first binding is
not lost. No event snapshot can grant readiness or subscription capabilities.

Binding and event enqueue acquire the same platform/mode/connected-account
advisory lock **before** the binding row. This order covers both an uncommitted
first binding and an uncommitted early callback. Deauthorization changes state
and invalidates the lease; it cannot automatically return to bound. An early
deauthorization is applied when a recovered account is first bound. A refresh
event cannot reopen it.

Freeze retains a stable closeout ID, invalidates in-flight work and prevents new
creation. Read-only recovery can still record an already-created account while
preserving the closing state. Restrictive Auth/store foreign keys and a deletion
guard prevent orphaning the binding. There is deliberately no final deletion RPC
until verified financial closeout, retained orders and payout obligations exist.
Direct service-role deletion is also denied. This is closeout protection, not a
completed seller-closeout workflow.

## Proof and release boundary

Use the fixed `grookai-seller-bindings-20260919` project: API 18821, DB 18822,
mail 18824, shadow 18828, future local web 18840. It uses the pinned Postgres
17.6.1.113 image, an internal network, loopback relay and zero background workers.
Earlier 164/168/172/176/180/184 projects remain preserved.

The strict baseline compares 396 applied migrations using the unchanged pgkit
0.6.1 schema/security engine and exact three-table column-order reconciliation.
Only storefront, billing and import prerequisites, optionally this binding ID,
are accepted by `AuditLinkedSchema -SellerBindingsBaselineAudit`. This mode
rejects PrePush and combined/arbitrary exceptions before any remote access.
It cannot apply or reset anything and does not waive production release gates.

The 400-file full reset preserves all 9,688 prior objects and adds 73 seller objects.
The initial draft's real callback race is retained with its migration and receipt.
The narrowly bound revision runner corrects only that new draft in the empty
188xx development project, preserving the first snapshot and every older project.
It is not a reusable reset command; do not rerun either completed replay.

Run SQL behavior and separate-connection races sequentially, then the ordinary
full repository gate. See `../audits/vendor_seller_bindings_v1/PROOF.md` for final
results, exact hashes and any remaining gates. Production pending-order and
catalog-dependency checks remain mandatory before schema release. The four
pending IDs are `20260919050000`, `20260919080000`, `20260919120000` and
`20260919130000`; no remote application is authorized by a local receipt.

## Remaining product work

The disabled server/desktop extension now lives in `VENDOR_SELLER_ONBOARDING_V1.md`;
its own receipts distinguish local implementation from actual provider proof.

Server adapter/orchestration, verified account creation/recovery, private desktop
hosted onboarding, event processing/reconciliation, financial closeout, current
checkout checks, shared inventory reservations, immutable orders, fulfillment,
refunds/disputes and payout reconciliation remain to be connected. Real Stripe
test-account evidence and governed production/pilot release are still required.
