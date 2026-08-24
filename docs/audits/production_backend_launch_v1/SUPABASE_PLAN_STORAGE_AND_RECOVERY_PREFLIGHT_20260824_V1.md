# Supabase Plan, Storage, And Recovery Preflight V1

**Observed:** 2026-08-24

**Project:** `ycdxbpibncqcchqiihfz`

**Organization:** `rksadomjkuoxvrbhsmxu`

**Execution boundary:** provider and database reads only. No paid plan change,
project creation, restore, PITR change, database write, Storage write, pointer
change, archive, or deletion occurred.

## Result

The Supabase capacity and recovery gate remains **BLOCKED**.

Current object Storage is below the frozen 70 percent threshold, but its
burst-sensitive 90-day projection exceeds the threshold and does not provide
2x projected-growth headroom. Managed database disk is already above the
threshold. The provider confirms recoverable daily backups and access to a
restore-to-new-project path, but no reconciled restore exercise has occurred.
Actual billing-cycle egress remains unmeasured because it is not exposed by the
public Management API.

## Provider Evidence

Read-only Supabase Management API evidence established:

- exactly one project belongs to the organization;
- the active project uses Small compute with 90 direct and 400 pooled
  connection limits;
- a dedicated IPv4 add-on is active;
- daily backup retention is seven days;
- restore to a new project is available;
- project cloning is available;
- PITR variants for 7, 14, and 28 days are available but no PITR add-on is
  selected;
- custom backup scheduling is not enabled; and
- project-scoped roles are not enabled.

Supabase's current pricing matrix assigns seven-day automatic backup retention
to Pro and fourteen-day retention to Team. Together with the provider
entitlements above, the organization is classified as **Pro** with high
confidence. The Management API does not expose a direct subscription-plan
name, so this is an entitlement-backed classification rather than a returned
`plan_name` value.

Official references:

- <https://supabase.com/pricing>
- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/storage/pricing>
- <https://supabase.com/docs/guides/platform/manage-your-usage/egress>
- <https://supabase.com/docs/reference/api/introduction>

## Storage Capacity

The Pro organization allowance is 100 GB. The organization contains one
project, so the project and organization totals reconcile for this audit.

| Measure | Result | Frozen gate |
| --- | ---: | --- |
| Current objects | 167,734 | informational |
| Current Storage | 31.84 GB | 31.84% of allowance |
| Recent-rate 30-day projection | 51.15 GB | 51.15%, below 70% |
| Recent-rate 90-day projection | 89.77 GB | 89.77%, above 70% |
| Available allowance | 68.16 GB | informational |
| Projected 90-day incremental growth | 57.93 GB | burst-sensitive |
| Required 2x 90-day growth headroom | 115.86 GB | contract requirement |
| Headroom deficit | 47.70 GB | failed |

The recent Storage history includes a one-time bulk image event. It must not be
treated as a committed steady-state rate, but it is the conservative measured
rate available for the frozen launch gate. Current Storage utilization passes;
the 90-day and 2x-headroom requirements do not.

## Managed Database Disk

Managed database disk is independent of object Storage and remains the primary
capacity blocker:

- used: 231.54 GB of 320.10 GB;
- utilization: 72.33 percent;
- conservative lower-bound append growth: 3.187 GB/day;
- projected 80 percent threshold: 7.70 days;
- projected full disk: 27.78 days; and
- 2x 90-day headroom deficit: 485.18 GB.

No retention deletion, compaction, paid disk change, or publication-policy
change was made.

## Egress

The Pro allowance is 250 GB uncached egress and 250 GB cached egress per
billing cycle. Supabase documents that these are independent organization-wide
quotas.

The public Management API exposes request-count analytics but not authoritative
billing-cycle cached and uncached byte totals. Supabase directs operators to
the organization Usage page for those totals. Therefore:

- plan quotas: measured;
- actual billing-cycle egress: unmeasured;
- quota utilization: unmeasured; and
- 30-day and 90-day egress forecast: unverified.

Request counts or sampled image sizes are not substituted for provider billing
evidence because cache behavior and service-specific traffic would make that
result misleading.

## Backup And Restore

The provider confirms seven-day daily backup retention and
restore-to-new-project access. Existing project evidence also confirms seven
fresh physical backups and WAL-G. PITR is disabled.

The recovery gate does not pass until a nonproduction restore is executed and
reconciled. That exercise requires creation or use of an isolated destination
with enough compute and disk for the production data. Creating that resource
may incur cost and is outside the automatic execution envelope.

The restore exercise must prove:

1. the selected production backup identifier and timestamp;
2. the isolated destination project and zero production pointer changes;
3. source and restored schema fingerprints;
4. canonical, pricing, Vault, Auth, and Storage-reference count reconciliation;
5. bounded signed-in read smoke tests against the restored project;
6. measured restore duration and recovery point; and
7. destination teardown or retention decision without touching production.

## Exact Decisions Required

1. Select a managed-disk capacity remedy. The current disk violates the frozen
   launch threshold even though load performance passes.
2. Authorize and budget an isolated restore destination before the restore
   exercise is started.
3. Capture the current billing-cycle cached and uncached egress totals from the
   Supabase organization Usage page.

Until those items are proven, Production Backend Launch V1 remains not ready.
