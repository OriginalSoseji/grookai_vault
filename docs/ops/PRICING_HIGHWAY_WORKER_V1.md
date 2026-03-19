# PRICING_HIGHWAY_WORKER_V1

Purpose: always-on runner for `pricing_jobs`, reclaiming stale locks and dispatching the pricing worker (ebay_browse_prices_worker).

## Authority
- Authoritative production runner: `backend/pricing/pricing_job_runner_v1.mjs`
- Authoritative production command:
  `npm run pricing:worker --prefix backend`
- Authoritative queue semantics source of truth:
  `backend/pricing/pricing_job_runner_v1.mjs`
- Claim model:
  FIFO by `requested_at`, with stale `running` reclaim by lock TTL
- `backend/pricing/pricing_queue_worker.mjs` is non-authoritative and not for production use.

## How to run locally
- Daemon (default):  
  `npm run pricing:worker --prefix backend`
- Single job (once):  
  `npm run pricing:worker:once --prefix backend`
- Custom options:  
  `node pricing/pricing_job_runner_v1.mjs --sleep-ms 2000 --max-jobs 10 --lock-ttl-ms 600000`

## Env requirements
- SUPABASE_URL  
- SUPABASE_SECRET_KEY (service role)  
- Optional: SUPABASE_URL_LOCAL, SUPABASE_SECRET_KEY_LOCAL
- Optional: EBAY_BROWSE_DAILY_BUDGET (default `4200`)
- Optional: EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT (default `3`)
- Optional: PRICING_JOB_MIN_START_DELAY_MS (default `45000`)

## Behavior
- Claims pending pricing_jobs oldest-first; reclaims stale running jobs older than lock-ttl-ms (default 10m).
- Increments attempts, sets running/started_at, clears locks on completion/failure.
- Runs pricing via `pricing/ebay_browse_prices_worker.mjs --card-print-id <id>`.
- Backoff 1s after failures; idle sleep default 1500ms.
- Enforces a shared daily Browse API budget before outbound eBay Browse calls are made.
- Requeues quota-blocked jobs as retryable/pending and pauses daemon job starts until the next UTC budget window.

## Verification queries
Check job status:
```sql
select id, status, attempts, locked_by, locked_at, started_at, completed_at, priority, reason, card_print_id
from public.pricing_jobs
order by id desc
limit 5;
```

Check latest price curve:
```sql
select * from public.card_print_latest_price_curve where card_print_id = '<card_print_id>';
```

## Operational notes
- Lock TTL default 10 minutes; override with `--lock-ttl-ms`.
- Max jobs per loop: default 5 (daemon), 1 in `--once`; override with `--max-jobs`.
- Idle sleep: default 1500ms; override with `--sleep-ms`.
- Minimum daemon job-start delay: default 45000ms; override with `PRICING_JOB_MIN_START_DELAY_MS`.
- Default Browse search listings limit: 3; override with `EBAY_BROWSE_ACTIVE_LISTINGS_LIMIT`.
- Default Browse daily budget: 4200 calls; override with `EBAY_BROWSE_DAILY_BUDGET`.
- Split queue behavior is eliminated by treating `pricing_job_runner_v1` as the only production runner.
- If the experimental runner is used locally, it must be invoked explicitly:
  `npm run pricing:queue:experimental --prefix backend`
