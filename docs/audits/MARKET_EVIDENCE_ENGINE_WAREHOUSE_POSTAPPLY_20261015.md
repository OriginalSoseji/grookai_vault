# Market Evidence Engine Warehouse Post-Apply Readback — 2026-10-15

## Status

The warehouse schema is already present in production. The targeted apply attempt was rejected by PostgreSQL because `market_listing_acquisition_runs` already existed; this was an idempotency signal, not a partial apply.

Production migration history contains:

- version: `20260625050000`
- name: `market_listing_warehouse_v1`

## Schema proof

- all eight contracted `market_listing_*` tables exist;
- row-level security is enabled on all eight;
- each has one service-role policy;
- no acquisition or pricing write was performed by the failed re-apply attempt.

## Current warehouse reality

The production catalog already contains large internal evidence volumes. PostgreSQL catalog estimates reported approximately:

| Table | Estimated rows |
| --- | ---: |
| `market_listing_query_cache` | 36,286 |
| `market_listing_raw_snapshots` | 7,946,791 |
| `market_listing_observations` | 7,906,024 |
| `market_listing_seller_snapshots` | 764,280 |
| `market_listing_card_candidates` | 3,229,508 |
| `market_listing_price_events` | 8,032,116 |
| `market_listing_rollups` | 165,002 |

Recent acquisition runs are completing through `ebay_browse_api`.

Sampled rollups and card candidates remain fail-closed:

- `needs_review = true`
- `publishable = false`
- `app_visible = false`
- `market_truth = false`
- `can_publish_price_directly = false`

## Decision

Do not run another smoke fetch. The next work is `MEE-12` review-gate reconciliation:

1. reconcile the warehouse's existing acquisition volume with the lifecycle/review read model;
2. measure candidate and rollup disposition coverage without counting raw rows as prices;
3. identify the smallest deterministic review batch that can become qualified evidence;
4. keep all public pricing gates closed until accepted + mapped observation proof exists.

No public pricing, app-visible pricing, or market-truth promotion is authorized by this readback.
