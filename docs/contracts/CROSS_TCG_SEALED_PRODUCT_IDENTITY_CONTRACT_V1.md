# Cross-TCG Sealed Product Identity Contract V1

## Purpose

Define a source-backed, cross-TCG identity boundary for sealed manufacturer
products without mixing them into `card_prints` or `card_printings`.

The TCGCSV source warehouse is evidence. It is not canonical sealed identity,
publication authority, or Grookai product truth. V1 produces candidates and
review queues only.

## Domain Boundary

Sealed products form a separate canonical product domain.

```text
source product evidence
  -> deterministic source classification
  -> sealed identity candidate or review queue
  -> future canonical sealed-product mapping
  -> future exact pricing qualification
  -> future governed publication
```

No V1 output may create or modify:

- `card_prints`;
- `card_printings`;
- canonical sets or games;
- pricing publication rows;
- Vault inventory;
- image or Storage pointers;
- app-facing releases.

## Candidate Identity Ontology

A sealed identity candidate preserves the following independently reviewable
dimensions. A source may leave any dimension unresolved.

| Dimension | Meaning |
|---|---|
| Game/category | Source category and future canonical game owner. |
| Product line/set | Source group or explicitly named product line. |
| Canonical product family | Future grouping for products sharing the same manufacturer product identity. V1 does not assign it. |
| Package form | `pack`, `sleeved_pack`, `booster_box`, `display`, `case`, `deck`, `deck_display`, `kit`, `tin`, `collection`, `bundle`, or `promo_pack`. |
| Language/region | Explicit source category or product-name evidence only. |
| Edition/wave | Explicit edition, wave, version, or volume marker only. |
| Quantity/contents | Explicitly stated counts and contained units only. |
| Release/presale state | Source `presale_info` evidence, including the stated release date. |
| Exact source mapping | Provider, source category ID, group ID, product ID, product name, and source URL. |

The classifier may normalize these fields for planning, but all outputs remain
`candidate_only: true`, `canonical_authority: false`, and
`publication_authority: false`.

## Product Boundaries

### Manufacturer sealed product

An official packaged product containing random or fixed TCG contents and sold
as a product unit. Positive evidence includes a precise package name, explicit
sealed wording, a manufacturer-style contents list, or a stated contained-unit
count.

### Retailer or custom bundle

A repack, lot, assortment, or custom grouping that is not proven to be a
manufacturer product. It remains `ambiguous_review`; it cannot become a
canonical sealed candidate through words such as `bundle`, `box`, or `pack`
alone.

### Loose pack

A single manufacturer booster or promo pack. It is a sealed product candidate
with package form `pack` or `promo_pack`, not an individual card.

### Display

A manufacturer display containing multiple packs or products. A display is not
interchangeable with one pack or one case.

### Case

A manufacturer shipping case containing multiple boxes, displays, decks, or
other sealed units. A card whose name contains the ordinary word `case` is not
a case product.

### Deck

A manufacturer fixed-content playable deck. It is distinct from a `deck_box`
accessory and from a `deck_display` containing multiple decks.

### Individual card

A single card belongs to the card domain even when it has no printed card
number, includes package language in a promotional suffix, or depicts or names
a package. One Piece DON!! cards, tokens, display commanders, oversized cards,
and unnumbered promos remain individual cards when card-specific source fields
support that conclusion.

## Classification Outcomes

- `sealed_candidate`: positive package evidence exists and card evidence does
  not contradict it.
- `nonsealed_card`: card-specific evidence proves an individual card, including
  protected unnumbered cards.
- `ambiguous_review`: evidence is insufficient, conflicting, generic, or
  consistent with a retailer/custom product.
- `excluded_non_tcg_product`: source evidence describes accessories,
  merchandise, or a product without TCG card contents.

No product is classified as sealed solely because:

- it lacks a card number;
- its group or category has a sealed label;
- its name contains an unqualified `pack`, `box`, `case`, `display`, `deck`,
  `collection`, `bundle`, `tin`, or `kit` substring;
- it has a UPC;
- it has a price row or image.

## Evidence Precedence

1. Strong individual-card fields take precedence over packaging-like words in
   a card name or promotional suffix.
2. Explicit card type and rarity protect One Piece DON!! cards and similar
   unnumbered singles.
3. Precise package phrases plus explicit contents or sealed wording support a
   sealed candidate.
4. Accessory-only contents support `excluded_non_tcg_product`.
5. Generic or contradictory terms route to `ambiguous_review`.

Evidence entries must preserve the source field, matched value, rule code, and
strength. Reasons must be deterministic and explainable.

## Read-Only Planner Boundary

The portfolio audit may read the production TCGCSV source warehouse only when:

- the transaction begins with `BEGIN TRANSACTION READ ONLY`;
- `transaction_read_only` is checked and equals `on`;
- a bounded statement timeout is set locally;
- the transaction is committed or rolled back before artifacts are written;
- no query contains mutation or DDL authority.

The planner emits compact counts and bounded deterministic samples. It does not
emit a full source-product dump.

## V1 Invariants

- Sealed products never enter `card_prints` or `card_printings`.
- Missing card number is never sealed evidence.
- Card evidence wins over package-like text embedded in a card identity.
- Package form is not inferred from a partial word match.
- Quantity and contents require explicit source text.
- Language, region, edition, wave, and release state require source evidence.
- Source mapping is exact but remains non-canonical.
- V1 has no migration, write path, publication path, or client surface.

## Exact Next Gate

After the portfolio audit is reviewed, design a bounded canonical sealed-domain
schema and migration plan. That later gate must define immutable family and
variant identities, source mapping uniqueness, price-lane qualification,
service-only staging, RLS, rollback, and a small no-publication canary. V1 does
not authorize that gate to apply.
