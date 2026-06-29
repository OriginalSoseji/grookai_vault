# MEE_11A_MARKET_LISTING_WAREHOUSE_CONTRACT_V1

## Status

Contract plan only.

No migration was created. No database writes, provider calls, source fetches, scraper jobs, pricing observations, public pricing views, rollups, app-visible price rows, or marketplace features were executed.

## Purpose

Define the warehouse contract for collecting, storing, replaying, and reviewing active market listing evidence at scale.

This contract exists because Grookai needs a durable pricing evidence foundation that does not rely on paid current-pricing feeds and does not mistake active asking prices for completed market sales.

The first concrete source lane is:

- `ebay_active`

Future lanes may be added only by explicit contract amendment.

## Governing Rules

This plan is subordinate to:

- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_02_WAREHOUSE_IMPLEMENTATION_PLAN_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_04A_SOURCE_REGISTRY_AND_EVIDENCE_CONTRACT_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_09D_REFERENCE_SIGNAL_ROLLUP_CONTRACT_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_10A_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_10G_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1.md`

Locked invariants:

- Active listings are asking-price evidence only.
- Active listings are not sold comps.
- Active listings are not Market Truth.
- Active listings must not directly write `pricing_observations`.
- Active listings must not directly write `ebay_active_prices_latest`.
- Active listings must not directly write public card price summaries.
- Active listings must not become app-visible pricing until a later promotion contract exists.
- Active listing rows must remain reviewable, replayable, and removable from any downstream model without losing raw provenance.
- Raw listing payloads are immutable snapshots.
- Listing observations and price changes are append-only event history.
- Rollups are derived artifacts and must be rebuildable from warehouse rows.
- Query acquisition must respect provider limits, daily budgets, caching, and resumability.
- JustTCG must not be used as a current acquisition source or public pricing source. Historical rows may remain untouched.

## Non-Goals

This contract does not:

- create migrations
- create provider clients
- execute eBay API calls
- scrape pages
- publish prices
- create price recommendations
- create buyer/seller marketplace workflows
- classify card condition from images
- infer sold prices from active listings
- use user-uploaded vault data as market truth
- expose seller analytics publicly

## Source Semantics

`ebay_active` means:

- the listing was observed as currently active or recently active through an approved acquisition route
- the displayed price is an ask price, not a confirmed sale
- shipping, currency, quantity, seller metadata, listing format, and listing status are part of the evidence envelope
- the same listing may be observed multiple times over time
- price reductions, quantity changes, title changes, and listing end states are meaningful signals but not final value

Every active listing evidence object must keep:

```text
market_truth = false
app_visible = false
publishable = false
needs_review = true
model_eligible = false by default
```

A later contract may promote reviewed aggregate signals into a model input, but it must not promote raw active listings directly to public pricing.

## Target Architecture

```text
query plan
  -> provider budget gate
  -> acquisition run
  -> query cache
  -> raw listing snapshot
  -> listing observation
  -> seller snapshot
  -> listing/card candidate match
  -> price event history
  -> internal review queue
  -> internal rollup candidate
  -> later promotion contract
```

This path is intentionally separate from:

```text
free reference evidence
  -> market_reference_* warehouse
  -> internal reference signal rollups
```

and from:

```text
public pricing
  -> v_card_pricing_ui_v1
  -> card detail pricing rail
  -> vault value displays
```

## Proposed Data Domains

This section describes the intended warehouse domains. It is not a migration specification.

### 1. Acquisition Runs

Role:

- stores run-level provenance for active-listing acquisition
- records provider, source version, budget, route count, query count, result count, errors, retries, and resume cursor state
- allows overnight jobs to stop and resume without duplicating work

Required properties:

- run key
- source name
- source mode
- contract version
- acquisition strategy
- started and finished timestamps
- query budget requested
- query budget consumed
- summary counts
- local artifact paths and hashes when applicable

### 2. Query Cache

Role:

- stores the exact query sent to a provider and the normalized cache key
- prevents repeated calls for the same target/query window
- supports daily API budget management
- supports ranking query templates by yield

Required properties:

- provider
- query text
- filters
- target card identity hints
- normalized query key
- page or cursor metadata
- response hash
- observed timestamp
- expiration policy

### 3. Raw Listing Snapshots

Role:

- stores immutable provider payloads exactly as received
- supports replay after parser changes
- preserves listing data even when downstream matching changes

Required properties:

- source
- source listing id
- source URL
- raw payload
- payload hash
- observed timestamp
- acquisition run id
- query cache id

Required behavior:

- append-only
- no card matching fields required
- no public price fields
- no truth claims

### 4. Listing Observations

Role:

- extracts stable listing-level fields from raw snapshots
- tracks one observation of a listing at one point in time
- powers price-change detection and stale-listing detection

Required properties:

- source listing id
- listing title
- listing URL
- listing status
- listing format
- current ask price
- currency
- shipping price when available
- total ask price when available
- quantity available
- quantity sold when available
- condition text
- item location when available
- observed timestamp
- raw snapshot pointer

Important rule:

- observed ask price is not a sale price.

### 5. Seller Snapshots

Role:

- records public seller metadata visible through the acquisition route
- supports seller consistency, duplicate listing grouping, and reputation weighting
- does not store private user data

Allowed fields:

- public seller username or provider seller id
- feedback score when available
- feedback percentage when available
- seller location when available
- store name when available
- observed timestamp

Blocked fields:

- private contact information
- account credentials
- buyer information
- user vault owner information

### 6. Listing Card Candidates

Role:

- maps a listing observation to one or more possible Grookai card identities
- keeps matching separate from raw acquisition
- allows ambiguous listings to remain useful without becoming pricing truth

Required properties:

- card print id when known
- Grookai id when known
- source listing id
- title match features
- set match features
- number match features
- finish/variant hints
- condition hints
- exclusion flags
- confidence score
- review status

Required behavior:

- ambiguous candidates stay review-only
- sealed lots, graded slabs, mixed lots, damaged lots, and non-card products require explicit exclusion or special handling
- no candidate may publish a price directly

### 7. Price Events

Role:

- records observed changes in asking price or listing state
- supports seller price reduction history
- supports listing lifecycle analysis

Event examples:

- first_seen
- price_changed
- shipping_changed
- quantity_changed
- title_changed
- ended
- relisted
- unavailable

Required behavior:

- append-only
- event source must point back to observations
- price events remain active-listing evidence, not sold comps

### 8. Internal Rollups

Role:

- summarizes active-listing evidence for review and later modeling
- separates raw asks from reviewed value signals
- provides coverage, spread, stale listing, and outlier diagnostics

Allowed internal metrics:

- listing count
- seller count
- median active ask
- trimmed active ask range
- minimum active ask after exclusions
- maximum active ask after exclusions
- currency coverage
- stale listing count
- reviewed candidate count
- exclusion reason counts

Required flags:

```text
needs_review = true
publishable = false
app_visible = false
market_truth = false
```

## Query Budget Contract

The first overnight acquisition design may assume:

```text
max_results_per_call: 200
planned_daily_call_ceiling: 4000
theoretical_daily_listing_envelope: 800000
```

These numbers are planning ceilings, not guaranteed throughput.

Every acquisition job must:

- enforce a hard daily call ceiling
- support a lower dry-run ceiling
- persist progress before each provider call
- persist progress after each successful provider call
- skip cached query windows unless explicitly refreshed
- stop cleanly on provider throttling
- stop cleanly on authentication failure
- write an audit artifact before any DB apply package is prepared

## Matching Policy

Initial matching should be conservative.

Positive signals:

- exact Pokemon name
- exact set name or accepted alias
- exact printed number
- explicit finish words
- explicit variant words
- title image or provider category confirming TCG single card

Negative signals:

- lot
- bundle
- bulk
- proxy
- custom
- jumbo
- oversized
- digital
- code card
- pack
- box
- sealed
- booster
- graded unless the lane explicitly supports graded evidence
- PSA, CGC, BGS, ACE, SGC unless the lane explicitly supports graded evidence
- damaged, altered, signed, miscut, error unless the target identity requires it

World Championship, staff, stamp, print-run, promo, McDonald's, Trainer Kit, and special-lane cards require stricter matching than ordinary set cards.

## Promotion Gates

No listing evidence may become public pricing until a later contract defines:

- minimum evidence count
- minimum seller diversity
- stale listing rules
- exclusion filters
- currency handling
- shipping handling
- graded/raw separation
- sealed/single separation
- condition treatment
- outlier policy
- review workflow
- rollback workflow
- user-facing language

The earliest acceptable user-facing phrasing for promoted active-listing data is:

```text
Active listing evidence
```

Not acceptable:

```text
Market price
Sold value
Comps
Fair value
Grookai value
```

## Compliance Boundary

Provider access must use approved routes and respect provider terms, credentials, rate limits, and robots or API restrictions.

The warehouse may store public listing metadata acquired through an approved route. It must not attempt to bypass access controls, paywalls, anti-bot systems, or private account data.

If a provider route changes or becomes restricted, acquisition must stop and the source lane must be re-reviewed before continuing.

## Operational Safety

Every overnight job must produce:

- local acquisition manifest
- local request manifest
- local response/error summary
- local dedupe summary
- local match summary
- provider budget summary
- DB apply plan only, unless explicitly approved later

Every DB apply must require a user approval prompt with:

- operation name
- fingerprint
- manifest hash
- row counts
- target tables
- blocked writes
- explicit no-global-apply clause

## Blocked Writes

This contract must not directly:

- write `pricing_observations`
- write `ebay_active_prices_latest`
- write `v_card_pricing_ui_v1`
- write public pricing views
- write app-visible pricing rows
- write vault value rows
- write identity tables
- write image tables
- modify card identity
- modify set identity
- delete historical JustTCG data
- delete market reference rows
- merge pricing sources
- mark active listings as sold comps
- mark active listings as Market Truth

## First Implementation Sequence

1. Create schema candidate for the listing warehouse domains.
2. Create contract tests for blocked writes and required flags.
3. Build dry-run query planner with a small target set and zero provider calls.
4. Build provider budget gate and cache key generator.
5. Run a tiny acquisition-only smoke with local artifacts only.
6. Prepare a DB apply plan for raw snapshots only.
7. Add observation parser and event detector.
8. Add conservative card candidate matcher.
9. Add internal rollup candidate with all public flags false.
10. Review coverage and quality before any public pricing promotion is designed.

## Approval Boundary

Creating this contract does not approve:

- migrations
- remote schema apply
- provider calls
- acquisition jobs
- DB backfills
- public pricing changes
- app pricing changes
- rollup publication

The next approval, if desired, should be for a local schema candidate only.
