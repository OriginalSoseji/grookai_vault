# Production Backend Launch Automation V1

## Purpose

Provide one fail-closed, read-only command that answers whether the production
backend may advance to its next release gate. The command joins live Supabase
provider state, Prometheus resource metrics, database health, managed backups,
the production control plane, the completed load gate, billing evidence,
restore evidence, and same-candidate client evidence.

This automation does not purchase capacity, change Spend Cap, resize disk,
start a restore, write database or Storage rows, deploy clients, or enable
public rollout.

## Command

```powershell
npm run production:launch:automate -- `
  --billing-evidence=docs/audits/production_backend_launch_v1/operator_evidence/supabase_billing_capacity_observation_20260824_v1.json `
  --load-evidence=docs/audits/production_backend_launch_v1/read_load_gate_20260824_v1.json
```

Use `--require-ready` in CI to return a nonzero exit when the release remains
blocked or incomplete.

## Automated Inputs

1. Supabase Management API, GET only:
   - project health;
   - selected compute add-on;
   - disk configuration and exact filesystem utilization;
   - disk autoscale configuration;
   - read-only state;
   - backup inventory;
   - relevant organization entitlements.
2. Supabase Metrics API, GET only:
   - interval CPU utilization;
   - memory utilization;
   - load averages;
   - online CPU count;
   - `/data` filesystem utilization.
3. PostgreSQL read-only transaction:
   - connections;
   - locks and long queries;
   - invalid indexes;
   - RLS exposure;
   - unsafe security-definer functions;
   - database and Storage sizes;
   - table health and migration head.
4. Existing operational evidence:
   - production control-plane state;
   - final read-load gate;
   - optional billing, restore, and same-candidate manifests.

The Management API is limited to an explicit path allowlist. The Metrics API
stores derived measurements only and never persists its privileged credential
or raw payload.

## Thresholds

- Compute below Medium: blocked.
- Project unhealthy or read-only: blocked.
- CPU or memory at or above 80% in the observation window: blocked.
- Disk at or above 80%: blocked; 70% through 79.99%: incomplete.
- Missing provider-confirmed disk autoscale: incomplete.
- Stale/missing physical backup or WAL-G disabled: blocked.
- Active organization quota restriction notice: blocked.
- Spend Cap enabled while paid disk growth is required: blocked.
- Missing billing-cycle egress, restore proof, or same-candidate client proof:
  incomplete.
- Any database security failure or failed control-plane component: blocked.

## Scheduled Operation

`.github/workflows/production-backend-launch-readiness.yml` runs every six
hours and on demand. It uploads evidence to the workflow run and writes a job
summary. It never commits generated reports, pushes a branch, or triggers a
Vercel deployment.

The founder operations workflow follows the same no-commit rule. Generated
snapshots are workflow artifacts, not source changes.

## Current Live Result

Read-only run:

`C:\secure-ops\production-backend-launch\automated-readiness\2026-08-24T19-32-37-655Z_read_only`

- Medium compute is active: 2 shared cores, 4 GB RAM, 120 direct connections,
  600 pooler connections.
- Current sampled CPU maximum: 10.47%.
- Current sampled memory maximum: 37.36%.
- Disk: 231,521,333,248 / 320,101,937,152 bytes, 72.33% used.
- Project read-only state: false.
- Physical backups: 9 completed; latest at 2026-08-24T19:12:52.617Z.
- WAL-G: enabled. PITR: disabled.
- Final 33 RPS read-load gate: passed, 9,900 / 9,900 requests.
- Control plane: 11 healthy, 7 explicitly unmeasured, zero failed/degraded/stale.

The Medium purchase fixed the immediate compute-size and connection-capacity
shortfall. It did not change paid disk capacity, organization usage quotas,
Spend Cap, PITR, or restore/client verification requirements.

## Remaining Plan

### 1. Billing And Capacity

Open the organization Usage and Cost Control pages and record exact cached and
uncached egress plus current quota status. The current dashboard evidence says
the organization exceeded quota and may be restricted on 2026-09-04. Spend Cap
is enabled.

This is a financial/operator gate. Automation must not disable Spend Cap or
accept overage charges. Supabase documents that Spend Cap can restrict disk and
egress after included quotas are exceeded.

Choose and execute one approved capacity path:

- disable Spend Cap and accept metered disk/egress overages; or
- reduce governed future growth and provision enough disk headroom through an
  explicitly approved paid resize.

After the decision, rerun the provider snapshot and require disk below the
launch target with effective autoscale confirmed.

### 2. Restore Proof

Create or authorize an isolated nonproduction destination, restore from a
managed production backup, reconcile expected counts and invariants, remove
the temporary destination, and preserve zero-mismatch evidence. Production
must remain unmodified.

### 3. Same-Candidate Clients

Freeze one commit and verify signed-in journeys on web, Android, and iOS from
that exact source candidate. Required journeys include authentication, search,
pricing, Vault, images, sharing, and Memory links with database reconciliation.

### 4. Final Candidate And Canary

Generate the final candidate manifest, merge/deploy one synchronized candidate,
prove rollback metadata, then complete the 72-hour canary and unattended cycle
requirements. Public rollout remains disabled until every required artifact
reconciles with zero mismatches.

## Official Provider References

- Supabase Management API: https://supabase.com/docs/reference/api/introduction
- Metrics API: https://supabase.com/docs/guides/monitoring-and-debugging/metrics
- Database and disk size: https://supabase.com/docs/guides/platform/database-size
- Cost control and Spend Cap: https://supabase.com/docs/guides/platform/cost-control
- Egress usage: https://supabase.com/docs/guides/platform/manage-your-usage/egress

