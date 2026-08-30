# Supabase Production Capacity Readback V2

## Status

`HEALTHY_CAPACITY_MONITORED`

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

Committed live run `33280395126` used exact SHA
`3edc990157a5b454f26868226e08790d478c55c0` and passed `8/8` assertions against
fresh Management API data:

- utilization: `72.1%`;
- used: `243,744,915,456 bytes`;
- available: `94,324,305,920 bytes`;
- autoscale ceiling: `600 GB`;
- effective paid-plan growth: `50%`;
- five monitored services: healthy.

The GitHub artifact archive digest is
`sha256:509c24329885e36b6b2235f9294cf8e0e9d0667de2754abf360ca99f6e2bd357`.
The 600 GB ceiling and utilization threshold remain mandatory.

Post-MEE read-only run `33282501714` passed `8/8` again after the full-source
pricing shadow completed:

- utilization: `72.47%`;
- used: `245,013,364,736 bytes`;
- available: `93,055,856,640 bytes`;
- service health: `5/5` healthy;
- artifact archive digest:
  `sha256:09b7c689c56642aa089e91482e758fccf16c39491ce088eba42f9f9def563196`.

The production-sized pricing run increased observed disk use by approximately
`1.27 GB` from the earlier same-day capacity readback. This is material growth
to monitor, but it does not exhaust current launch headroom.

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

Keep the six-hour read-only monitor active and measure seven-day growth before
selecting a retention or partitioning design. Any utilization above the warning
threshold, autoscale-ceiling regression, or unhealthy service is an operational
alert; it does not authorize deletion.
