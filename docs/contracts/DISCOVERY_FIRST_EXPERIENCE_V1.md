# DISCOVERY FIRST EXPERIENCE V1

## Objective

Make Grookai feel like a collector intelligence system, not a card database.

The navigation names stay stable:

- Search
- Pulse
- Dex
- Wall
- Vault

The product upgrade keeps the behavior-first surfaces clear. Pulse is the activity and discovery surface; the upgrade is exposing the relationships Grookai already knows:

- card identities
- child printings
- variants
- stamp families
- recognized errors
- species and Dex progress
- sets
- cameos
- ownership state
- image truth
- master-index confidence

## Core Principle

Every discovery entry point should answer:

> What is this collectible, why does it matter, and where does it fit in the collector graph?

Not merely:

> Which rows match this query?

## Experience Contract

### 1. Search Remains Search

Search is the default user verb. Do not rename it to Explore, Discover, or Intelligence.

Search must evolve from card lookup into collector intelligence.

Required behavior:

- natural language queries remain accepted
- exact cards remain findable
- variant/stamp/error families are highlighted when detected
- ownership/vault context participates when available
- result pages should lead with meaning before rows when the query clearly maps to a family or identity

### 2. Vault Remains Vault

Vault is Grookai's ownership surface.

Required behavior:

- Vault owns collection state
- Vault should link outward to Dex, Search, Sets, and identity/family pages
- Vault should eventually show missing related variants, not just owned rows

### 3. Dex Remains Dex

Dex is the Pokemon character completion surface.

Required behavior:

- Dex must be visible in mobile and desktop app navigation
- Dex must reflect vault ownership
- Dex must link back into Search for cards, cameos, variants, and missing printings

### 4. Pulse and Wall Remain Tangible

Do not replace them with generic "Community".

Required behavior:

- Pulse should show activity and discovery
- Wall should show collector identity
- both surfaces should connect back to cards, sets, Dex, and variant families

## Discovery Layer

Grookai needs one mental model above the individual surfaces:

```text
Collector
  Search
  Dex
  Vault
  Pulse
  Wall
```

This layer is expressed in UI through:

- homepage discovery modules
- search intelligence headers
- identity/family landing sections
- cross-links between Search, Dex, Vault, Sets, and card detail pages

## Homepage Requirements

The homepage should not read as generic marketing.

It should immediately communicate:

> Grookai understands collector relationships between cards.

Required modules:

- hero search
- trending or featured identities
- featured variant/stamp/error families
- recent discoveries or recent canon updates
- logged-in collector snapshot when available

Acceptable examples:

- WB Kids Stamp
- Pokemon Center Stamp
- Build-A-Bear Workshop Stamp
- No Symbol Jungle
- Shadowless Base
- Red Cheeks Pikachu
- cards with Gengar cameos

## Search Results Requirements

When a query maps to a known family or identity, the top of Search should show an intelligence panel before cards.

Example:

```text
WB Kids Stamp
Promo stamp family
11 identities found

Why it exists
...

Why collectors care
...
```

The panel must be source-backed where claims are factual.

Do not invent explanatory text without a governed source or curated copy.

## Identity And Family Pages

Future target pages should expose:

- identity name
- category
- counts
- why it exists
- why collectors care
- known cards
- related families
- vault ownership status
- search links

These pages may begin as generated panels inside Search before becoming routable pages.

## Implementation Order

### Phase 1: Homepage Discovery

Build a collector-first homepage using existing data and curated links.

No DB writes.
No schema changes.

### Phase 2: Search Intelligence Header

Add query-aware panels for known families and identity concepts using existing curated metadata.

No AI required for free search.

### Phase 3: Cross-Surface Links

Add links:

- Search to Dex
- Dex to Search
- Vault to Dex/Search
- Card detail to variant family/search

### Phase 4: Routable Family Pages

Promote family panels into durable pages once the metadata model is governed.

## Guardrails

Do not:

- rename Search, Vault, or Dex
- hide primary navigation behind abstract language
- create AI dependency for core free search
- present unsupported facts as truth
- create DB writes as part of this UI pass
- change canonical identity logic
- change pricing, vault mutation, or scanner behavior

## Success Definition

This phase succeeds when:

- users can immediately see that Grookai understands card relationships
- Search feels like collector intelligence, not row lookup
- Dex and Vault feel connected to Search
- variant/stamp/error families are visible as first-class collector concepts
- navigation names remain stable
- no canonical data behavior changes are required
