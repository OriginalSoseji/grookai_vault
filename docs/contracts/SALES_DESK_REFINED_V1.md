# Refined Sales Desk

The authenticated desktop route `/account/store/sales` and native Sales Desk
combine stock, catalog entry, the current deal, transparent trades and a customer
view. Existing asking prices remain visible independently of negotiated prices.
Stock keeps one row per active owner copy, including slab-only parent anchors.
The catalog reuses the governed resolver and public printing options. A new
catalog sale copy is explicitly created as Hold, with no store enrollment.

The desktop API uses the signed-in RLS client and the existing catalog-add and
sale completion RPCs. An expected owner ID detects account changes; it never
grants another owner's access. Reads are private/no-store. Copy reads are bounded
to 48 per page; catalog pagination follows the resolver's supported metadata.
Unpaged catalog results are matches, not a completeness guarantee. No market
price is inferred. Final ownership, reservations, printing eligibility and cents
remain the existing writers' responsibility.

Native startup checks authority and recovery first. Inventory and receipt
history hydrate independently, allowing quick entry before those reads finish.
Native catalog entry stays beside the cart on wide screens. Native trade search
uses explicit 64-result pages instead of collecting every page before display.
Search failures retain the query; stale results cannot be chosen during a new
search. Existing native catalog cache bounds remain unchanged.

## Editable drafts and attempted requests

Desktop drafts use owner-specific localStorage with Web Locks and revision
comparison. Native drafts use owner-specific SharedPreferences with a serialized
writer and revision comparison between screens. Both retain up to 20 drafts and
bound serialized data to two million characters. Corrupt data is preserved and
reported rather than silently reset. Native attempted-sale recovery remains
available if a separate editable-draft record is unreadable.

Holding a deal does not reserve online inventory or extend the existing cart
reservation timer. Availability is rechecked on completion. Drafts are local to
that browser/device, not synchronized across devices. Explicit discard affects
only editable local work, never inventory or recorded receipts.

Before a mutation, retain the exact request ID and payload. Unknown results stay
locked for recovery. Account changes hide customer data and prevent further
writes. Native catalog recovery is cleared only after its resulting cart update
has been saved. Switching native held deals or completing a new sale is blocked
while a catalog add still needs recovery. Completed native drafts are removed by
their recorded draft ID, keeping recovery safe if the app stops between clearing
the editable draft and clearing the attempted-sale journal.

## Customer view and reporting

Customer view explicitly projects card descriptions/images, asking/deal prices,
trade reference values/percentages/credits, tax and balance. It excludes customer
contact information, wish lists, private notes, costs and internal copy IDs.
The view is a deal preview, not a payment confirmation.

Desktop reporting deduplicates receipt IDs, filters dates/query/payment method,
shows hourly sales, units, average sale, recorded tax, trade credit, received
amounts and customer payouts, and exports formula-safe CSV. Dates/hours use the
device time zone. It reports owner-recorded in-person receipts. It does not claim
to reconcile online orders, refunds, processor settlements or profit.

## Scope and release

No new schema, identity writer, payment processor action, commission change or
sender activation is introduced by this refinement. It is integrated over the
separate default-off receipt-delivery candidate. Direct sending still requires
the deferred sender setup and delivery proof; a share sheet is not delivery.

Further operations work remains separate: split tender, store-credit accounting,
returns and unified online/in-person financial reporting. Bulk intake already
exists and has not been rewritten in this change. Collector/vendor matching and
optional follower memberships remain future product work, not implemented here.

Release requires normal repository checks and separate web/native deployment
proof. Roll back clients/routes while retaining receipt and draft data. Never
reset a repair database or repeat a prior migration/upload intent to recover.
