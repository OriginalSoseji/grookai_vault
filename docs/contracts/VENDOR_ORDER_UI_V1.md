# Private buyer and seller order pages V1

Local candidate based on `9a0d7828bc9f304e5770e339272e80632e71ea8c`.
No schema changes: all 403 migration files remain exact. This extends the retained
participant projection in VENDOR_ORDERS_V1 and the return destination specified in
VENDOR_CHECKOUT_CREATION_V1. It does not enable checkout or provider requests.

## Access and projection

- `/account/orders` lists the authenticated buyer's purchases.
- `/account/store/orders` lists the authenticated owner's online orders.
- `/account/orders/{uuid}` uses the existing authenticated participant status RPC.
  Missing, malformed and another account's IDs return the same unavailable view.
- Server Auth verifies the viewer before creating the admin index client. The
  index selects only IDs and creation timestamps, filtered by that viewer's buyer
  or owner column. No caller-supplied account ID or role grants access. Each row,
  including pagination lookahead, must also pass the authenticated participant RPC.
- Pages contain at most 20 records with one authorized lookahead. Newest-first
  pagination uses creation timestamp (preserving microseconds) and UUID. Cursor
  inputs are validated before constructing the PostgREST filter. All/paid/unpaid/
  review filters run in the server query. A storage or projection error fails the
  entire page with a generic message; no partial count reveals unauthorized rows.
- Only explicitly mapped snapshot fields enter presentation. Provider bindings,
  other-account IDs, internal review reasons and private evidence stay private.
  Copy rows retain their GVVI and recorded condition/format; custom rows retain
  their title. Live catalog/offer changes do not rewrite historical presentation.
- Dynamic, non-revalidated pages use private no-store headers, Cookie variation,
  no-referrer and noindex/noarchive. Metadata contains no order/customer details.
- Package, public sharing, publication and acquisition flags do not gate retained
  order reads. Both account and store navigation expose order history independently
  of package access. Offline manual transaction history remains separate.

## Honest states

The database's immutable minor-unit totals determine displayed prices. A paid fact
does not imply fulfillment, seller payout, refunds resolved or ownership transfer.
Review takes precedence over other labels; paid-and-released remains a review case.
Unpaid pending orders never suggest another payment. Released unpaid orders say
payment was not completed. Unsupported/contradictory projections fail closed or
show review, never a purchase-complete claim.

`checkout=returned` displays only a navigation notice and survives sign-in. No
query string confirms payment. Reload performs private ledger reads, never Stripe
calls, payment mutation, reconciliation, fulfillment or payout. Fulfillment updates
are explicitly unavailable in this candidate. There are no action buttons for
unimplemented financial or fulfillment operations.

## Proof and release

Use the fixed 200xx project and the sequential runner in the operations guide.
UI fixtures seed synthetic order states and exercise actual local Auth/PostgREST
and compiled browser pages; they are not new payment-settlement evidence. Existing
checkout/order proof remains separate. Keep all rollout flags off afterward.
Production deployment, actual Stripe test proof, approved quotes and lifecycle
runtime remain separate. Roll back pages/client changes without deleting records,
restoring consumed inventory or removing obligation reconciliation.
