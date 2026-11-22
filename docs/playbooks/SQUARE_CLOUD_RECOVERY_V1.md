# Square cloud recovery operation

Authority: [SQUARE_CLOUD_RECOVERY_V1](../contracts/SQUARE_CLOUD_RECOVERY_V1.md).

Vercel's production `2-57/5 * * * *` schedule invokes
`/api/square/recovery`. It supplements `square-commerce-reconciliation.yml`.
The existing Pro project supports this cadence; do not upgrade or create another
project merely to add the clock. Both scheduler providers are best effort, so
read actual execution receipts rather than assuming a five-minute guarantee.

The platform's dedicated production `CRON_SECRET` must be a privately retained
random header-safe string of at least 32 characters. New work additionally needs
`GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED=true`. Both settings are server-only;
preview and owner bearer sessions cannot invoke the production scheduler.
Changing these values requires a deployment before the runtime uses them.

Before activation, preserve a current production health/inventory snapshot,
verify schema 493 and installed build 531, and complete the normal protected release.
Verify the unauthenticated endpoint returns401 without worker activity. Verify
the production feature is paused before activation; do not place a credential in
an example command or query string. Configure the secret and flag in encrypted
production environment storage, redeploy that exact qualified source and verify
the custom domain points to it. Keep GitHub reconciliation and artwork enabled.

An authenticated operator invocation must finish a real worker pass, not merely
return HTTP200 or skip a busy connection. Its response run ID must match a
terminal row in `grookai_square.worker_runs`. Then stop operator dispatches and
observe at least two natural invocations, five minutes apart, in Vercel runtime
logs. `[square-cloud-recovery]` records a fixed `scheduled` or `operator` trigger
label and the run ID. The platform cron schedule header is diagnostic context,
not authentication. Correlate each natural log with its database receipt and
confirm it checked work. Inspect platform request source alongside the header.

Read-only SQL through the existing verified-TLS linked CLI:

```sql
begin isolation level repeatable read read only;
select id, status, succeeded, failed, skipped, error_code, started_at, finished_at
from grookai_square.worker_runs
where environment='production'
order by started_at desc limit 20;
select status, count(*) from grookai_square.operations
where payload->'artwork'->>'version'='SQUARE_ARTWORK_V1' group by status;
select state, count(*) from grookai_square.allocations group by state;
select count(*) from grookai_square.sales;
rollback;
```

Retain the actual run IDs, source SHA,
deployment/alias readback, cadence, sanitized responses and stock/sale comparison
in the private release checkpoint. Do not print image payloads or credentials.
The shared lease can legitimately skip an overlapping invocation; it does not
prove completed work or replace the next real success. A missing cron request
has no backend run, so check platform delivery as well as database health.

To pause this clock, set its enable flag false and deploy; keep GitHub recovery
available. To pause all new periodic invocations, also disable the GitHub
`GROOKAI_SQUARE_RECONCILIATION_ENABLED` variable. Retain all allocations, requests,
sales, webhook evidence and image history. Do not repeat migrations, reinstall
Samsung531, replenish sold stock, or replace uncertain operation keys.
