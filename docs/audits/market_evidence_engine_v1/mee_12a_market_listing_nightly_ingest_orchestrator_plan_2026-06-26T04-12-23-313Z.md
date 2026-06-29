# Market Listing Nightly Ingest Orchestrator Plan V1

- Package: `MARKET-LISTING-NIGHTLY-INGEST-ORCHESTRATOR-PLAN-V1`
- Ready for overnight run approval: `false`
- Package fingerprint: `e0db539effa23d9b1cea69e86f5f28093ff7d9839350859a3a390fe74eda770c`
- Contract hash: `2b87af4aa106d5ee621c2c212a9c6508e70ef9a41186b6a8b82b9b58644813d0`
- Call ceiling: `4000`

## Phase Plan

### 1. Build prioritized acquisition worklist

- Status: `available`
- Command: `node scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs`
- Boundary: local artifact only; no provider calls; no DB writes

### 2. Slice one bounded daily/nightly batch

- Status: `available`
- Command: `node scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs --call-limit=4000`
- Boundary: local artifact only; no provider calls; no DB writes

### 3. Fetch eBay active listing evidence

- Status: `available_after_single_approval`
- Command: `node scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs --batch-plan=<phase-2-artifact>`
- Boundary: provider calls allowed only within approved call ceiling; local artifacts only

### 4. Prepare warehouse backfill package

- Status: `available`
- Command: `node scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs --fetch=<phase-3-artifact>`
- Boundary: local package only; no provider calls; no DB writes

### 5. Apply internal warehouse rows

- Status: `available_after_single_approval`
- Command: `node scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs --plan=<phase-4-artifact>`
- Boundary: market_listing_* warehouse inserts only; no candidates or rollups

### 6. Compute strict-filtered candidate and rollup package

- Status: `partially_available`
- Command: `node scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs`
- Boundary: currently local artifact only; strict title filtering before medians

### 7. Apply strict-filtered review-only candidates and rollups

- Status: `available_after_single_approval`
- Command: `node scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs --plan=<phase-6-artifact>`
- Boundary: market_listing_card_candidates and market_listing_rollups only; all rows non-public and review-only

### 8. Final morning readback

- Status: `available`
- Command: `node scripts/audits/market_listing_nightly_ingest_readback_v1.mjs --run-key=<nightly-run-key>`
- Boundary: read-only report; confirms no public/app-visible pricing

## Existing Script Check

```json
[
  {
    "path": "scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs",
    "exists": true
  },
  {
    "path": "scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs",
    "exists": true
  },
  {
    "path": "scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs",
    "exists": true
  },
  {
    "path": "scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs",
    "exists": true
  },
  {
    "path": "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs",
    "exists": true
  },
  {
    "path": "scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs",
    "exists": true
  },
  {
    "path": "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.md",
    "exists": true
  },
  {
    "path": "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json",
    "exists": true
  }
]
```

## Missing Implementation

- `scripts/audits/market_listing_nightly_ingest_run_v1.mjs`: needed to execute the one-approval end-to-end nightly run under MARKET_LISTING_NIGHTLY_INGEST_V1

## Findings

- nightly_orchestrator_missing_final_apply_or_readback_scripts

## Approval Prompt

```text
Approve real MARKET-LISTING-NIGHTLY-INGEST-V1 run only. Contract hash: 2b87af4aa106d5ee621c2c212a9c6508e70ef9a41186b6a8b82b9b58644813d0. Scope: run one bounded overnight Market Listing ingestion cycle using existing approved market_listing_* warehouse schema only. Allow up to 4000 ebay_active Browse API calls, local acquisition artifacts, warehouse inserts into market_listing_acquisition_runs, market_listing_query_cache, market_listing_raw_snapshots, market_listing_observations, market_listing_seller_snapshots, market_listing_price_events, review-only market_listing_card_candidates, and internal-only market_listing_rollups. Keep raw_single and slab lanes separated. Apply strict title evidence filtering before rollup medians are calculated. Keep all candidates and rollups needs_review=true, publishable=false, app_visible=false, market_truth=false, and can_publish_price_directly=false where applicable. No public pricing views. No app-visible pricing. No pricing_observations writes. No ebay_active_prices_latest writes. No JustTCG public pricing. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No migrations. No deletes except exact same-run market_listing_* repair cleanup. No merges. No global apply. Produce final audit report before stopping.
```
