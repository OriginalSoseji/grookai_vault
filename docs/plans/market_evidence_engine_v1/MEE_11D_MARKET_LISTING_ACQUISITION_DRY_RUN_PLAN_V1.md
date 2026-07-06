# MEE_11D_MARKET_LISTING_ACQUISITION_DRY_RUN_PLAN_V1

## Status

Dry-run plan only.

No provider calls, source fetches, database writes, market listing writes, pricing observations, public pricing views, app-visible prices, rollups, identity writes, vault writes, image writes, deletes, or merges are executed by this step.

## Purpose

Prepare an eBay active-listing acquisition plan before any acquisition run.

The dry-run planner reads catalog targets, creates deterministic eBay Browse query requests, estimates call budget, generates cache keys, and writes local audit artifacts.

## Inputs

- `public.card_prints` read-only target rows
- `public.sets` read-only set names
- Market listing warehouse schema proof:
  - migration hash `2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4`
  - package fingerprint `8d8f44b084cb19b4d6af42f3e94fed2f2244de710c946b8f1cc6c87fd0f67451`

## Outputs

- local JSON audit artifact
- local Markdown audit artifact
- request manifest hash
- package fingerprint
- approval prompt for a future capped smoke fetch

## Query Strategy

The planner generates conservative request strategies:

- `special_lane`
- `strict_identity`
- `set_number`
- `name_number`

High-priority lanes include:

- World Championship Decks
- Trainer Kits
- Base Set print-run lanes
- McDonald's
- MEP
- Black Star Promos
- EX-era sets

Low-priority rarity lanes include:

- Common
- Uncommon
- ordinary `Rare`

These rows remain eligible for acquisition, but they sort behind special/collector lanes and receive one conservative `strict_identity` request when selected. Collector-significant rarities such as Holo, Ultra Rare, Secret Rare, Illustration Rare, Double Rare, and related special rarities are not demoted by this rule.

Slab/graded listings are not excluded from large eBay active-listing intake. They are classified separately as `listing_evidence_class = slab` with grader/grade tags where detectable, so slab asking prices can be warehoused and reviewed without contaminating raw-single rollups.

## Budget Policy

Default planning values:

```text
daily_call_ceiling: 4000
max_results_per_call: 200
dry_run_target_limit: 1000
```

The planner may report that the request count exceeds a one-day ceiling. That is not a failure; it means the acquisition should be scheduled across multiple days or capped for a first smoke run.

## Blocked Writes

This dry-run plan must not:

- call eBay
- fetch source data
- write `market_listing_*`
- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public pricing
- create app-visible pricing
- create public price rollups
- modify identity tables
- modify vault tables
- modify image tables
- delete rows
- merge data

## Next Step

After reviewing the dry-run artifact, the next step can be a capped local-artifact-only smoke fetch. That future step still must not write to the database.
