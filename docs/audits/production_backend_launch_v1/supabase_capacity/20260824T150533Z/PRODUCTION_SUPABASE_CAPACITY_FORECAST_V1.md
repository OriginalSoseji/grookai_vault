# PRODUCTION_SUPABASE_CAPACITY_FORECAST_V1

- Observed: `2026-08-24T15:05:33Z`
- Project: `ycdxbpibncqcchqiihfz`
- Status: **FAILED**
- Managed disk use: **72.33%** (231.54 GB / 320.10 GB)
- Lower-bound daily database growth: **3.19 GB**
- Lower-bound 30-day disk utilization: **102.21%**
- Lower-bound 90-day disk utilization: **161.95%**
- 2x 90-day headroom deficit: **485.18 GB**
- Storage current / 30-day projection / 90-day projection: 31.84 GB / 51.15 GB / 89.77 GB

## Findings

- **HIGH managed_disk_at_or_above_70_percent:** Managed database disk utilization exceeds the frozen launch target.
- **CRITICAL managed_disk_30_day_forecast_exceeds_90_percent:** The conservative lower-bound 30-day database growth forecast exceeds 90 percent managed disk utilization.
- **HIGH managed_disk_2x_90_day_headroom_missing:** Available managed disk does not provide the required 2x projected 90-day database growth headroom.
- **UNMEASURED storage_plan_capacity_unmeasured:** Storage plan capacity is not present in the evidence snapshot, so planned utilization cannot pass.
- **UNMEASURED connection_load_forecast_unverified:** The 2x connection calculation is diagnostic only until the launch load test is complete.
- **UNMEASURED egress_forecast_unverified:** A provider-backed 30-day and 90-day egress forecast has not been supplied.
- **MEDIUM managed_disk_autoscale_unconfigured:** Managed disk autoscale is not configured in the provider snapshot.

## Relation Growth Inputs

| Relation | Workload | Rows/cycle | Cycles/day | Estimated daily growth |
| --- | --- | ---: | ---: | ---: |
| `tcgcsv_source_price_daily_observations` | tcgplayer_source | 546,333 | 1 | 0.51 GB |
| `market_listing_raw_snapshots` | mee | 222,947 | 1 | 0.48 GB |
| `market_listing_price_events` | mee | 222,947 | 1 | 0.28 GB |
| `market_listing_card_candidates` | mee | 181,745 | 1 | 0.30 GB |
| `market_listing_observations` | mee | 222,947 | 1 | 0.15 GB |
| `market_listing_seller_snapshots` | mee | 18,667 | 1 | 0.01 GB |
| `market_listing_rollups` | mee | 5,892 | 1 | 0.01 GB |
| `market_price_pipeline_candidates` | pricing_publication | 206,227 | 1 | 0.66 GB |
| `market_price_qualification_decisions` | pricing_publication | 206,227 | 1 | 0.55 GB |
| `market_price_publication_snapshots` | pricing_publication | 164,133 | 1 | 0.24 GB |

## Interpretation

- This is a conservative lower bound, not a promise of exact future growth.
- The launch gate fails because current managed disk use already exceeds 70 percent and the measured daily write pattern does not provide 2x 90-day headroom.
- No paid plan change, database write, Storage write, worker pause, archive, or deletion was performed.
