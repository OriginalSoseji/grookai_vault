# MEE_11E_MARKET_LISTING_ACQUISITION_SMOKE_FETCH_V1

## Status

Approved capped acquisition smoke only.

This step may call the eBay Browse API for a tiny capped request batch from the MEE-11D dry-run plan. It writes local artifacts only.

## Purpose

Verify the active-listing acquisition path can fetch real eBay Browse responses and project them into local market listing warehouse-shaped artifacts before any database backfill is prepared.

## Scope

Allowed:

- use the approved MEE-11D dry-run request manifest
- fetch a capped smoke batch
- write local JSON and Markdown audit artifacts
- project raw responses into local observation candidates

Blocked:

- database writes
- `market_listing_*` writes
- `pricing_observations` writes
- `ebay_active_prices_latest` writes
- public pricing views
- app-visible pricing
- public price rollups
- identity-table writes
- vault writes
- image writes
- deletes
- merges
- global apply

## Default Cap

```text
request_limit: 5
result_limit_per_request: 5
```

The script hard-caps request limit at 25 and per-request result limit at 10.

## Next Step

If the smoke fetch succeeds, the next step is a DB backfill plan only. That plan should prepare row counts and hashes for inserting local smoke artifacts into `market_listing_*` warehouse tables, but it must still perform no writes until separately approved.
