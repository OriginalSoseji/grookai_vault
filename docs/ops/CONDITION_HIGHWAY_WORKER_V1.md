# CONDITION_HIGHWAY_WORKER_V1

Purpose: run condition analysis jobs (`condition_analysis_v1`) continuously, reclaiming stale locks and dispatching centering analysis.

## How to run locally
- Daemon (default settings):  
  `npm run condition:worker --prefix backend`
- Single job (once):  
  `npm run condition:worker:once --prefix backend`
- Adjust options (examples):  
  `node condition/condition_analysis_job_runner_v1.mjs --sleep-ms 2000 --max-jobs 10 --lock-ttl-ms 600000`

## Env requirements
- SUPABASE_URL  
- SUPABASE_SECRET_KEY (service role)  
- Optional overrides: SUPABASE_URL_LOCAL, SUPABASE_SECRET_KEY_LOCAL

## Behavior
- Claims pending jobs oldest-first; reclaims stale processing jobs older than lock-ttl-ms (default 10m).
- Updates attempts, locks, and status transitions: pending→processing→completed/failed.
- On failure, applies a short backoff before next claim.

## Verification queries
Check job status:
```sql
select id, job_type, status, attempts, locked_by, locked_at, last_attempt_at, payload
from public.ingestion_jobs
where job_type='condition_analysis_v1'
order by id desc
limit 5;
```

Check analyses for a snapshot:
```sql
select snapshot_id, analysis_version, analysis_key, created_at
from public.condition_snapshot_analyses
where snapshot_id = '<snapshot_uuid>'
order by created_at desc;
```

## Operational notes
- Lock TTL default: 10 minutes (override via --lock-ttl-ms).
- Idle sleep default: 1500ms (override via --sleep-ms).
- Max jobs per loop: default 5 (daemon), 1 in --once mode; override with --max-jobs.
- Reclaimed jobs increment attempts when re-locked.
