# In-person sales cart V1

The universal Flutter app exposes **Sales desk** in its signed-in drawer and in
Vendor Mode. iPad landscape shows card artwork and a cart together; portrait and
phones switch between Cards and Cart. This preserves existing Vendor Mode access.

The owner can select active exact Vault copies, enter actual sale prices, or
quick-add descriptions, quantities and prices for items outside the Vault. A
quick-added line is a receipt item: it never creates a canonical card, printing,
GVVI, store listing or quantity balance. Cart edits have no inventory side effects.
Up to 50 lines, manual quantity 1–999, USD positive integer cents, total at most
$1,000,000. Each physical copy appears once and has quantity one. Asking price is
an explicit optional shortcut, never assumed to be the amount paid.

The owner confirms payment received by cash, external card terminal, payment app
or another method. This records an owner assertion; it does not charge a card,
confirm Stripe payment, create an online order, transfer ownership or deliver a
message. Tax is the amount actually collected, not a calculated tax obligation.

`vendor_sales_cart_complete_v1` is the sole batch mutation boundary. It derives
the owner from Auth, locks their receipt book, locks selected copies in UUID order,
rechecks active ownership, calls the existing V2 disposition writer for each copy,
and saves the single receipt/customer in the existing cloud book. Any failure
rolls back every disposition, archive and receipt. Existing stock protection
triggers remain in force; checkout's separate candidate is not imported here.

`vendor_sales_cart_receipts` stores private immutable request/receipt snapshots
and disposition links; no client table access. It adds no foreign keys to catalog
or inventory. One `(owner_id,request_id)` recovers the same receipt with the exact
same payload, including after later sales or feature disablement. Changed reuse
fails. Another account cannot read the result. All copies in a batch resolve to
the same receipt from web transaction history through an owner-scoped RPC.

Both sales-cart and receipt-cloud database controls must be enabled for a new
sale. The new control defaults OFF. There is no environment/client entitlement
bypass. Recovery reads and identical successful retries remain available when
new sales are disabled. Existing receipt/cloud and single-card writers are intact.

The native client persists the exact pending request in account-keyed app storage
before sending. Network ambiguity locks cart edits and retains the request across
relaunch. A retry is the same request, never a new sale. Authoritative transaction
rejection allows correcting the preserved cart. Account changes conceal the desk
and reject writes; drafts never migrate between accounts. Unsubmitted carts are
in-memory with a leave confirmation. This is not offline sale completion.

Optional new customer details are private receipt-book records. Selecting an
existing customer uses the current server record without overwriting changes from
another device. Native Share opens the user's email/message share sheet; the user
sends it. Saved receipts remain accessible in the website account receipt desk.

Release requires strict current415 baseline, full416 replay/no-op push, retained
415-to416 upgrade, actual Auth/RPC concurrency/rollback checks, iPad runtime proof,
normal source hooks and independently verified migration/app release. The
SalesCartBaselineV1 switch is audit-only and explicitly rejects PrePush. The
separate SalesCartReleaseV1 gate admits only the exact migration with full proof. Local
proof is not production activation. Rollback disables new cart completion, retains
all books and sale history, and leaves recovery available.
