# MEE_11G_MARKET_LISTING_BROAD_INTAKE_BACKFILL_PLAN_V1

## Status

Backfill plan only.

No provider calls, source fetches, database writes, pricing observations, public pricing views, app-visible pricing, rollups, card candidate writes, identity writes, vault writes, image writes, deletes, upserts, or merges are executed by this step.

## Purpose

Prepare the first warehouse seed package from the MEE-11F broad Pokemon active-listing smoke.

This is intentionally unmatched intake. The plan stores broad Pokemon listing evidence in `market_listing_*` warehouse tables without assigning listings to card identities yet.

## Source Artifact

```text
docs/audits/market_evidence_engine_v1/mee_11f_market_listing_broad_intake_smoke_2026-06-25T22-38-27-426Z.json
```

Expected source hashes:

```text
source package fingerprint: 15707ae9fdce5423c7dc04133d102df96e3c8c0650309c91ec01cfd53677e1a1
raw snapshot manifest hash: 0efb8cd015a1ba1a7a047ffe8de3621a9bd13457aa1779d8b925615e316d038c
projected observation manifest hash: 7c66f33bf09e02879048cba91c44ea32de0c85fa6e05f745d2a774245c6fe80f
schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4
```

## Proposed Tables

The plan prepares rows for:

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_price_events`

The plan intentionally prepares zero rows for:

- `market_listing_card_candidates`
- `market_listing_rollups`

## Matching Boundary

No card identity matching happens in this step.

Listings may include clean singles, excluded listings, foreign-language listings, sealed listings, graded listings, or noisy listings. Those are warehouse evidence only. Classification and matching happen in later review/modeling steps.

## Next Step

If approved, the next apply package should insert only the planned rows into `market_listing_*` tables. It must not write public pricing, card candidates, rollups, or legacy pricing tables.
