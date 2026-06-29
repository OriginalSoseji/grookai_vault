# Market Listing Nightly Ingest Run V1

- Package: `MARKET-LISTING-NIGHTLY-INGEST-RUN-V1`
- Mode: `dry_run_readiness_no_provider_calls_no_db_writes`
- Ready for run approval: `true`
- Run attempted: `false`
- Run key: `MEE-DROPLET-2026-06-27`
- Contract hash: `2b87af4aa106d5ee621c2c212a9c6508e70ef9a41186b6a8b82b9b58644813d0`
- Package fingerprint: `e3c49b30148a50bd774875ec77708134a00d889e569278828e6bb4e76f2a423e`

## Phase Plan

```json
[
  {
    "key": "dry_run_plan",
    "command": "node scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs",
    "provider_calls": false,
    "db_writes": false
  },
  {
    "key": "daily_batch_plan",
    "command": "node scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs --call-limit=4000",
    "provider_calls": false,
    "db_writes": false
  },
  {
    "key": "daily_batch_fetch",
    "command": "node scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs --allow-dynamic-plan",
    "provider_calls": true,
    "db_writes": false
  },
  {
    "key": "daily_batch_backfill_plan",
    "command": "node scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs --allow-dynamic-plan",
    "provider_calls": false,
    "db_writes": false
  },
  {
    "key": "daily_batch_backfill_apply",
    "command": "node scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs --allow-dynamic-plan --apply",
    "provider_calls": false,
    "db_writes": true
  },
  {
    "key": "strict_filtered_rollup_plan",
    "command": "node scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs",
    "provider_calls": false,
    "db_writes": false
  },
  {
    "key": "strict_filtered_rollup_apply",
    "command": "node scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs --run-key=MEE-DROPLET-2026-06-27 --apply",
    "provider_calls": false,
    "db_writes": true
  },
  {
    "key": "nightly_readback",
    "command": "node scripts/audits/market_listing_nightly_ingest_readback_v1.mjs --run-key=MEE-DROPLET-2026-06-27",
    "provider_calls": false,
    "db_writes": false
  }
]
```

## Preflight

```json
{
  "existing_scripts": [
    {
      "phase": "dry_run_plan",
      "script_exists": true
    },
    {
      "phase": "daily_batch_plan",
      "script_exists": true
    },
    {
      "phase": "daily_batch_fetch",
      "script_exists": true
    },
    {
      "phase": "daily_batch_backfill_plan",
      "script_exists": true
    },
    {
      "phase": "daily_batch_backfill_apply",
      "script_exists": true
    },
    {
      "phase": "strict_filtered_rollup_plan",
      "script_exists": true
    },
    {
      "phase": "strict_filtered_rollup_apply",
      "script_exists": true
    },
    {
      "phase": "nightly_readback",
      "script_exists": true
    }
  ],
  "planned_strict_rollup_versions": [
    "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_DROPLET_2026_06_27",
    "MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1__MEE_DROPLET_2026_06_27"
  ],
  "strict_rollup_presence": {
    "by_version": {},
    "existing_planned_strict_rollup_count": 0
  },
  "dynamic_backfill_apply_support": true,
  "missing_scripts": []
}
```

## Findings

- none

## Approval Prompt

```text
Approve real MARKET-LISTING-NIGHTLY-INGEST-V1 run only. Package fingerprint: e3c49b30148a50bd774875ec77708134a00d889e569278828e6bb4e76f2a423e. Contract hash: 2b87af4aa106d5ee621c2c212a9c6508e70ef9a41186b6a8b82b9b58644813d0. Scope: run one bounded overnight Market Listing ingestion cycle using existing approved market_listing_* warehouse schema only. Allow up to 4000 ebay_active Browse API calls, local acquisition artifacts, warehouse inserts into market_listing_acquisition_runs, market_listing_query_cache, market_listing_raw_snapshots, market_listing_observations, market_listing_seller_snapshots, market_listing_price_events, review-only market_listing_card_candidates, and internal-only market_listing_rollups. Keep raw_single and slab lanes separated. Apply strict title evidence filtering before rollup medians are calculated. Keep all candidates and rollups needs_review=true, publishable=false, app_visible=false, market_truth=false, and can_publish_price_directly=false where applicable. No public pricing views. No app-visible pricing. No pricing_observations writes. No ebay_active_prices_latest writes. No JustTCG public pricing. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No migrations. No deletes except exact same-run market_listing_* repair cleanup. No merges. No global apply. Produce final audit report before stopping.
```
