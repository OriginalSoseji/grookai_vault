# Vendor Mode Workspace V1

Status: Active

## Purpose

Vendor Mode Workspace V1 is the fast owner-only operating surface for pricing,
organizing, publishing, and sharing exact physical card copies. It reuses Vault
and GVVI authority. It does not create a second vendor inventory, listing
identity, canonical identity, or market-price authority.

```text
card_print / card_printing = canonical identity
GVVI                         = one owned physical copy
Vault                        = ownership authority
Wall intent                  = publication authority
MEE exact printing read      = market reference authority
Vendor Mode                  = owner workflow over those authorities
```

## V1 Scope

The workspace presents every active owner GVVI that resolves to a canonical
card. Each row is one exact physical copy and includes, when available:

- canonical image, name, set, number, variant, and exact printing/finish;
- raw condition, or grader and grade for a slab;
- fresh exact-printing TCGPlayer Market reference for eligible raw cards;
- owner asking price and USD currency;
- dollar and percentage difference from the exact market reference;
- current Wall visibility;
- current custom-section memberships;
- direct public share action and access to the durable GVVI QR/print surface;
- explicit loading, saving, saved, and failed states.

Routine edits occur from this workspace. Card detail and Wall preview are not
required to assign the exact printing, change condition, asking price, Wall
visibility, or section membership.

## Remove From Vault

Each row supports the familiar end-to-start swipe gesture. The revealed action
is labeled `Remove` and uses destructive styling. A swipe never removes data by
itself: it opens a confirmation naming the exact card and GVVI.

Confirmation invokes the existing authenticated
`vault_archive_exact_instance_v1` boundary. This archives one exact
`vault_item_instances.id`; it does not hard-delete canonical, ownership,
pricing, media, or audit data. The row leaves Vendor Mode only after the RPC
returns the same instance, GVVI, and canonical card identity. Other copies of
the same card remain unchanged.

Removing a copy makes that exact GVVI inactive across Vault, Wall, sections,
vendor sharing, and QR resolution through their existing active-instance
boundaries. Cancellation or failure leaves the row visible.

## Mark Sold Or Traded

Each row supports the opposite, start-to-end swipe gesture for an off-platform
disposition. The gesture reveals `Sold / Traded` and opens an explicit choice;
it never mutates data from the swipe alone.

The sheet captures transaction details before any mutation:

- `Sold` requires the actual sale price and accepts an optional buyer name or
  username.
- `Traded` requires a factual description of what was received and accepts an
  optional counterparty.
- A trade may also record cash received or cash paid, with an exact amount and
  currency. Pure trade, trade plus cash, and trade with cash paid are distinct.

Submission invokes the authenticated
`vault_record_exact_instance_disposition_v2` boundary. In one database
transaction it:

- locks and verifies ownership of one active `vault_item_instances.id`;
- appends one immutable `vault_item_instance_dispositions` row;
- snapshots the exact GVVI, canonical card, child printing when assigned,
  condition, prior intent, and asking price when present;
- archives that one exact copy through the existing governed archive boundary;
- returns the same instance, GVVI, canonical card, and disposition for readback.

This outcome records that the copy left the owner's active Vault. The entered
sale price is owner-asserted realized cash; the existing asking price remains a
separate historical snapshot. Counterparty text is owner-private context and
does not claim a verified Grookai identity or transfer ownership into another
collector's Vault. Person-to-person ownership transfers continue to use the
existing card-interaction execution and acceptance workflow.

## Exact Printing Assignment

An unassigned raw copy remains visible in Vendor Mode, but it cannot display an
exact market reference. The row provides an inline selector containing only
`card_printings` that belong to the row's canonical `card_print_id`.

- Assignment updates only the selected owner `vault_item_instances.id`.
- The selected `card_printing_id` must be read back from that same active row.
- The service verifies the printing belongs to the row's canonical parent both
  before and after the write.
- Selecting a printing refreshes market evidence for that exact child only.
- No printing is inferred from the image, condition, asking price, set, sibling
  copies, or a parent-level market row.
- If no child printing exists, the row remains `Printing unassigned` and records
  no exact market reference.

## Exact-Copy Invariants

- One row represents one `vault_item_instances.id` and one GVVI.
- Price, condition, intent, and section mutations target that exact instance.
- Copies of the same printing may look similar but never share mutation state.
- No grouped-card action may silently change sibling copies.
- All owner writes require authenticated ownership and an active instance.
- Archived rows are excluded.

## Publication

The workspace label is `On Wall`. In Vendor Mode, enabling it means
`intent = sell`. A positive asking price is required before a row can be
published for sale. Entering and successfully saving the first valid asking
price may publish the exact copy as `sell` in the same governed mutation.

Disabling `On Wall` sets `intent = hold`. It does not delete the GVVI, asking
price, condition, or section memberships. Existing `trade` and `showcase`
states remain visible until the owner changes them; other product surfaces keep
their existing behavior.

Sharing never publishes a private row implicitly. A private row must be
published through an explicit owner action before the durable public GVVI URL
can be shared.

## Condition

Raw V1 condition values use the existing controlled vocabulary:

- `NM`
- `LP`
- `MP`
- `HP`
- `DMG`

Slabs show grader and grade as recorded. Raw condition controls do not mutate
slab grading fields.

Condition is visible context, not authority to derive or adjust market price.
V1 does not apply condition multipliers or recommend a condition-adjusted
price.

## Market Reference

The workspace may compare an asking price only when the shared governed pricing
read model returns a currently publishable exact `card_printing_id` price with:

- `pricing_scope = card_printing`;
- source `tcgplayer`;
- USD currency;
- fresh status;
- positive market close;
- observed and published timestamps;
- immutable provenance ID.

No parent fallback, sibling-printing fallback, finish substitution, currency
conversion, slab projection, or condition adjustment is allowed. Missing or
ineligible evidence displays `No exact market`.

The comparison is a reference delta, not a pricing recommendation:

```text
variance_amount  = asking_price - exact_market_reference
variance_percent = variance_amount / exact_market_reference * 100
```

User-facing states are:

- `Review below market`
- `Review above market`
- `At market reference`
- `Unpriced`
- `No exact market`

The workspace must not claim that a below-market price is wrong or should be
raised. Condition, sale strategy, and other owner knowledge may justify the
difference.

## Sections

Custom sections remain exact-copy memberships in
`wall_section_memberships`. A copy may belong to more than one active section.
Memberships may be edited while the copy is private and remain preserved when
Wall visibility changes. Private copies never become publicly visible through
section membership alone.

Section creation uses the existing owner section boundary. `Wall` is reserved
and cannot be created as a custom section.

## Save Semantics

- Asking-price publication writes price, currency, pricing mode, and `sell`
  intent together at exact-copy scope.
- Visibility changes preserve asking price and sections.
- Every mutation verifies the returned exact instance and normalized value.
- A failed save remains visible and retryable.
- UI state changes only after authoritative readback succeeds.
- Concurrent or duplicate UI actions are serialized per exact copy.

## Search, Filters, And Ordering

V1 supports text search over card name, set, number, GVVI, and printing label.
Price status includes all cards, priced, and unpriced in one compact persistent
row. Market position includes below market, at market, above market, and no
exact market. Wall visibility includes on Wall and off Wall. Market-position
and Wall-visibility choices remain available from one temporary secondary
filter sheet so filtering does not displace the inventory. `Priced` and
`unpriced` are derived only from the exact copy's owner asking price, so saving
a price cannot make the copy disappear into an unrelated market-evidence
queue.

Default priority is:

1. Priced copies.
2. Within priced copies: below market, above market, at market, then no exact
   market.
3. Unpriced copies.

This ordering keeps completed pricing work visible and is not an instruction to
change a price.

## Sharing And QR

Share uses the durable `https://grookaivault.com/q/{GVVI}` URL. The URL never
contains mutable price, condition, vendor, or identity values. Share is enabled
only for a currently public sale row. The private Vendor Mode row is the
personal vendor card and retains editing, customer preview, QR preview, and 2.5
by 3.5 inch print controls. The customer-facing GVVI landing contains only the
card, current public offer, and shop/collector information; it never renders
owner QR tooling.

## Security And Privacy

- Vendor Mode is authenticated and owner-only.
- Direct table reads and writes remain protected by existing RLS.
- Public QR and GVVI responses remain bounded by `GVVI_VENDOR_QR_V1`.
- Private notes, acquisition cost, user IDs, email, and credentials are not
  added to public responses.
- Vendor Mode adds no anonymous write path.

## Performance

Reads must be paginated and batched. Exact market lookups and canonical image
resolution are performed in bounded chunks. Row mutation must not reload the
entire inventory. The list must preserve stable dimensions while images and
save states change.

## Acceptance Criteria

- All active eligible owner copies are represented once by instance ID.
- A copy not currently on Wall is still available in Vendor Mode.
- Every mutation affects only the selected exact copy.
- Swipe-to-remove requires explicit confirmation and archives only the selected
  exact copy.
- The opposite swipe requires an explicit Sold or Traded choice, appends one
  immutable exact-copy disposition, and archives only that copy.
- A swipe by itself never records a disposition.
- Asking price at disposition is never labeled as realized sale value.
- Sold requires a positive actual price; buyer context remains optional.
- Traded requires received-item context and supports no cash, cash received, or
  cash paid without conflating those values with sale price.
- Counterparty text never mutates or claims another user's Vault ownership.
- An unassigned raw copy can be assigned to a valid exact printing without
  leaving Vendor Mode.
- A printing from a different canonical card can never be assigned.
- Exact printing and finish are visible whenever assigned.
- Raw market comparison is absent for slabs and unassigned printings.
- No inexact or stale market evidence is displayed as exact market.
- Turning Wall off preserves price and sections.
- Share cannot silently publish a private copy.
- Section changes preserve private/public separation.
- Failure states do not present unsaved data as saved.
- The Android workflow is proven on a physical Samsung device.

## Deferred Gates

The following require separate contracts or amendments and are not V1 launch
requirements:

- automatic repricing or recommendations;
- condition-adjusted market values;
- Pulse materiality digests and push notifications;
- bulk percentage or dollar repricing;
- realized-value accounting, counterparty-free trade valuation, and tax/POS
  transaction ledgers beyond the immutable exact-copy disposition record;
- camera-assisted one-confirmation intake;
- checkout, payments, POS, tax, CRM, or marketplace escrow;
- public anonymous Vendor Mode access.

## Contract Relationships

This contract is subordinate to canonical identity, GVVI ownership, Wall
sections, MEE pricing publication, pricing freshness, and GVVI Vendor QR
contracts. When a conflict exists, the stricter identity, evidence, ownership,
or privacy boundary wins.
