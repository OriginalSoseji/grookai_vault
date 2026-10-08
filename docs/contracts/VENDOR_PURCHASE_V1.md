# Vendor buy-only deals

Overhaul Release2 extends the existing Sales Desk to finish a buy with no outgoing
sale items. Catalog intake, a draft offer or a trade on a sale does not establish
that workflow. Current v1/v2/v3 checkout requires outgoing sale lines. Those
writers, saved requests and immutable receipts must retain their existing meaning.

## Transaction and receipt authority

Use an additive `vendor_sales_cart_complete_v4` purchase writer, the existing
owner receipt-book lock, governed printing reader, Vault copy creator and
`vendor_sales_cart_receipts` request journal. No second POS or transaction ledger.
It accepts only an explicit version4/kind purchase request; existing sale/trade
routes keep their existing writers. Recovery reads the original shared journal
before checking availability and preserves the identical request/payload.

The result is a version2/kind purchase receipt in the existing account book.
Its incoming items and `purchaseMinor` describe acquisitions, never sales revenue.
Do not insert a dummy sale item or use a negative sales price. The new receipt has
no sales subtotal, tax, discount or profit fields. Compatible readers dispatch by
receipt kind; sales-only calculations must exclude purchases explicitly. Purchases
count as payouts/cash movements, and costs enter gross profit only when sold with
qualified cost-at-sale evidence. Buying stock is not an event expense by default.

Existing receipt version1 and book version1 retain their semantics. The book may
contain both receipt versions after reader deployment. Backup, import, text/print,
native share, customer history and reports must preserve purchase evidence and
label it correctly. Older readers reject this new receipt shape rather than
silently displaying it as a sale. Deploy compatible readers before enabling the
new default-off control. Rollback disables new buys while retaining recovery and
all saved evidence. Never rewrite an earlier receipt or replay its intake.

## Items, offer and payout

One purchase contains1–50 lines. Each canonical line names one governed card,
printing and condition, has quantity1, and explicitly opts into creating an owned
copy. Repeated printings may represent distinct physical copies; no deduplication
by artwork or catalog ID. A quick line may have quantity1–999 but cannot create
inventory or claim a printing. Manual descriptions remain separate from identity.

Amounts use exact integer USD cents. Each agreed unit amount is nonnegative;
the complete purchase must total1–100,000,000 cents. Zero on one item is a known
agreed cost; a wholly free intake belongs to the existing add flow. Optional
reference value and percentage appear together, with an explicit0.01–100% rate.
The suggested amount rounds half-up once per unit. It is a proposal: the vendor
explicitly chooses the final agreed amount, and overrides remain visible. A saved
buy policy can prefill that proposal without replacing an existing agreed amount.
No market price, missing currency or foreign-exchange rate is inferred.

Reuse the existing split external-payment snapshot with a negative balance equal
to the purchase total. Payout amounts must reconcile exactly; tendered equals
applied, with no incoming cash/change convention. These are recorded external
payments, not charges, money transfers or a stored-credit wallet. Completion
requires explicit confirmation that the physical exchange and payout occurred.

## Atomicity and privacy

The server revalidates every printing/condition, amount and payout before commit.
New copies, explicit USD acquisition costs, customer association, immutable
purchase receipt and request recovery commit in one transaction. Any failure
rolls everything back. Stable request identity prevents duplicates after a lost
response. Changed reuse rejects; owner changes invalidate drafts and late replies.
Never create a replacement request while the original outcome is unresolved.

Purchase completion records agreed acquisition cost independently of the optional
cost-editor switch; that switch controls later editing, not transaction evidence.
The sale-cost capture trigger must explicitly skip purchase requests. Existing
sale snapshots remain unchanged. No owner IDs from clients, base-table grants,
customer messages, public cost exposure or automatic listings are introduced.

## Held offers and client recovery

Web purchase drafts use explicit kind `purchase` with incoming items and no tax or
trade-sale fields. The existing owner journal key and20-deal limit are retained.
Its book version upgrades from2 to3 when a purchase is introduced and never
downgrades automatically. Older clients therefore reject the book instead of
mistaking incoming items for outgoing sales. Existing sale drafts and pending
v1/v2/v3 requests retain their payloads. Purchase requests remain mutually exclusive
with pending catalog intake; a catalog add cannot target a purchase draft.

The stable v4 request is saved before contacting the writer. Reload, retry and
feature-off recovery use that request identity and payload. A purchase receipt
must match the pending request, including agreed prices and payout amounts,
before it is displayed as confirmed. Storage failure, an account change or a
mismatched acknowledgement cannot authorize a replacement purchase.

An offer preview contains only store name, item descriptions, quantities and
agreed amounts. It is labelled unconfirmed until a bound receipt exists. Private
seller contacts, notes, reference percentages and inventory copy IDs are omitted.
Its backdrop must also fully hide the private desk; omitting fields from a
dialog is insufficient when the underlying private reference values remain visible.

Native purchase drafts use explicit kind `purchase` in version2 of the existing
`grookai.sales-drafts.v1` owner book. Version1 sale drafts remain intact; the book
never automatically downgrades after purchase use. Pending requests retain the
existing `grookai.pending-sale.v1` owner key and optional local `draftId` metadata.
Project only `{id,cart}` for strict server-request and acknowledgement validation.
Purchase and catalog staging share an owner queue; storage acknowledgements must
be verified by readback before contacting the writer. Pending purchases block
draft changes until their exact receipt is confirmed. Account changes reject late
replies and close the private UI. Purchase receipts use safe copy/share text;
the separately deferred receipt-delivery provider is not enabled for purchases.

## Exit evidence

Prove1–50 incoming copies without any outgoing sale; mixed canonical/quick items;
zero unit cost and manual overrides; all supported payout methods; exact immutable
receipt and copy-cost readback; printing quarantine and account mismatch; rollback
at the last line; concurrent/identical/changed retries; process restart after a
successful response is lost; feature-off recovery; compatible backup/share and
reports that show purchases as payouts without increasing sales or profit.

Complete model and UI parity on web/native, actual authenticated browser and
Samsung journeys, iOS acceptance, fresh migration replay/retained upgrade/shadow,
ordinary hooks and exact release gates. Preserve all populated prior labs. This
contract is implementation scope, not a claim that those checks or deployment pass.
