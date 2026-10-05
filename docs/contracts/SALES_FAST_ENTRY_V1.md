# Sales desk continuous entry

The in-person Sales desk adds a positive saved USD asking price to the cart on
tap or drag. Unpriced, unsupported-currency or invalid-price copies still require
explicit price entry. Cart editing can negotiate a different amount without
changing the saved asking price. The existing 50-line and exact-copy duplicate
guards remain; adding to a cart records neither payment nor disposition.

Catalog search stays open across successful adds. It retains the query, game,
condition and destination, clears each new copy's price and exact printing choice,
and requires explicit printing selection. Every intentional new copy receives a
fresh request ID. Unconfirmed requests retain the same durable recovery payload;
another account cannot consume the draft. Existing server authorization,
quarantine checks, ownership and idempotent catalog creation remain authoritative.

Search uses the existing web resolver with explicit bounded pagination (64 rows)
where supported. Show totals and Load more only from validated server metadata.
Unpaged responses are top matches, not a completeness claim. Preserve the
query's game/finish/identity constraints and fail closed on degraded resolution.
Legacy repository callers retain their unpaged behavior. Trade search retains
complete paged results. A per-service 30-second, 32-entry read cache coalesces
identical queries, evicts old entries, never caches errors and rejects changed
accounts. It grants no write eligibility.

Sales desk omits unused market-price and section enrichment. Independent initial
reads run together. Confirmed catalog adds update the cart immediately and request
only the new active owner copy for inventory display; they do not reload the
receipt book or whole Vault. A failed refresh retains the confirmed cart line and
reports the display failure. A subsequent full load invalidates older copy reads.
Vendor Mode's default market-price behavior remains unchanged.

No schema, canonical writer, publication, online checkout or messaging-provider
change belongs to this batch. Direct receipt sending remains a separate
deliverable; device email/SMS composition is not proof of delivery. Release needs
normal checks, actual synthetic native/runtime proof and verified TestFlight
processing. Retain existing receipts and all previous release/lab evidence.
