# JUSTTCG_SOURCE_AUDIT_V1

## Scope

This audit evaluates JustTCG as a potential external source for Grookai pricing and identity-adjacent workflows.

This is an audit-only artifact.

The audit does not:

- implement JustTCG ingestion
- modify schema
- modify workers
- modify pricing formulas
- modify UI

This audit is grounded in:

- current Grookai repo doctrine and pricing checkpoints
- current public JustTCG site and API documentation
- current JustTCG public changelog entries visible in the docs site

Important boundary:

- no JustTCG API key was present in repo env or process env during this audit
- therefore JustTCG API behavior was not runtime-probed in this pass
- conclusions about JustTCG API fields and plans are doc-proven, not runtime-proven, unless explicitly stated otherwise

## Source Snapshot

JustTCG currently presents itself as a dedicated multi-game TCG pricing API for developers.

Doc-proven current snapshot:

- homepage markets it as a pricing API, not a canonical identity system
- homepage explicitly lists Pokémon TCG support and claims Pokémon data is updated every 6 hours
- docs expose:
  - `games`
  - `sets`
  - `cards`
- card objects include:
  - `id`
  - `name`
  - `game`
  - `set`
  - `set_name`
  - `number`
  - `rarity`
  - external IDs when available
- variant objects include:
  - `id`
  - `condition`
  - `printing`
  - `language`
  - `tcgplayerSkuId`
  - current `price`
  - `lastUpdated`
  - price history / statistics fields
- docs expose condition and printing filters
- docs expose delta-sync style `updated_after`
- docs show an active changelog with multiple 2025 and 2026 shape changes

Source category classification:

- best classified as a pricing source with some identity-assist structure
- not suitable as canonical identity authority
- not a comps-grade observation source

## Evidence Reviewed

Repo evidence reviewed:

- `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_01_READINESS_AND_RISK.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_02_OBSERVATION_LAYER_DECISION.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_03_CLASSIFIER_HARDENING_AND_OFFLINE_CERTIFICATION.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_04_COMPS_TRUST_SURFACE.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_05_TRUST_SYSTEM_V1.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_06_QUEUE_MODEL_V1.md`
- `docs/audits/PRICING_READINESS_AUDIT_V1.md`
- `docs/audits/PRICING_CONTAMINATION_AUDIT_V1.md`
- `docs/GROOKAI_RULEBOOK.md`
- `docs/backend/tcgdex_ingestion.md`
- `docs/ingestion/POKEMONAPI_NORMALIZE_AUDIT.md`

Repo reality relevant to JustTCG:

- active repo search found no JustTCG ingestion worker, client, or pricing lane
- JustTCG currently appears in repo only as an allowed external source label in schema comments and legacy/raw-import comments
- no `JUSTTCG_*` env vars or API key were present in `.env.example`, `.env.local`, or current process env during this audit

External JustTCG evidence reviewed:

- homepage:
  - `https://justtcg.com`
- API docs:
  - `https://justtcg.com/docs`
- JustTCG blog / changelog evidence:
  - `https://justtcg.com/blog/announcing-multi-condition-and-multi-printing-filters`
  - `https://justtcg.com/blog/level-up-your-app-justtcg-api-now-includes-90-day-market-analytics`

Doc-proven facts used in this audit:

- Pokémon TCG support is publicly claimed
- homepage claims 6-hour update cadence for Pokémon
- docs define card and variant objects
- docs define condition and printing filtering
- docs define rate limits by plan
- docs record breaking ID changes in 2025
- docs record multi-condition / multi-printing support in 2025
- docs record set ID standardization in 2025
- docs record external ID support and delta-sync support in late 2025

Runtime-proven facts used in this audit:

- no JustTCG API key was present in repo env or process env
- no live JustTCG API probing was performed

## Identity Fit

Status: PARTIAL

What JustTCG appears to provide usefully:

- game-level identity
- set-level identity
- human-readable set name
- card number
- rarity
- variant-level separation by:
  - condition
  - printing
  - language
- some external identifiers depending on game

Why this is only PARTIAL for Grookai:

1. Grookai does not allow an external API to become canonical identity authority.
   - Repo doctrine: `docs/GROOKAI_RULEBOOK.md`
   - Canonical identity and pricing checkpoints already lock that identity must remain Grookai-controlled.

2. JustTCG’s IDs have changed materially in 2025.
   - Docs record:
     - July 1, 2025 card ID standardization
     - July 11, 2025 breaking card ID standardization completion
     - September 30, 2025 set ID standardization
   - That is strong evidence that vendor IDs are useful mapping inputs, but too unstable to be treated as Grookai truth.

3. The identity model is pricing-oriented, not canonical-print-oriented in Grookai’s sense.
   - Variant IDs combine market-facing distinctions like condition and printing.
   - Grookai canonical identity must remain independent of vendor pricing packaging.

4. The docs do not prove enough Pokémon-specific canonical-print nuance by themselves.
   - The public docs prove `condition`, `printing`, `language`, `set`, `set_name`, `number`, and `rarity`.
   - They do not, in this audit, runtime-prove that Pokémon-specific finish / promo / sub-variant distinctions line up safely with Grookai print identity without a dedicated mapping contract.

Identity conclusion:

- JustTCG can help with mapping or comparison work
- it must not define canonical set or print identity
- any future use would need explicit mapping into Grookai-controlled identity, not the reverse

## Pricing Fit

Status: PARTIAL

What JustTCG pricing appears to offer well:

- condition-specific pricing
- printing-specific pricing
- variant-level language field
- current price per variant
- update timestamps per variant
- short and medium-window history/statistics
- batch lookup support
- delta-sync support through `updated_after`

What makes it useful:

- it is clearly more pricing-focused than identity-focused
- it exposes pricing at the variant layer rather than only a card-level aggregate
- it has operational features that support efficient reference use:
  - batch lookup
  - external ID lookup
  - updated-after sync

What limits the fit for Grookai:

1. The pricing surface is still vendor-aggregated.
   - Docs expose `price`, `avgPrice`, `minPrice`, `maxPrice`, trend and volatility fields.
   - They do not expose seller/listing comps in the way Grookai’s observation-first pricing model requires for user-facing defendability.

2. The source is not observation-first.
   - Grookai’s current pricing direction is locked by `PRICING_OBSERVATION_LAYER_V1`, `accepted + mapped`, and card-detail comps/trust surfaces.
   - JustTCG appears to expose precomputed market values and history, not listing-level accepted evidence.

3. Current price alone is insufficient for Grookai trust posture.
   - The repo has already moved away from black-box aggregate pricing and toward explainable persisted evidence.
   - JustTCG pricing may be operationally useful as a reference, but it does not align with Grookai’s primary trust lane.

Pricing conclusion:

- useful as a reference or comparison feed
- not suitable as Grookai’s primary user-facing price truth
- not suitable as a replacement for observation-backed comps

## Explainability Fit

Status: FAIL

This is the strongest limitation.

Grookai’s current pricing doctrine requires:

- observation-first intake
- `accepted + mapped` as the only promotion boundary
- the ability to show accepted comps
- the ability to explain filtered rows
- the ability to defend a shown price from persisted evidence

JustTCG does not appear to provide that style of explainability.

Doc-proven limitations:

- variant objects expose aggregated price and historical/statistical summaries
- blog explicitly says full point-by-point 90-day history was intentionally deferred for performance/stability reasons
- no public docs reviewed in this audit show raw listing comps, per-listing provenance, or rejection/exclusion reasoning

Why that fails Grookai explainability:

- Grookai cannot show marketplace comps from JustTCG with the same truth standard it now uses for observation-backed pricing
- Grookai cannot explain why a given card price was accepted or filtered at listing level from JustTCG data alone
- Grookai cannot preserve user trust if a black-box vendor aggregate is surfaced as if it were evidence-backed market truth

Explainability conclusion:

- JustTCG is not compatible with Grookai’s primary explainable pricing lane
- at most it can support internal comparison, reference, or bootstrap analysis

## Dependency Risk

Status: FAIL

Why dependency risk is high:

1. Vendor IDs and shapes have changed materially.
   - Docs show multiple 2025 changes affecting IDs, set IDs, filters, and history fields.
   - That is normal vendor evolution, but high-risk if Grookai depends on JustTCG as infrastructure.

2. Public plan limits are meaningful.
   - Free: `1,000` monthly / `100` daily / `10` per minute
   - Starter: `10,000` monthly / `1,000` daily / `50` per minute
   - Those are real constraints for any productized, high-volume, multi-surface dependency.

3. Grookai would be surrendering too much truth posture if it over-relied on vendor aggregates.
   - Current pricing checkpoints explicitly move Grookai toward controlling its own evidence layer and trust surface.
   - A vendor pricing API is the opposite of “control your own truth layer” if promoted too far.

4. No runtime proof was performed in this audit.
   - No API key was available in repo/env.
   - That means live behavior, auth errors, latency, payload consistency, and operational reliability are UNVERIFIED in this pass.

5. Multi-game product focus is useful commercially but increases Grookai dependency caution.
   - JustTCG is building a generalized vendor platform across many games.
   - Grookai should assume roadmap and response-shape decisions will be vendor-driven, not Pokémon/Grookai-doctrine-driven.

Dependency conclusion:

- safe only if kept at the edge of the system
- unsafe if allowed to become core truth infrastructure

## Product Fit

Status: PARTIAL

Near-term fit:

- useful for internal comparison
- useful for developer/operator reference
- potentially useful for bootstrap analysis of coverage gaps or market sanity checks

Long-term misfit if overused:

- not aligned with observation-first explainable pricing as a primary lane
- not aligned with Grookai-controlled canonical identity
- not aligned with a trust surface that must defend prices from accepted persisted evidence

Product conclusion:

- there is real utility
- but only in a constrained, secondary role
- if used beyond that, it would pull Grookai back toward black-box vendor dependence

## Scorecard

| Domain | Status | Why |
|---|---|---|
| Identity Fit | PARTIAL | JustTCG exposes useful mapping fields like game, set, set name, number, rarity, and variant attributes, but 2025 ID changes and vendor-owned IDs make it unsuitable as canonical identity authority. |
| Pricing Fit | PARTIAL | Condition-specific and printing-specific variant pricing with timestamps and statistics is useful, but it is still vendor-aggregated pricing rather than Grookai-style evidence-backed comps. |
| Explainability Fit | FAIL | Public docs reviewed in this audit do not expose listing-level comps, rejection reasons, or observation-grade provenance needed for Grookai’s explainable pricing standard. |
| Dependency Risk | FAIL | Public rate limits are meaningful, 2025 docs show breaking ID/shape changes, and no live API proof was available in this audit. |
| Product Fit | PARTIAL | Useful as an internal comparison/reference source, but not aligned as primary truth or primary user-facing pricing infrastructure. |

## Final Recommendation

WEAK FIT

Rationale:

- JustTCG is not useless
- it is structurally better than a raw opaque number-only source because it exposes variant-level pricing attributes and history/statistics
- but for Grookai’s actual current direction, the explainability and dependency limits are too strong to rate it higher than `WEAK FIT`

## Recommended Role In Grookai

internal comparison only

More specifically:

- pricing reference only
- optional secondary comparison lane for operators/developers
- optional future bootstrap/reference input for non-authoritative analysis

Not recommended as:

- primary pricing truth
- canonical identity source
- silent fallback source for user-facing prices

## What We Would Use It For

- internal market-reference comparison against Grookai’s own observation-backed prices
- operator sanity checks when Grookai’s own observation lane is sparse
- limited mapping-assist research where external IDs or set/number structure help compare external systems
- future audit/bootstrap work that remains explicitly non-authoritative

## What We Would Not Use It For

- canonical identity authority
- automatic canonical print creation
- primary user-facing Grookai price
- primary comps/trust surface
- accepted observation replacement
- silent fallback when Grookai has no accepted comps
- any role that weakens `accepted + mapped` or observation-first pricing

## Why This Decision Matters

This decision matters because JustTCG is exactly the kind of source that can look attractive for speed while quietly violating Grookai’s deeper direction.

It has real value:

- pricing coverage
- clean docs
- batchable lookup patterns
- condition-specific and printing-specific variant data

But if Grookai lets that utility blur into authority, it would regress on the architectural gains already locked by the pricing checkpoints:

- evidence-first pricing
- explainability
- canonical identity control
- trust surface honesty

The right decision is not “never look at JustTCG.”

The right decision is:

- use it only in roles that do not contaminate truth, identity, or explainability

## Open Questions

1. UNVERIFIED. Live API response behavior under real authentication.
   - No API key was available in repo/env during this audit.

2. UNVERIFIED. Pokémon-specific print/finish edge-case fidelity.
   - Public docs prove generic variant fields, but this audit did not runtime-probe Pokémon promo / finish / language edge cases.

3. UNVERIFIED. Exact operational latency and reliability profile for Grookai-scale use.
   - Docs provide plan/rate information, not live behavior proof.

4. UNVERIFIED. Whether JustTCG exposes enough external identifiers for Pokémon-specific safe mapping at scale.
   - Docs prove some external-ID capability and variant SKU support, but not a full Pokémon mapping contract in this audit.

5. Open design question, not source question:
   - whether Grookai ever wants a non-authoritative vendor comparison lane in the product or only in internal ops
