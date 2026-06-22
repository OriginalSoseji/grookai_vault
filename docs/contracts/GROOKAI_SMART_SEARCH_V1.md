# Grookai Smart Search V1

Status: active

Date: 2026-06-17

## Objective

Build a cohesive Grookai search system that uses the enriched canonical database without sacrificing trust.

The user should be able to search naturally:

```text
Give me all reverse holos, Pikachus, from 2014-2026.
```

Grookai should interpret that into safe, visible filters:

```text
Pokemon: Pikachu
Finish: Reverse Holo
Release Year: 2014-2026
Domain: English Physical
```

Then Grookai should run the normal trusted search path against structured filters.

This contract governs the normal Grookai Search box. It improves the existing deterministic search path rather than replacing it with AI.

## Core Principle

Natural language search must not invent truth.

It may interpret intent into allowed filters. It must not generate arbitrary SQL, create DB rows, rewrite canonical identity, or assume unsupported card facts.

Grookai Search must remain free, fast, deterministic, and governed. Grookai Assistant and Grookai Intelligence are separate premium/power-user lanes for AI reasoning.

## Scope

In scope:

- Web search result hierarchy
- Search result card visual polish
- Structured filter model
- Natural language query parsing
- Visible interpreted filters
- Search explainability
- English physical card search
- Ownership-aware filters where supported
- Finish, variant, stamp, set, year, species, artist, image-status filters where supported by DB fields
- Special-case identity families already present in Grookai canon, including retailer stamps, event stamps, recognized errors, first-edition/shadowless/red-cheeks/yellow-cheeks lanes, product lanes, and governed miscellaneous promos

Out of scope for V1:

- DB writes
- migrations
- canonical identity changes
- pricing engine changes
- vault mutation changes
- mobile app implementation
- AI-generated SQL
- AI model calls on the normal Search execution path
- unsupported enrichment assumptions
- Japanese or multilingual expansion

## Search Result Presentation Contract

Search results should feel like Grookai's actual app.

Primary visible hierarchy:

1. card image
2. card name
3. set name and code
4. printed number
5. finish
6. variant or stamp modifier
7. owned state
8. value or price if available
9. image confidence

Secondary or hidden-by-default:

- parent `gv_id`
- child `printing_gv_id`
- diagnostic resolver text
- source/debug labels

These diagnostics must remain available, but they should not dominate normal collector browsing.

## Structured Filter Contract

Natural language must compile into a typed search intent object.

Allowed V1 filters:

```json
{
  "text": "string",
  "species": ["string"],
  "set_codes": ["string"],
  "set_names": ["string"],
  "finish_keys": ["normal", "holo", "reverse", "cosmos", "cracked_ice", "rocket_reverse", "poke_ball_reverse", "master_ball_reverse"],
  "variant_keys": ["string"],
  "stamp_labels": ["string"],
  "rarities": ["string"],
  "release_year_min": 1999,
  "release_year_max": 2026,
  "owned_state": "owned | missing | any",
  "image_state": "exact | representative | missing | any",
  "artist": ["string"],
  "domain": "pokemon_eng_physical",
  "sort": "relevance | newest | oldest | name | set | number"
}
```

Unsupported or ambiguous terms must be preserved as review text, not silently dropped.

Example:

```json
{
  "unrecognized_terms": ["sparkly lightning background"]
}
```

## Natural Language Parser Rules

The parser may recognize:

- Pokemon names
- set names and set codes
- finish names
- variant labels
- stamp labels
- rarity labels
- year ranges
- ownership phrases
- image confidence phrases
- artist phrases
- sorting phrases
- governed special-case families such as WB Kids, Build-A-Bear, Toys R Us, Burger King, Pokemon Center, Prize Pack, League, Championship, Player Rewards, No Symbol, Shadowless, Red Cheeks, Yellow Cheeks, Gold Border, Japanese Card Back, Black Flame, No Damage, D. Fending, Stage, Evolution Box, Sideways Fighting Energy, Incorrect Artist, and related recognized-error labels

The parser must fail closed:

- no arbitrary SQL
- no AI model call during normal Search
- no inferred finishes
- no inferred variants
- no guessed stamps
- no unsupported source facts
- no mutation side effects

## Grookai Search Versus AI Product Boundary

Grookai Search is the free deterministic catalog interface.

Grookai Assistant is premium and may answer collector questions such as:

- what variants am I missing?
- why is this card special?
- build me a chase list
- compare my collection to the Master Index

Grookai Intelligence is a vendor/power-user lane for catalog gaps, demand signals, exports, inventory recommendations, and collection audits.

Normal Search must not call AI models. It may show an upgrade path into Assistant only after deterministic parsing has already run.

## Required Query Examples

V1 must support these examples or explicitly report which term is unsupported:

```text
all reverse holo Pikachu cards from 2014 to 2026
give me every Gengar
all first edition Charizards
cards with Build-A-Bear stamps
all cosmos holo promos from Sword and Shield
every card I own from Evolving Skies
missing Pikachu cards in my vault
all cards with no exact image
all stamped variants from Toys R Us
all cards illustrated by Ken Sugimori
Pokemon Center stamped Lechonk
Build-A-Bear Piplup
Toys R Us Piplup
Dragon Vault Regional Championships
Prize Pack stamped Bronzong
Jungle No Symbol
Base Set Pikachu red cheeks shadowless
Black Flame Ninetales
No Damage Ninetales
Sideways Fighting Energy Diglett
Ancient Mew
Poke Card Creator Pikachu
```

## Explainability Contract

The UI must show what it understood.

Example:

```text
Interpreted as:
Pikachu / Reverse Holo / 2014-2026 / English Physical
```

If terms are not recognized:

```text
Not applied:
"sparkly lightning background"
```

If a filter is unavailable because the DB does not yet support it:

```text
Needs enrichment:
background cameo search is not available yet
```

## Safety Contract

Search V1 must not:

- write to DB
- create migrations
- mutate vault data
- mutate pricing data
- mutate canonical identity
- query via arbitrary natural-language-generated SQL
- call AI models during normal Search execution
- hide unsupported data without explicit user-visible explanation

## Implementation Phases

### Phase 1 - Result Card Hierarchy

Redesign search/explore result cards to reduce database noise and match the app card surface.

### Phase 2 - Structured Filter Model

Create a typed search intent model and deterministic filter application.

### Phase 3 - Deterministic Phrase Parser

Implement rule-based natural language parsing for known filters.

### Phase 4 - Search Explainability UI

Show interpreted filters, unrecognized terms, and unsupported enrichment gaps.

### Phase 5 - Expanded Enrichment Search

Add deeper fields as enrichment matures:

- attacks
- HP
- rule box
- illustrator
- cameos
- products
- language relationships

## Success Definition

Grookai search is successful when:

- result cards feel app-like and collector-first
- natural language queries resolve into visible structured filters
- users can search by finish, species, year, set, stamp, ownership, and image confidence
- unsupported terms are explained honestly
- no DB writes occur
- no search result relies on guessed card truth

## Final Rule

Search can be smart, but it must stay governed.

Grookai should feel magical because the database is structured, not because the search layer guesses.
