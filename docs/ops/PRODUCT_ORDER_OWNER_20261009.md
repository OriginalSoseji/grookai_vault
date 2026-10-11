# Order account safety — October 9

The full overhaul's buyer/seller review reproduced private order titles still
visible after confirmed second-tab sign-out in buyer history, seller history and
order detail. The actual Auth/browser evidence is external at
`C:/grookai_vault_operator_artifacts/product_inventory_export_20261008/order-owner-repro-1791572001977`.
These are synthetic local order projections, not provider settlement evidence.

The current implementation wraps buyer/seller history, order detail, purchase
review and operator resolution pages in an authenticated owner scope. A changed
account permanently closes the mounted scope and unmounts private content. A
fresh server-authenticated navigation is required to resume. Delayed server
content for an old account cannot reopen the old scope.

Quote/confirm/release, cancellation, checkout, fulfillment, refund and resolution
actions capture their original bearer and serialized body. The transport checks
the owner before handoff, after the response and after parsing its body; it never
automatically retries. It omits ambient cookies and accepts only the six exact
interactive order endpoints. Their HTTP boundary rejects missing/malformed bearer
headers before the existing handlers, whose Auth, origin, participant, provider
and rollout checks remain authoritative. Queue, reconcile and webhook paths retain
their existing service boundaries. Existing request journals and retry identities
are retained; no financial request is discarded or assigned a new identifier.

No schema, payment-provider, rollout, publication or production change is part of
this repair. The inherited order capabilities remain separately gated local
candidates; this does not claim that customer checkout has been released.

The new account/transport/boundary suite passes 23 cases. The affected suite passes
904 cases plus web types and lint at external
`price-alert-draft-v1/checks-orders-1791572219485/result.json`. Seven actual
Auth/browser cases pass at `order-owner-verification-1791572475547/result.json`:
all three pages close, a handed-off action returns401 with its revoked original
token despite conflicting valid replacement cookies, returning to the original
account cannot reopen its old scope, all six cookie-only endpoints reject even
with valid cookies, and an outsider cannot read the order. All six screenshots
are inspected. Provider attempts remain zero and all prior rows are retained.

Current export8, owner13, team7, manager13 and price8 browser regressions also pass
after this repair. Their immutable receipts are indexed in
[the combined qualification manifest](../audits/product_overhaul_20261009/CURRENT_QUALIFICATION.json).

Continue the supported buyer/seller lifecycle proof after this repair. Actual
provider delivery/settlement and physical device acceptance remain separate.

## Current-main fulfillment acceptance and compact history

The current integration passes six actual Auth/browser/SQL cases at external
`order-lifecycle-v1/fulfillment-1791574616655/result.json`. Shipment submission
survives a lost successful response and identical retry without appending twice.
Tracking correction, seller-recorded delivery and ready/collected pickup are
visible to the buyer. Unpaid/review orders and a page opened before disablement
cannot bypass the database. The synthetic attempt bindings are fixtures, not
proof of Stripe charging or settlement. Controls return off, all prior rows are
retained, and no provider request occurs.

The first adapted fixture used an older schema's synthetic setup and omitted the
attempt binding now required by the notification/fulfillment lock. Its request
correctly rejected. The failed evidence and all fixtures remain preserved; its
control was restored and every prior row verified before the corrected proof.

History removes its repeated workspace label and nested horizontal padding,
shortens introductory copy and keeps the filter together on small screens. All
five new screenshots are inspected; 320px and390px have no horizontal overflow
and the first order title appears above the fixed bottom navigation. This is a
local layout/behavior proof, not an uncoached-user benchmark.
