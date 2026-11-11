# Square commerce sync V2

Status: active implementation and release contract; default-off candidate.
Owner authorization November11,2026: complete the full list, production website
and Samsung, without routine micro approvals. Completion requires add-for-sale
in grookai → automatic Square item → unchanged grookai QR lookup → completed
Square sale → exact-copy sale/availability readback in grookai. Local tests or
catalog-only creation cannot satisfy this acceptance.

This extends SQUARE_CATALOG_SYNC_V1. Exact-copy GVVI identity and existing QR URLs
remain authoritative. No custom/group inventory identity is invented. Private
collection entry stays private. A seller explicitly opts into automatic inclusion
of eligible public For sale copies, with a positive exact USD asking price and
verified printing. New eligible offers then require no manual Square item entry.

Square allocation is an exclusive, durable claim on existing physical stock,
not a second inventory balance. Acquisition locks the exact copy in READ COMMITTED,
rejects Stripe holds, eBay claims and other Square allocations, and commits the
claim and immutable provider request before publishing one unit in Square.
New claims against allocated copies fail across all existing reservation paths.
Ownership/archive/identity mutations are protected; asking-price/condition changes
can synchronize while the owner and exact identity remain fixed. Privacy and
unpublication remain possible and schedule withdrawal. No expiration, disconnect,
pause, failed lookup or missing webhook can silently release an external claim.

Inventory operations use fixed location/variation identity, retained idempotency
keys and absolute physical counts only for a newly verified zero-stock item or
explicit withdrawal. Never rewrite an existing unknown count or add one unit on
every sync. Square's own sold decrement is never echoed as another decrement.
Uncertain allocation/withdrawal retains the claim and reconciles the saved
attempt. Withdrawal additionally checks intervening orders and physical stock;
uncertain offline sales remain held for review. Manual out-of-stock/offline POS
overrides cannot be advertised as an absolute overselling guarantee.

Webhook ingress verifies constant-time HMAC over the exact registered HTTPS URL
and untouched bounded body, then durably records a minimal resource hint before
2xx. Duplicate/out-of-order notifications are normal. Seller identity comes from
the verified app/environment merchant binding. Provider rereads supply order,
payment, refund and count facts; webhook body fields do not establish settlement.
Retained periodic reconciliation recovers missed notifications.

Only completed, fully paid, same-location USD orders with exact mapped variation
and quantity1 can create a sale. A service-only external-sale authority writes
the canonical disposition/archive atomically with the consumed claim and durable
provider business-effect key. Never spoof an authenticated owner session. Mixed
carts ignore unrelated unmapped lines; duplicate business effects cannot archive
twice. Partial payments/cancellations do not become paid sales. Actual discounted
line revenue excludes tax, service charge and tip. Unsupported/zero/ambiguous
amounts become durable review, never fabricated money.

Refund evidence never automatically restores an exact physical card or erases a
sale. A return requires owner confirmation that the physical copy is back. Retain
the original disposition and provider refund; use governed return/intake authority
and provenance for a new owned instance when the old disposed identity cannot be
reused. Unexpected Square restock on a disposed mapping is quarantined/withdrawn,
not silently republished. Financial refunds remain in Square.

Backend workers own orchestration and durable recovery; web/native stay thin.
OAuth adds only implemented inventory/order/payment read scopes and inventory
write. No production payment-create or refund-create permission is needed.
Credentials remain encrypted and server-only. Native transport uses verified
owner bearer identity, HTTPS, bounded requests and safe browser OAuth return.
Website and native use bundled Roboto, the original emblem and Winter accents.

Release requires fresh/retained database replay, exact schema/security proof,
tenant/Auth tests, competing claims, interrupted writes, webhook replay/reordering,
sale/refund/return recovery, actual Square Sandbox orders, real seller OAuth,
hosted checks, same-package/signer Samsung continuity, and the actual unchanged
QR checkout flow on the intended device. Source, hosted and device evidence are
distinct. Rollback pauses acquisition while retaining obligations and reconciliation.
