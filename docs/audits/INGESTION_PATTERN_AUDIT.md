# INGESTION_PATTERN_AUDIT

## Scope

Repository-grounded audit of the current pricing ingestion pattern and replay characteristics.

Files inspected:

- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/pricing/pricing_observation_layer_v1.mjs`
- `backend/pricing/pricing_scheduler_v1.mjs`
- `backend/pricing/pricing_job_runner_v1.mjs`
- `backend/pricing/pricing_backfill_worker_v1.mjs`
- `backend/pricing/pricing_queue_worker.mjs`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`
- `supabase/migrations/20251213153625_baseline_init.sql`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`

## Current Ingestion Pattern

The active truth pricing lane is eBay-only and follows this pattern:

```text
scheduler / backfill
-> pricing_jobs
-> pricing_job_runner_v1
-> ebay_browse_prices_worker
-> pricing_observations
-> ebay_active_price_snapshots
-> ebay_active_prices_latest
-> card_print_price_curves
-> card_print_active_prices
-> v_grookai_value_v1_1
-> v_best_prices_all_gv_v1
```

## Worker Roles

### `pricing_scheduler_v1.mjs`

- ranks stale or important card prints
- reads:
  - `card_print_active_prices`
  - `v_best_prices_all_gv_v1`
  - `ebay_active_prices_latest`
  - `vault_item_instances`
  - `slab_certs`
  - `pricing_jobs`
- determines freshness tiers and queue priority

### `pricing_backfill_worker_v1.mjs`

- finds unpriced higher-rarity cards
- excludes rows already present in `ebay_active_prices_latest`
- inserts queue jobs into `pricing_jobs`

### `pricing_job_runner_v1.mjs`

- authoritative job daemon
- claims `pricing_jobs`
- spawns `pricing/ebay_browse_prices_worker.mjs`

### `pricing_queue_worker.mjs`

- explicitly non-authoritative / deprecated
- not the current insertion path

### `ebay_browse_prices_worker.mjs`

- fetches active eBay browse listings
- pulls details when needed
- detects graded/slab contamination and rejects it
- classifies accepted listing rows into condition buckets
- inserts listing observations through `pricing_observation_layer_v1.mjs`
- writes snapshot summary rows to `ebay_active_price_snapshots`
- upserts latest row into `ebay_active_prices_latest`
- writes rollup history to `card_print_price_curves`

## Snapshot Model

Current repo reality is a snapshot-plus-latest model.

### Snapshot layer

`public.ebay_active_price_snapshots`

- point-in-time summary rows
- keyed by `id`
- multiple rows per `card_print_id` over time are allowed

### Latest layer

`public.ebay_active_prices_latest`

- current compatibility row
- keyed by `card_print_id`
- overwritten/upserted on refresh

### Observation layer

`public.pricing_observations`

- append-only accepted/rejected/staged listing rows
- listing-level, not aggregate variant-level
- gating view `public.v_pricing_observations_accepted` requires:
  - `classification = 'accepted'`
  - `mapping_status = 'mapped'`

## Upsert Logic

Current write semantics are:

- `pricing_observations`
  - insert-only through `insertPricingObservations`
- `ebay_active_price_snapshots`
  - append snapshot row per capture
- `ebay_active_prices_latest`
  - one latest row per `card_print_id`
- `card_print_price_curves`
  - append historical curve row per run

This pattern is deterministic for the current eBay lane because:

- raw listing inputs are normalized before promotion
- accepted observation rows are stored
- latest compatibility state is derived from the fresh run

## Replay Safety

Replay safety is partial but real:

- observation rows are persisted
- accepted batch reads are keyed by `card_print_id + source + observed_at`
- snapshots and curve rows preserve prior runs
- latest rows can be recomputed by rerunning the worker

What is not present in the current truth lane:

- a multi-source warehouse abstraction for vendor aggregate feeds
- a JustTCG-specific ingestion worker
- a JustTCG-specific snapshot/cache domain

## Ingestion Pattern Conclusion

The active pricing ingestion pattern is already tightly specialized for:

- eBay
- listing-level observation intake
- accepted + mapped gating
- raw condition buckets

It is replay-safe enough for the current eBay truth lane, but it is not a generic multi-source ingestion engine. A JustTCG integration that bypasses source isolation or observation-layer semantics would be structurally incorrect.
