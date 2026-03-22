# JUSTTCG_DISPLAY_COMPLIANCE_AUDIT_V1

## Purpose

This audit defines the safest currently supportable UI/commercial usage policy for JustTCG pricing data inside Grookai Vault.

It is audit-only.

It does not:

- modify schema
- modify ingestion
- modify pricing logic
- modify UI code

It exists to answer one question:

What can Grookai safely display, cache, transform, and commercially use from JustTCG today based on official JustTCG sources?

## Sources Audited

Highest-authority sources audited:

- Terms of Service: `https://justtcg.com/terms`
- API Documentation: `https://justtcg.com/docs`

Official supporting product sources audited:

- Homepage / pricing / use cases: `https://justtcg.com/`
- Blog: `https://justtcg.com/blog/from-zero-to-search-build-a-live-tcg-card-finder-with-the-justtcg-api`
- Blog: `https://justtcg.com/blog/efficient-data-syncing-updated-after`
- Blog: `https://justtcg.com/blog/important-update-upcoming-changes-to-our-api-free-tier`
- Blog: `https://justtcg.com/blog/the-definitive-tcgplayer-api-alternative-for-developers-in-2025`

Audit date:

- `2026-03-21`

## Authority Ranking

1. Terms of Service
   - contractual authority
   - highest authority for permitted and prohibited use

2. API Documentation
   - technical usage authority
   - strong evidence for intended implementation patterns

3. Homepage / pricing / FAQ / product pages
   - official product-positioning evidence
   - lower authority than Terms and docs

4. Blog posts / marketing posts
   - lowest authority in this audit
   - useful for intended use cases and engineering direction
   - must not expand rights beyond the Terms

## Findings Summary

Most important findings:

- Paid commercial use is contractually allowed; free-tier commercial use is not.
- JustTCG data is licensed, not sold.
- Raw data resale / redistribution / repackaging is contractually prohibited.
- No trademark or logo license was found.
- API keys must remain server-side.
- Official docs explicitly show product-page display and shopping-cart pricing workflows.
- Official docs and official blog posts support server-side syncing / local database storage workflows.
- No explicit attribution, logo, or link-back requirement was found in the Terms or docs.
- No explicit contractual permission was found for public multi-source comparison or derived composite pricing products.
- A major contract risk exists because the Terms prohibit using the Service or its data for:
  - building competing products
  - competitive analysis

That final point means the following are not safely cleared by the audited sources:

- public side-by-side JustTCG vs eBay comparison UI
- public Grookai Value presentation as a composite derived from JustTCG plus other sources
- any product positioning that could make Grookai look like a competing pricing-data service

## VERIFIED CONTRACTUAL RULES

From `https://justtcg.com/terms`:

- The Service covers the website, API, and associated applications.
- API usage is tier-limited and rate-limited.
- Free tier is personal and non-commercial only.
- Data may be used for your own business or personal purposes according to your tier.
- Raw data may not be resold, redistributed, or repackaged as a competing service.
- Proprietary notices / attributions may not be removed or obscured.
- No trademark / design / copyright license is granted.
- The Service / data may not be used for:
  - building competing products
  - competitive analysis
- Accuracy, completeness, and timeliness are not warranted.

## VERIFIED DOCUMENTATION RULES

From `https://justtcg.com/docs`:

- API calls require an API key via `x-api-key`.
- API keys must not be exposed in client-side code.
- Official examples include:
  - product-page display
  - shopping-cart calculation
  - inventory price sync
- The docs define variant-level pricing fields and card-level lookups.
- `POST /cards` supports bulk requests.
- `updated_after` exists on `GET /cards` and `POST /cards` and is presented as an efficient delta-sync mechanism.
- Docs define minute / daily / monthly rate limits and `429` behavior.

Documentation-level implementation takeaway:

- server-side cache / local sync is an intended usage pattern
- frontend-direct API usage is not
- per-card display and cart display are intended usage patterns

## LOWER-AUTHORITY PRODUCT / MARKETING SIGNALS

From the homepage and official blog posts:

- JustTCG markets itself for:
  - storefronts
  - inventory tools
  - portfolio apps
  - market scanners
  - analysis tools
- Homepage pricing pages position the service for business apps and storefronts.
- Homepage markets:
  - updates every 6 hours
  - 100-card batch requests for Starter / Professional
  - 200-card batch requests for Enterprise
- Official blog posts describe:
  - local database sync
  - storing prices over time
  - public web app / search-tool patterns
  - combining JustTCG with another source as something the vendor says is “encouraged”

Important limitation:

- the blog’s permissive language about combining sources is lower authority than the Terms
- the Terms still contain the “competing products / competitive analysis” restriction

## UNKNOWN / NOT FOUND

Not found in the audited Terms or docs:

- explicit requirement to show “Powered by JustTCG”
- explicit requirement to link back to JustTCG
- explicit permission to use JustTCG logos or brand assets in UI
- explicit cache TTL or stale-display window
- explicit contractual permission for public multi-source comparison UIs
- explicit contractual permission for public derived-value products built partly from JustTCG
- explicit distinction between authenticated in-app display and public website display

Because these were not found, they remain `UNVERIFIED`.

## Compliance Matrix

| Topic | Highest-authority finding | Classification | Safe default for Grookai |
|---|---|---|---|
| Attribution requirements | Terms require preserving any proprietary notices/attributions if present, but no standalone attribution rule was found. | `UNVERIFIED / NO EXPLICIT REQUIREMENT FOUND` | Use plain text source labeling such as `Reference pricing: JustTCG`. |
| Logo / brand requirements | Terms grant no trademark or logo license. | `VERIFIED CONTRACTUAL RISK` | Do not use JustTCG logos, lockups, or branded badges without written permission. |
| Link-back requirements | No link-back rule found in Terms or docs. | `UNVERIFIED` | Optional support link only; do not treat as required. |
| Public display | Docs explicitly show product-page display; Terms allow business use by tier. | `VERIFIED DOCS / CONTRACT-COMPATIBLE` | Public per-card / product-page display is acceptable in conservative form. |
| Commercial / subscription use | Terms allow business use by tier; free tier is non-commercial only. | `VERIFIED CONTRACTUAL RULE` | Use paid tier for Grookai production/public/commercial surfaces. |
| Internal caching / server-side storage | Docs and official blog support sync / local DB patterns. | `VERIFIED DOCUMENTATION RULE` | Server-side cache / DB sync is acceptable. |
| Stale cached display | No explicit stale-display policy found. | `UNVERIFIED` | Show `updated` time and refresh conservatively; do not imply guaranteed live accuracy. |
| Derived metrics | Simple per-card summaries are docs-compatible; broader derived-value products are not expressly cleared. | `PARTIAL / MIXED` | Simple min/max/range is acceptable; multi-source derived pricing is `UNVERIFIED`. |
| Combining with eBay or Grookai Value | Blog says combining is encouraged, but Terms prohibit competitive analysis / competing products. | `UNVERIFIED / HIGH-RISK` | Do not publicly ship side-by-side comparison or Grookai Value as a default UI behavior without vendor clarification. |
| Redistribution / resale of raw data | Terms prohibit reselling, redistributing, or repackaging raw data as a competing service. | `VERIFIED CONTRACTUAL RULE` | No raw dumps, no public dataset mirrors, no bulk exports of vendor data. |
| API key exposure / client-side use | Docs explicitly say never expose the key in client-side code. | `VERIFIED DOCUMENTATION RULE` | Backend-only API access. |
| Freshness / rate / plan constraints | Terms and docs both define plan/rate restrictions; docs define 429 behavior; homepage defines plan batch sizes. | `VERIFIED` | UI must be backed by server-side batching/caching and graceful degradation on quota/rate limits. |

## Allowed Behaviors

Safest currently supported behaviors:

- server-side JustTCG API access only
- paid-tier commercial use for Grookai production surfaces
- internal DB sync / cache of JustTCG data
- per-card or product-page display of JustTCG price summaries
- shopping-cart or price-calculation style use inside the application
- showing a simple JustTCG-derived range or “starting from” summary for a card
- plain-text source identification in UI
- displaying last-updated / freshness context

## Prohibited or Risky Behaviors

Contractually prohibited:

- using the free tier for commercial or business use
- reselling raw data
- redistributing raw data
- repackaging raw data as a competing service
- client-side API-key exposure
- using JustTCG trademarks / logos without permission

High-risk / not safely cleared:

- public JustTCG vs eBay comparison UI as a default product feature
- public Grookai Value display that is materially derived from JustTCG + other sources
- public bulk price tables that could function as a substitute vendor dataset
- positioning Grookai as a competing pricing-data service
- marketing any JustTCG-based number as guaranteed “live” or guaranteed accurate

## Unknowns Requiring Vendor Clarification

The following need written vendor clarification before a broad public rollout:

- whether Grookai’s public multi-source comparison UI is acceptable under the “competitive analysis” restriction
- whether Grookai Value may be shown publicly beside JustTCG if it is a composite / derived price
- whether a public website and an authenticated app are treated differently
- whether JustTCG wants / requires specific attribution wording
- whether a plain-text “Powered by JustTCG” label is preferred, optional, or discouraged
- whether any logo / badge usage is available under a separate brand policy
- acceptable stale-cache window for public display
- whether a consumer-facing price-reference app like Grookai would be considered a “competing product”

## Safe-Default UI Policy For Grookai Vault

Safe policy until vendor clarification:

- show a JustTCG-derived reference price or simple range for a card
- label it as reference pricing, not canonical truth
- keep retrieval server-side
- show freshness / last-updated context
- avoid public side-by-side comparison as the default experience
- avoid public Grookai Value prominence
- avoid logos / brand badges
- do not expose raw variant tables by default
- do not expose raw payloads or downloadable vendor data

Recommended default wording:

- `Reference pricing: JustTCG`
- `Updated from latest JustTCG sync`

Recommended wording to avoid:

- `Official price`
- `Live guaranteed`
- `Market truth`
- `Powered by JustTCG` as if it were a required contractual badge

## SAFE UI BASELINE

### What can Grookai show by default today with highest confidence?

Highest-confidence baseline:

- one JustTCG-derived reference price or simple JustTCG-derived range on a card/product detail surface
- fetched and cached server-side
- with a plain text source label
- with updated / sync timestamp

If JustTCG coverage is missing for a card:

- fall back to eBay with an explicit eBay source label
- do not imply the fallback came from JustTCG

### What wording should appear near JustTCG pricing?

Safest current wording:

- `Reference pricing: JustTCG`
- `JustTCG reference`
- `Updated from latest JustTCG sync`

### Is “Powered by JustTCG” required, recommended, or unverified?

- `REQUIRED`: not found
- `RECOMMENDED`: optional only
- `STATUS`: `UNVERIFIED`

Safe default:

- do not rely on “Powered by JustTCG” as a legal requirement
- prefer plain-text factual source labeling

### Can Grookai show a range derived from JustTCG?

- `YES`, with the narrow interpretation that simple per-card derived summaries are documentation-supported
- official docs explicitly show computing a display-oriented lowest price from returned variants

Safe limit:

- keep it per-card / per-product
- do not expose bulk derived vendor tables that replicate the dataset

### Can Grookai show Grookai Value beside JustTCG?

- `UNVERIFIED / HIGH-RISK`

Reason:

- the Terms prohibit using the Service or its data for competitive analysis / competing products
- Grookai Value is a cross-source derived metric

Safe default:

- do not make Grookai Value a co-equal public display field beside JustTCG yet
- if used at all before clarification, keep it clearly experimental and non-default

### Can Grookai show eBay beside JustTCG?

- `UNVERIFIED / HIGH-RISK` for side-by-side comparison as a product feature

Safe default:

- use eBay as fallback when JustTCG is absent
- avoid default public side-by-side comparison tables until vendor clarification

### Does public website display differ from authenticated in-app display?

- no explicit distinction was found
- `UNVERIFIED`

Safe default:

- treat public website display as the higher-risk surface
- keep public-web usage to simple card-level summaries
- keep richer comparison / experimental derived pricing out of the default public experience

## Final Recommendation

Grookai can proceed with a conservative UI baseline now, but not with full public multi-source comparison confidence.

Recommended immediate path:

- display JustTCG as a server-backed reference price/range
- use plain-text source labeling
- use eBay only as fallback when JustTCG is absent
- keep Grookai Value secondary or withheld from default public UI
- avoid logo use, raw exports, and public side-by-side source comparison

Recommended next compliance step:

- ask JustTCG for written clarification on:
  - competing-product scope
  - competitive-analysis scope
  - public side-by-side comparison
  - Grookai Value style derived outputs
  - optional attribution / branding guidance
