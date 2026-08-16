# One Piece Canonical Catalog Import Contract V1

## Status

Read-only readiness contract. No database, Storage, image, pricing, release, or
client apply is authorized.

## Objective

Define a complete, evidence-preserving One Piece Card Game catalog
candidate model from the TCGPlayer TCGCSV source warehouse. The source
warehouse is market and catalog evidence. It is not publication authority.

This contract inventories every category `68` source product and separates it
into exactly one readiness class:

- exact single-card candidate;
- sealed-product candidate for a separate sealed catalog;
- ambiguous or malformed source row held in quarantine.

No class is discarded. Classification is reversible and source payloads remain
authoritative evidence.

## Sources And Authority

TCGCSV category `68` supplies source groups, products, product metadata, image
references, presale metadata, and Normal/Foil market lanes. Source product ID
and source price-row identity are stable evidence keys.

The readiness planner may inspect production only in an explicitly proven
read-only session and `BEGIN READ ONLY` transaction. It must roll back and close
the connection before writing local artifacts.

TCGPlayer category membership, product title, and extended metadata can prove a
source product exists. They do not independently authorize a Grookai release,
public display, image pointer, or price publication.

## Canonical Parent Boundary

One exact TCGPlayer single-card product is one candidate `card_print` parent.
This boundary is intentionally conservative because One Piece TCGPlayer
products commonly separate base art, alternate art, manga art, tournament
versions, winner versions, and other treatments even when the printed card
number is shared.

```text
identity_domain = one_piece_tcgplayer_print
identity_key_version = ONE_PIECE_TCGPLAYER_PRINT_IDENTITY_V1
candidate parent gv_id = GV-OP-TCGP-<productId>
source mapping = tcgplayer:<productId>
```

The identity payload preserves:

- category, group, and product IDs;
- exact product name;
- exact printed Number when present;
- Number grammar family without rewriting the source token;
- CardType and Rarity;
- language claim and its authority;
- explicit treatment claims from the source product name;
- release and presale state.

`Number` alone never defines a parent. Multiple products may legitimately
share one printed number.

## Printing And Finish Boundary

Source price subtypes are candidate child printing lanes beneath the source
product parent:

```text
Normal -> normal child
Foil   -> foil child
```

A subtype lane is exact only when its immutable
`source_price_row_identity` references the same source product. A product ID
without subtype is not a finish-specific price identity.

No child printing rows are planned or written by this gate. Finish vocabulary,
source-lane uniqueness, and release controls must pass a later database-aware
shadow gate.

## Numbered Cards

A numbered single-card candidate requires:

- category `68`;
- a valid positive source product ID;
- a nonempty source product name;
- structured `Number` evidence;
- a supported structured `CardType`: Character, Event, Leader, Stage, or DON!!.

Standard number families currently include `OP##-###`, `ST##-###`,
`EB##-###`, and `P-###`. Explicit nonstandard numbers remain candidates and
retain their original value. The planner does not rewrite or reject an exact
source number merely because it falls outside known grammar.

## DON!! Cards

Missing `Number` does not mean sealed.

An unnumbered DON!! source product is an exact single-card candidate when
structured source evidence identifies `CardType = DON!!` or `Rarity = DON!!`.
A title-only DON!! phrase is insufficient when structured evidence is absent or
when packaged-product evidence conflicts.

Distinct DON!! designs remain separate source-product parents. They may not be
merged because they share rules text or omit a number.

## Promotions And Treatments

The following are parent-level treatment or distribution claims, not finish
substitutes:

- alternate art and parallel;
- manga;
- tournament, winner, championship, and Treasure Cup;
- prerelease and anniversary;
- serialized and gold variants;
- other exact source-title qualifiers preserved verbatim.

Promos with `P-###` numbers are numbered single-card candidates. Tournament or
winner products carrying an existing `OP`, `ST`, or `EB` number remain distinct
parents from the ordinary version because their source product and treatment
evidence differ.

No treatment may be inferred from price, image similarity, card number, group
name alone, or another product's metadata.

## Alternate Arts Sharing A Number

Shared printed numbers are expected. Base art, alternate art, parallel art,
manga art, tournament versions, and winner versions can share card rules and
number while remaining distinct collectible identities.

The candidate key therefore includes the source product ID and preserves the
source treatment claim. A future independent official catalog may reconcile
these candidates, but this gate cannot merge or invent identities.

## Starter Deck Boundary

A starter-deck group can contain both:

- numbered single cards from inside the deck; and
- the sealed starter deck or display product itself.

They are separate identities. Group membership never makes all rows sealed.
Structured numbered card rows remain single-card candidates. An unnumbered
product explicitly named as a Starter Deck or Display, with no structured card
metadata, is a sealed-product candidate.

## Sealed Product Separation

Sealed boxes, cases, packs, displays, starter decks, deck sets, double packs,
gift collections, promotional bundles, and similar packaged products must not
become `card_print` rows.

This gate records them as `sealed_product_candidate` for the independent sealed
catalog contract. It creates no sealed canonical row. Accessories such as
playmats, sleeves, binders, portfolios, deck boxes, and storage boxes remain
quarantined until a separate accessory domain exists.

Packaged-product title evidence is accepted only when structured card metadata
does not conflict. Any packaging/card conflict is quarantined.

## Language

Unmarked category `68` products store an English source-default claim as
`tcgplayer_category_68_default_unverified`. Explicit language text in a product
are quarantined before any apply plan. Explicit Japanese and other supported
language products remain valid One Piece candidates and keep their language as
an identity dimension; they are not silently forced into English.

A later promotion gate must prove every language lane it intends to apply. This
planner does not mutate or infer another language from artwork, name spelling,
group, or price.

## Future Releases And Presales

Future and presale products remain fully warehoused and classified. They are
not eligible for current canonical promotion while either condition holds:

- `presale_info.isPresale = true`; or
- the explicit release date is later than the frozen audit date.

Their promotion state is `future_or_presale_hold`. Arrival of the release date
requires a fresh source readback; it does not make an old artifact publishable.

## Exact TCGPlayer Mapping

The exact parent source key is `tcgplayer:<productId>`. Exact price evidence is
the source warehouse's immutable `source_price_row_identity`, including subtype.

The resolver may not choose a winner from:

- normalized name similarity;
- card number alone;
- group similarity;
- image similarity;
- price or popularity;
- another source product's metadata.

Any duplicate source product key or price-lane owner is a collision and must be
quarantined. Collisions never authorize deterministic tie-breaking.

## Malformed And Ambiguous Rows

Rows are quarantined when evidence is insufficient or contradictory, including:

- invalid product/category identity;
- malformed extended metadata;
- Number without a supported CardType;
- a non-DON CardType without Number;
- title-only DON!! evidence;
- packaged-product and card evidence conflict;
- accessory-only evidence;
- no reliable single-card or sealed evidence.

Quarantine is preservation, not deletion. Every source product remains in the
deterministic manifest with its evidence and reason codes.

## Images

Source image URLs are acquisition references only. This gate performs no
network acquisition, Storage write, byte hashing, image repoint, or client
display. A later image contract must self-host and verify exact bytes before any
canonical pointer can change.

## Hidden Release Requirement

Canonical readiness never authorizes app visibility. Before any durable write:

1. define a service-only immutable staging boundary;
2. prove RLS and grants deny `anon` and `authenticated`;
3. freeze the exact candidate fingerprint and write envelope;
4. prove existing Pokemon, Japanese, MTG, Vault, pricing, and image rows cannot
   change;
5. apply only after a separate explicit approval;
6. keep One Piece hidden from canonical search, clients, and publication until
   an independent release gate passes.

## Readiness Audit Artifacts

The permanent audit must contain:

- `run_plan.json` with producer commit, branch, as-of date, source category, and
  zero-write boundaries;
- `summary.json` with read-only proof and classification counts;
- deterministic `source_product_manifest.jsonl.gz` containing every source
  product exactly once;
- `REPORT.md`;
- `artifact_hashes.json` with logical and compressed manifest hashes.

Large raw source payloads must not be committed. The warehouse remains the raw
evidence authority.

## Invariants

- No source row is discarded.
- Missing Number does not mean sealed.
- A sealed starter deck and the cards inside it are separate identities.
- Card number alone cannot merge treatments or products.
- Canonical metadata can guide classification but cannot invent a printing.
- Future and presale rows remain evidence, not current promotion candidates.
- Warehouse presence never authorizes publication.
- No database, migration, Storage, pricing, Vault, image, release-control,
  deployment, or client write occurs in this gate.
- No Pokemon, Japanese, MTG, or active MTG ingestion state is modified.

## Exact Next Gate

The service-only staging design and rollback canary plan are governed by
`ONE_PIECE_CANONICAL_IMPORT_STAGING_AND_ROLLBACK_CANARY_V1.md`. The plan must use
the frozen manifest fingerprint, preserve singles, DON!!, sealed, quarantine,
language, and release states as distinct evidence lanes, keep One Piece hidden,
and stop before any database execution or durable apply.
