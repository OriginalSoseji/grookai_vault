# Supabase Production Capacity Readback V2

## Status

`HEALTHY_CAPACITY_WITH_GROWTH_POLICY_REQUIRED`

This checkpoint supersedes the capacity values in
`2026-08-27_SUPABASE_PRODUCTION_CAPACITY_V1.md`. It does not authorize data
deletion, retention mutation, or another infrastructure resize.

## Production Identity

- Organization: `rksadomjkuoxvrbhsmxu`
- Production project: `ycdxbpibncqcchqiihfz`
- Restore-drill project, not production: `dkuiaiorwirujnrmbpvq`
- Region: `us-east-2`
- PostgreSQL engine: `17`
- Management-plane status: `ACTIVE_HEALTHY`

## Readback

Read-only workflow run `33274730806` collected the following at
`2026-08-29T20:56:30.610Z`:

| Control | Observed |
|---|---:|
| Compute | `ci_medium` |
| Disk | `320 GB gp3` |
| IOPS | `3000` |
| Throughput | `125 MiB/s` |
| Used | `242,317,426,688 bytes` |
| Available | `95,751,794,688 bytes` |
| Utilization | `71.68%` |
| Autoscale ceiling | `600 GB` |
| Auth, REST, Realtime, Storage, DB | all `ACTIVE_HEALTHY` |

The supported Management API returns a null custom growth percentage. Supabase
documents 50 percent growth as the paid-plan default. The capacity verifier now
records both values:

- raw custom growth: `null`;
- effective growth: `50%`;
- effective growth source: `supabase_paid_plan_default`;
- maximum disk size: `600 GB`.

Replaying the exact readback through the corrected policy passes `8/8`
assertions. The 600 GB ceiling and the utilization threshold remain mandatory.

## Spend Cap

The founder explicitly approved disabling Spend Cap and accepting metered disk
and egress charges. The supported project Management API does not expose the
organization Spend Cap state, so the audit does not claim an API readback for
that control.

## Workflow Decision

- `Supabase Production Capacity Audit (read-only)` remains active every six
  hours.
- `Supabase Disk Autoscale Apply (guarded)` is disabled because it used an
  undocumented dashboard-internal endpoint that rejects Supabase personal
  access tokens. It is not a valid production mutation path.
- The read-only audit is the monitoring authority. Dashboard-only billing
  controls remain separate from database and Management API automation.

## Growth Risk

The database grew by approximately 7 GB over the preceding two-day observation
window. The largest evidence relations remain the primary capacity risk:

- `tcgcsv_source_price_daily_observations`: approximately `99 GB`;
- `justtcg_variant_price_snapshots`: approximately `49 GB`;
- `market_listing_raw_snapshots`: approximately `17 GB`;
- `market_listing_price_events`: approximately `10 GB`.

Purchased capacity provides launch headroom but does not replace a no-delete
retention, partitioning, and compaction design.

## Invariants

- Never delete or truncate historical evidence to manufacture free space.
- Never substitute the restore-drill project for production.
- Keep utilization, service health, and the 600 GB ceiling monitored.
- Any compaction must preserve canonical price lineage and have rollback proof.
- Spend and egress must be monitored because the founder accepted metered use.

## Exact Next Gate

Allow the corrected read-only capacity workflow to run from the committed code,
verify `8/8` assertions against fresh Management API data, then measure seven-day
growth before selecting a retention or partitioning design.

