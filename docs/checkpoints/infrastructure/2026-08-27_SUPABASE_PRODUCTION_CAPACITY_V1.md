# Supabase Production Capacity V1 Checkpoint

## Status

`CAPACITY_UPGRADE_PURCHASED_AND_DATABASE_HEALTHY_CONTROL_PLANE_FOLLOW_UP_REQUIRED`

This checkpoint preserves the Supabase production-capacity work before catalog
automation resumes. It is operational memory, not authorization for schema or
data mutation.

## Context

The production project approached its prior compute and disk operating limits
while catalog and market-evidence pipelines were active. Founder-provided
Supabase console evidence showed:

- CPU at `99%` before the compute upgrade;
- memory at `78%` before the compute upgrade;
- disk at approximately `72%`;
- `215.65 GB` used from a provisioned `303 GB` disk;
- no read replica;
- a pending organization quota restriction warning;
- a requested compute change from Small to Medium;
- an estimated project total of `$96.06/month` before taxes after the change.

The founder explicitly approved disabling the organization Spend Cap and
accepting metered disk and egress charges for organization
`rksadomjkuoxvrbhsmxu`.

## Production Identity

- Organization: `rksadomjkuoxvrbhsmxu`
- Production project ref: `ycdxbpibncqcchqiihfz`
- Production project name: `OriginalSoseji's Project`
- Region: `us-east-2`
- Supabase control-plane status at `2026-08-27`: `ACTIVE_HEALTHY`
- PostgreSQL engine: `17`

The separate restore-drill project `dkuiaiorwirujnrmbpvq` is not production and
must never be substituted for the production ref above.

## Purchased Capacity

Founder-console evidence records the intended production configuration as:

- compute: Medium;
- compute resources: 2 CPU, 4 GB memory;
- provisioned disk: 303 GB gp3;
- baseline storage performance: 3,000 IOPS and 125 MB/s throughput;
- disk autoscale growth: 50%;
- next automatic disk target at the 90% threshold: 454 GB;
- maximum configured disk size: 60,000 GB;
- Spend Cap: founder-approved for disabling so disk growth and metered egress
  are not blocked.

These are control-plane settings. SQL cannot prove their current dashboard
values. A future capacity audit must read them back from the Supabase management
plane and must not infer them from database behavior.

## Read-Only Production Readback

At `2026-08-27T08:49:20.045Z`, a read-only PostgreSQL session recorded:

- database size: `233,025,670,291` bytes (`217 GB`);
- database utilization against the 303 GB provision: approximately `71.7%`;
- connections: `18` total, `1` active, `15` idle;
- longest other active query: `0.00` seconds at the observation instant;
- no database mutation performed by the readback.

Largest relations at that instant:

| Relation | Total size |
|---|---:|
| `tcgcsv_source_price_daily_observations` | 98 GB |
| `justtcg_variant_price_snapshots` | 49 GB |
| `market_listing_raw_snapshots` | 17 GB |
| `market_listing_price_events` | 10 GB |
| `market_price_pipeline_candidates` | 7,447 MB |
| `market_price_qualification_decisions` | 5,617 MB |
| `market_listing_card_candidates` | 5,296 MB |
| `market_listing_observations` | 5,289 MB |
| `market_evidence_lifecycle_events` | 3,893 MB |
| `market_evidence_variant_assignments` | 2,636 MB |

The two largest historical price tables account for roughly `147 GB`. Capacity
growth must therefore be governed by retention, partitioning, and compaction
policy, not only by buying more disk.

## Current Truths

- Production was reachable and `ACTIVE_HEALTHY` at checkpoint time.
- The immediate database was not connection-saturated at the readback instant.
- The 303 GB provision leaves roughly 86 GB before full allocation and roughly
  56 GB before the configured 90% autoscale threshold.
- Purchased compute headroom does not prove query efficiency or unattended
  pipeline stability.
- Disabling Spend Cap prevents quota enforcement from silently blocking needed
  metered disk growth, but it also makes cost monitoring mandatory.
- Database and market-evidence growth remain the dominant capacity risks.

## Invariants

- Never delete or truncate evidence tables merely to reduce disk pressure.
- Retention or compaction work requires a separately reviewed, reversible plan
  with row-count and fingerprint proof.
- Production and restore-drill project refs must remain explicitly separated.
- Catalog discovery remains read-only until a governed promotion payload exists.
- Capacity changes must not weaken RLS, grants, publication policy, or canonical
  identity boundaries.
- Every background worker must have bounded concurrency, retry, lease, and cost
  behavior before full unattended operation.

## Required Follow-Up

1. Read back Medium compute, Spend Cap state, disk autoscale, maximum disk,
   IOPS, and throughput from the Supabase management plane.
2. Install alerts for CPU, memory, disk utilization, WAL growth, connection
   saturation, replication health, and failed scheduled workers.
3. Capture 24-hour and seven-day performance after the resize; a single healthy
   SQL readback is not a capacity certification.
4. Produce a no-delete storage-growth plan for the two largest historical price
   tables, including retention semantics, partitioning options, and rollback.
5. Reconcile the organization quota warning after Spend Cap and billing changes.
6. Recalculate the monthly cost from actual metered compute, disk, egress, and
   storage growth after one complete billing interval.

## Exact Resume Gate

Resume infrastructure work by performing a management-plane readback and a
read-only database performance audit. Do not resize again or mutate historical
data based only on this checkpoint.
