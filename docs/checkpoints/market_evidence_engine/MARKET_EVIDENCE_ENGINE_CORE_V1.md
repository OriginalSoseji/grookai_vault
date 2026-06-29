# Market Evidence Engine Core V1 Checkpoint

Date: 2026-06-26

## Why This Reset Happened

The Market Evidence Engine work drifted into eBay acquisition coverage, nightly call economics, and special-card search strategy before the core pricing foundation was fully defined.

That drift created the wrong center of gravity. The engine foundation is not about pricing every card and not about maximizing one provider's nightly yield. The foundation is the deterministic lifecycle that every future market signal must follow before it can influence public pricing.

## Drift Detected

The work drifted in these ways:

- eBay active-listing acquisition started to feel like the engine instead of one adapter.
- Coverage percentages became the planning target before lifecycle state was formalized.
- Special-card availability was treated as a data failure instead of a market reality.
- Nightly orchestration was hardened before the provider-agnostic state machine was documented.
- Internal rollups were discussed near public display before a publication gate existed.

## Core Lifecycle

Every market observation must move through:

1. `acquired`
2. `raw_stored`
3. `normalized`
4. `matched`
5. `classified`
6. `quality_gated`
7. `rollup_eligible`
8. `rolled_up_internal`
9. `publishable`
10. `app_visible`

No provider can skip stages.

## What Providers Are Allowed To Do

Providers may:

- supply raw evidence,
- supply reference or listing payloads,
- supply timestamps, source URLs, seller/source metadata, and price-like fields,
- be stored in provider-specific warehouses,
- be normalized into Grookai evidence shapes,
- contribute to internal review-only rollups after matching, classification, and quality gates.

## What Providers Are Not Allowed To Do

Providers may not:

- create market truth,
- write public pricing,
- write app-visible pricing,
- bypass matching,
- bypass quality gates,
- bypass rollup eligibility,
- directly write `pricing_observations`,
- directly write `ebay_active_prices_latest`,
- mutate card identity,
- mutate vault/user data,
- publish prices because a listing or reference value exists.

## What Can Become Public

Only a future publication contract can make pricing public.

A public price must be:

- derived from completed lifecycle stages,
- replayable to raw evidence,
- backed by explicit quality and publication gates,
- labeled according to source family,
- written through an approved public-pricing pathway.

## What Cannot Become Public

The following cannot become public under this core contract:

- raw provider payloads,
- raw reference metrics,
- active listing asking prices as market truth,
- internal candidates,
- internal rollups,
- unreviewed matches,
- single-source unreviewed signals,
- model output without publication gates.

## Current Verified State

Remote audit verified:

- `market_reference_*` and `market_listing_*` warehouses exist.
- Both warehouse families are service-role-only.
- All new candidates are review-only.
- All new rollups are internal-only.
- `pricing_observations` has zero rows.
- Public pricing view `v_card_pricing_ui_v1` still reads legacy `ebay_active_prices_latest`, not the new Market Evidence Engine warehouses.
- JustTCG is not part of the current public pricing view.

## Why Coverage Strategy Is Outside This Contract

Coverage strategy answers which cards to acquire evidence for and how often.

The core lifecycle answers what every piece of evidence must do before it can matter.

Those are separate problems. Coverage can change by beta needs, user demand, provider limits, or market behavior. The lifecycle must stay stable across all providers and all future coverage strategies.

## Canonical Contract

See:

`docs/contracts/MARKET_EVIDENCE_ENGINE_CORE_V1.md`

