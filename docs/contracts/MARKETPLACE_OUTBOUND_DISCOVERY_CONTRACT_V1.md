# MARKETPLACE_OUTBOUND_DISCOVERY_CONTRACT_V1

## Status

Planning contract only.

No implementation. No DB changes. No provider calls. No public UI changes. No marketplace integration. No affiliate integration.

## Why This Exists

Grookai is building a Market Evidence Engine that separates valuation evidence from live availability. The next product layer is outbound marketplace discovery: helping collectors decide where to buy after Grookai has explained value, confidence, and market pressure.

This contract preserves the product direction without starting the build.

## Objective

Define the long-term contract governing how Grookai connects collectors to external marketplaces.

This is not a pricing contract.

This is not a marketplace contract.

This defines how Grookai uses external marketplaces as discovery and purchasing destinations while remaining marketplace-agnostic.

## Core Philosophy

Grookai exists to help collectors make better decisions.

Grookai is the market intelligence layer.

External marketplaces remain transaction venues.

Grookai should never force collectors into one marketplace.

## Relationship To Market Evidence Engine

Market Evidence Engine answers:

- What is Grookai Value?
- What evidence supports it?
- What is available today?
- Is the live market above, below, or aligned with the value anchor?
- What is blocked, uncertain, or not publishable?

Marketplace Outbound Discovery answers:

- Where can the collector inspect matching listings?
- Which marketplace options are most relevant?
- Which listings appear to match the exact collector intent?
- When should Grookai send the collector away to complete a transaction?

Active listings may support market pressure and outbound discovery, but active listings do not become market truth merely because they are outbound purchase options.

## Product Principles

Collectors should be able to:

- understand Grookai Value
- understand live market availability
- compare marketplaces
- choose where to buy
- leave Grookai only when ready to complete a purchase

## Initial Marketplace

Initial outbound marketplace:

- eBay

Future marketplaces may include:

- TCGplayer
- Cardmarket
- Fanatics Collect
- PWCC
- Goldin
- local game stores
- Grookai Marketplace
- additional providers

The architecture must remain marketplace-agnostic.

## Collector Experience

Example product flow:

```text
Grookai Value
  -> Available Today
  -> Market Intelligence
  -> View Matching Listings
  -> Collector chooses destination
  -> Marketplace completes transaction
```

Grookai should keep the collector inside Grookai while they are evaluating value, confidence, market status, and listing fit.

Grookai should send the collector outbound only when they are ready to inspect or complete a purchase on a transaction venue.

## Outbound Listing Rules

Grookai should link to listings that match:

- exact card identity
- exact finish
- exact language
- raw vs slab lane
- grade when applicable
- condition when known and supported by the marketplace
- variant or special-lane identity when applicable

Links should avoid generic marketplace searches whenever possible.

If exact listing links are not available, Grookai may show a clearly labeled marketplace search fallback, but it must not present that fallback as exact-card availability.

## Affiliate Strategy

Support affiliate programs where available.

Affiliate monetization must never:

- alter marketplace ranking
- bias listing recommendations
- hide better buying opportunities
- prioritize commission over collector value
- downgrade non-affiliate marketplaces when they are better matches

Collector trust always overrides affiliate revenue.

## Marketplace Ranking

Ranking should consider:

- identity correctness
- finish correctness
- raw vs slab correctness
- grade match
- price
- shipping
- seller quality
- condition
- availability
- marketplace reliability
- stale listing risk

Affiliate status must not be a ranking factor.

## Marketplace Abstraction

Every marketplace adapter should normalize outbound opportunities into a provider-agnostic shape before UI ranking.

Minimum conceptual fields:

- marketplace provider
- marketplace listing id
- listing URL
- affiliate URL when allowed
- card identity match status
- finish match status
- language match status
- raw or slab lane
- grade details when slabbed
- condition details when raw
- ask price
- shipping price
- seller metadata
- listing freshness
- availability status
- confidence flags
- exclusion flags

Provider-specific fields may be stored as metadata, but the collector-facing ranking and display layer must operate on the normalized shape.

## Analytics

Track anonymous outbound metrics such as:

- marketplace selected
- listing selected
- click-through rate
- conversion estimate when available
- price differences
- marketplace availability
- active ask compared to Grookai Value
- search fallback usage
- listing mismatch reports

These analytics should improve collector recommendations over time.

Analytics must not convert affiliate revenue into a ranking factor.

## Future Multi-Marketplace View

Possible future collector view:

- Grookai Value
- Available Today
- eBay
- TCGplayer
- Cardmarket
- Local Stores
- Grookai Marketplace

Grookai should become the collector's decision layer, not simply another storefront.

## Public Copy Boundaries

Allowed:

- "Available Today"
- "View matching listings"
- "Compare marketplace options"
- "Active ask"
- "Marketplace availability"
- "Listing appears to match this card"
- "Search fallback"

Avoid:

- claiming Grookai is the seller when it is not
- implying Grookai guarantees an external listing
- implying an affiliate link is the best option because it monetizes
- using active ask as Grookai Value
- presenting generic searches as exact matches

## Success Metric

Success is not maximizing affiliate revenue.

Success is helping collectors confidently decide where to buy while creating sustainable revenue through trusted outbound referrals.

## Deliverables For A Future Build

When this work resumes, produce:

- product contract refinement
- UX flow
- marketplace abstraction architecture
- affiliate integration strategy
- ranking policy
- analytics policy
- future multi-marketplace roadmap
- implementation plan
- tests before public UI changes

## Explicit Non-Goals

This contract does not:

- publish prices
- create Grookai Marketplace
- create checkout
- replace Market Evidence Engine
- define pricing truth
- rank by affiliate payout
- write marketplace data
- create app UI
- change public pricing views

## Resume Notes

This contract should resume after the reference/evidence-anchored public pricing bridge is reviewed and merged.

The bridge work established the separation between:

- Grookai Value
- Available Today / active ask pressure
- blocked value states
- raw vs slab lane separation
- provider evidence vs public valuation

Marketplace Outbound Discovery should build on that separation instead of collapsing it.
