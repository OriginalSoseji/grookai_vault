# PRICING_HIGHWAY_WORKER_V1

Purpose: always-on runner for `pricing_jobs`, reclaiming stale locks and dispatching the pricing worker (ebay_browse_prices_worker).

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

## Behavior
- Claims pending pricing_jobs oldest-first; reclaims stale running jobs older than lock-ttl-ms (default 10m).
- Increments attempts, sets running/started_at, clears locks on completion/failure.
- Runs pricing via `pricing/ebay_browse_prices_worker.mjs --card-print-id <id>`.
- Backoff 1s after failures; idle sleep default 1500ms.

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
