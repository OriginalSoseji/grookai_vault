# PRICING_EVIDENCE_ENGINE_V1

## Status

Active governance contract.

This contract defines the architecture and safety rules for a future world-class Grookai pricing engine that may ingest free, free-tier, licensed, uploaded, or manually reviewed pricing evidence.

It does not authorize any new provider integration, database write, scraping job, migration, UI exposure, or vendor claim by itself.

## Purpose

Grookai pricing must be built as an evidence system, not a single mutable price field.

The engine must attach market evidence to already-governed Grookai identities while preserving the existing pricing lane separation:

- Market Truth
- Reference
- Projection
- Manual/Admin Evidence

Pricing evidence must never decide canon. Canon identifies the card. Pricing only evaluates an already-identified card, finish, edition, stamp, condition, slab state, or collector lane.

## Scope

This contract governs future work for:

- external pricing provider mappings
- pricing evidence ingestion
- pricing observations
- provider confidence and review state
- pricing rollups and display eligibility
- free or free-tier provider use
- user-uploaded price exports
- manual/admin pricing evidence
- compliance boundaries for non-API market sources

This contract does not govern:

- card identity creation
- printed identity or variant canon
- image confidence
- vault ownership truth
- marketplace listing/selling flows
- schema details until a separate migration plan is approved

## Authority

Higher-authority pricing contracts remain binding:

- `STABILIZATION_CONTRACT_V1`
- `PRICING_CONTRACT_INDEX.md`
- `PRICING_UI_CONTRACT_V1`
- `PRICING_FRESHNESS_CONTRACT_V1`
- `MARKET_ANALYSIS_FOUNDATION_CONTRACT_V1`

If this contract conflicts with any higher-authority pricing contract, the higher-authority contract wins.

## Pricing Lane Model

### Market Truth

Market Truth remains the strictest lane.

Unless a later explicit contract version changes this, Market Truth is:

- eBay-only
- observation-backed
- accepted and mapped only
- fail-closed under source throttling or ambiguity
- never filled from reference providers
- never filled from projection outputs

Reference providers such as TCGCSV, TCGdex, Pokewallet, JustTCG, PriceCharting CSV exports, or user-uploaded exports do not become Market Truth by default.

### Reference

Reference pricing may be sourced from free, free-tier, licensed, or intentionally published provider data.

Reference pricing may support:

- card detail reference display
- internal cross-checks
- missing-market context
- projection inputs, where explicitly allowed
- mapping confidence review

Reference pricing must be labeled as reference and must not be blended into Market Truth.

### Projection

Projection is modeled pricing.

Projection may use reference evidence only when a later implementation contract defines:

- model inputs
- confidence thresholds
- stale-data handling
- bounds
- UI labels
- backtest requirements

Projection must never feed back into Market Truth.

### Manual/Admin Evidence

Manual/Admin Evidence may be used for rare, under-covered, or special-market cards.

Manual/Admin Evidence must include:

- source type
- observed price
- currency
- condition or slab state, if known
- observed date
- reviewer or importer identity
- confidence
- explanation or note

Manual/Admin Evidence must not silently override provider evidence. It must remain reviewable and auditable.

## Provider Classes

### Allowed Candidate Provider Classes

Future implementations may evaluate these provider classes:

- intentionally published CSV or JSON datasets
- no-key public APIs whose terms permit application use
- free-tier APIs with clear rate limits and API keys
- paid or licensed APIs
- user-uploaded marketplace exports
- admin-entered evidence from publicly reviewable sources

### Candidate Sources

The following are candidate reference sources only until separately implemented and verified:

- TCGCSV daily/current snapshots
- PokemonTCG.io embedded TCGplayer/Cardmarket reference price buckets
- TCGdex card response pricing
- Pokewallet free-tier card pricing
- JustTCG free-tier pricing
- PriceCharting authorized CSV/API exports, as optional reference benchmarks only
- user/admin-uploaded eBay listing or sold-item exports
- user/admin-uploaded TCGplayer inventory, sales, or market exports
- user-provided TCGplayer/eBay/seller exports
- admin-reviewed rare-card evidence

No candidate source is authoritative merely because it exists.

The engine must not require a paid provider to function. Paid or licensed sources may improve coverage, benchmark matching, or corroborate other evidence, but Grookai pricing must remain source-pluggable and capable of operating from user-owned exports, free/reference lanes, and reviewed manual evidence.

## Provider Mapping Rules

Every external price must map through an explicit provider mapping layer before it can influence any Grookai display or rollup.

Mappings must include:

- provider name
- provider product/card identifier
- Grookai target identifier
- target layer: parent print, child printing, slab, sealed, or other explicit lane
- match basis: exact ID, set-number-name, alias, manual, import, or review
- match confidence
- reviewed status
- first seen timestamp
- last verified timestamp

Mappings must not mutate:

- `card_prints` identity
- `card_print_identity`
- child printing identity
- set identity
- image truth
- ownership/vault state

### Provider Finish Normalization Boundary

A provider price field may classify evidence or select an existing governed child printing. It may never prove, create, restore, delete, or rename canonical printing identity.

For TCGdex Cardmarket evidence:

- an explicit `-<finish>` key suffix is preserved as the evidence finish hint;
- an unsuffixed key resolves to Holo only when the raw card payload explicitly has `variants.holo === true` and `variants.normal === false`;
- missing, partial, both-true, both-false, or contradictory variant metadata retains the legacy Normal evidence hint and remains review-gated;
- every normalized row preserves the raw metric key, both source variant flags, raw import/snapshot lineage, and resolver version.

The Normal fallback exists only for market-evidence compatibility. It is not Normal-printing truth. If the corresponding governed child printing does not exist, the evidence remains unmatched or review-only.

## Identity Match Requirements

Pricing evidence may attach to a Grookai row only when the match is sufficient for the intended lane.

High-confidence card pricing should match:

- normalized name
- set or provider set identity
- printed number
- finish or provider variant
- language
- edition, stamp, or collector lane when applicable

Special lanes require stricter treatment:

- Base Set Shadowless
- Base Set 1st Edition
- Base Set 1999-2000
- Staff Stamp
- prerelease/event stamp
- McDonald's confetti holo or collection-specific variants
- World Championship replica/signature lanes
- deck-exclusive or product-exclusive cards
- slabs and grades

If a provider cannot distinguish a Grookai lane, its evidence must either:

- remain unmatched
- attach only to a broader reference lane with low confidence
- or be blocked from display

## Observation Ledger Rules

Pricing evidence must be append-oriented.

Each observation should preserve:

- provider
- provider object ID
- Grookai target ID, if matched
- price amount
- currency
- source metric: market, low, mid, high, sold, listed, index, export, manual
- condition
- finish
- edition/stamp/lane, if available
- raw versus slab state
- grade company and grade, if slabbed
- observed timestamp
- provider updated timestamp, if supplied
- ingestion timestamp
- mapping confidence
- evidence confidence
- source class

Observation ingestion must not overwrite canonical identity or delete prior observations.

## Rollup Rules

Rollups must be derived from observations and mappings, not from UI state.

Rollups may compute:

- current reference estimate
- current market estimate
- low/high range
- median or weighted estimate
- recent sold range
- 7/30/90-day trend
- volatility
- stale flag
- source count
- confidence

Rollups must preserve lane separation:

- Market Truth rollups cannot consume Reference or Projection evidence.
- Reference rollups cannot be labeled Market Truth.
- Projection rollups must be labeled as modeled.

## Confidence Rules

Every displayed price must have a confidence state.

Allowed confidence states:

- high
- medium
- low
- blocked
- unavailable

High confidence requires a strong identity match and current enough evidence for the display context.

Low confidence must not power vault totals unless a later contract explicitly allows a low-confidence mode.

Blocked evidence must not display.

Unavailable evidence must render as no pricing data, not as a synthetic fallback.

## Compliance Rules

Grookai must prefer authorized or intentionally published data access.

Allowed:

- official APIs
- free-tier APIs within their published limits
- provider-published CSV/JSON downloads
- user-uploaded exports
- admin-entered evidence
- licensed feeds

Forbidden unless legal/vendor review explicitly approves it:

- scraping pages that prohibit automated access
- bypassing login, CAPTCHA, bot protection, or paywalls
- scraping at scale against hostile or unclear terms
- collecting seller/private account data without authorization
- republishing provider datasets as a competing dataset
- exposing raw vendor tables or bulk provider content in public UI
- using provider logos or endorsement language without permission

The product must not claim real-time pricing unless the provider contract and refresh proof support it.

## UI Rules

Pricing UI must remain honest and source-labeled.

Allowed labels:

- `Market estimate`
- `Reference pricing`
- `Updated daily`
- `Updated X hours ago`
- `Low confidence`
- `Pricing unavailable`
- `Modeled estimate`

Forbidden labels without explicit proof:

- `Live price`
- `Official price`
- `Guaranteed value`
- `Exact value`
- `Best price`

Public surfaces must be stricter than authenticated surfaces.

Public surfaces may show a simple reference price or range only when allowed by provider terms and existing UI contracts.

## Operational Rules

Provider fetches must be:

- rate limited
- cached
- retry-bounded
- observable
- fail-closed
- source-attributed internally

Broad backfills must be explicitly approved. Demand-driven and vault-first refresh remains the safer default unless a future contract changes that strategy.

## Forbidden Behavior

The following are contract violations:

- using pricing evidence to create or alter canon identity
- silently falling back from Market Truth to Reference
- blending Reference and Market Truth into one unlabeled number
- displaying low-confidence evidence as ordinary pricing
- making real-time claims from daily snapshots
- storing provider content beyond what is required for audit and display
- bypassing provider rate limits or access controls
- hiding source class from internal audit records
- using pricing to overwrite image, identity, or ownership truth

## Verification

Future implementations under this contract must provide:

- provider terms/rate-limit review
- mapping coverage report
- unmatched evidence report
- blocked evidence report
- lane contamination audit
- stale-data audit
- confidence distribution report
- sample display audit
- rollback plan

No production promotion is allowed without a proof that:

- Market Truth did not consume Reference or Projection evidence
- Reference display is labeled
- uncertain mappings fail closed
- low-confidence evidence cannot inflate vault totals
- no provider access rule was bypassed

## Related Artifacts

- `docs/contracts/PRICING_CONTRACT_INDEX.md`
- `docs/contracts/PRICING_UI_CONTRACT_V1.md`
- `docs/contracts/PRICING_FRESHNESS_CONTRACT_V1.md`
- `docs/contracts/MARKET_ANALYSIS_FOUNDATION_CONTRACT_V1.md`
- `docs/system/RESUME_PRICING_V1.md`
