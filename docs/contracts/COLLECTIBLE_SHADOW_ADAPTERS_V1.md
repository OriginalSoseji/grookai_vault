# Collectible Shadow Adapters V1

## Status

`ACTIVE SHADOW CONTRACT`

## Objective

Continuously discover the existence and health of authoritative collectible
catalogs without writing canonical identity, production database state, Storage,
pricing, publication, image pointers, or collector state.

This contract extends the catalog shadow boundary beyond Pokemon, Magic: The
Gathering, and One Piece. It does not declare every registered catalog complete.

## Architecture

```text
official or governed source
  -> source probe and immutable hash metadata
  -> domain-specific candidate parser
  -> shadow candidate index
  -> reconciliation and completeness review
  -> separately authorized canonical promotion
```

The source probe is operational infrastructure. A parser and an identity-complete
candidate index are separate gates.

## Shared Candidate Envelope

Every future candidate must carry:

- adapter ID and version;
- collectible domain;
- source-owned candidate ID;
- source URL and evidence hash;
- domain identity contract;
- observed identity coordinates;
- missing required coordinates;
- explicit `shadow_evidence_not_canonical` authority;
- `canonical_authority: false`.

## Domain Identity Contracts

### TCG Card

Required coordinates are game, language, set or product, and collector number.
Variants include finish, rarity, parallel, stamp, region, and other
printing-specific evidence.

### Vinyl Figure

Required coordinates are manufacturer, product line, franchise, character, and
box number. Variants include mold, chase, finish, exclusive, sticker, region,
and packaging.

### Die-Cast Vehicle

Required coordinates are manufacturer, casting, release year, and series.
Variants include release number, color, wheel type, base, Treasure Hunt status,
exclusive, region, and packaging.

### Sports Card

Required coordinates are manufacturer, year, sport, brand, product, subject,
and card number. Variants include subset, parallel, serial numbering, autograph,
relic, variation, and redemption.

### Comic

Required coordinates are publisher, title, volume, issue number, printing, and
cover. Variants include format, language, retailer, ratio, UPC, ISBN, and cover
artist.

## Registered Source States

- `managed_by_existing_runtime`: already governed by the Universal Catalog
  Discovery system and not duplicated by this worker.
- `official_probe_active`: the official catalog endpoint is monitored, but
  candidate extraction remains closed pending parser and terms review.
- `licensed_source_required`: no source may run until reuse authority and a
  cross-publisher identity contract are established.

## Initial Registry

Existing runtimes remain registered for Pokemon, Magic: The Gathering, and One
Piece. Active official probes cover:

- Yu-Gi-Oh!;
- Digimon;
- Dragon Ball Super Masters;
- Dragon Ball Super Fusion World;
- Star Wars: Unlimited;
- Disney Lorcana;
- Flesh and Blood;
- Gundam Card Game;
- Union Arena;
- Cardfight!! Vanguard;
- Weiss Schwarz;
- Funko;
- Hot Wheels;
- Topps sports cards;
- Panini sports cards;
- Upper Deck sports cards.

Comics remain `licensed_source_required` because no single publisher source
proves cross-publisher issue, printing, and cover identity.

## Rights Boundary

An official source proves provenance, not republication rights.

Until a source-specific rights review changes the contract:

- catalog extraction is `terms_review_required`;
- text republication is not authorized;
- image republication is not authorized;
- self-hosting is not authorized;
- source response bodies are not persisted;
- only URL, status, headers, byte count, and SHA-256 evidence are preserved.

## Runtime Invariants

1. `CATALOG_AUTOMATION_MODE` must equal `shadow-only`.
2. The worker verifies the exact triggering Git SHA.
3. The worker imports no database client and receives no database secret.
4. The worker cannot dispatch a canonical writer.
5. The worker cannot download or persist images.
6. Individual source failures are recorded without inventing candidates.
7. A healthy source probe does not mean its catalog is parsed or complete.
8. New adapters default to no republication and no self-hosting authority.

## Parser Promotion Gate

Each adapter requires all of the following before it can emit identity
candidates:

- source terms and licensing classification;
- checked-in parser fixtures;
- domain identity mapping;
- pagination and variant coverage proof;
- deterministic output and hash tests;
- false-merge and omission tests;
- one bounded live shadow run;
- no production writes.

Canonical promotion remains governed by `CATALOG_SHADOW_AUTOMATION_V1` and
requires separate explicit authority.
