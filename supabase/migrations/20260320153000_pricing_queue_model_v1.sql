alter table public.pricing_jobs
  add column if not exists next_eligible_at timestamptz,
  add column if not exists last_meaningful_attempt_at timestamptz,
  add column if not exists last_error_class text,
  add column if not exists last_outcome text;

update public.pricing_jobs
set next_eligible_at = coalesce(next_eligible_at, requested_at)
where next_eligible_at is null;

create index if not exists pricing_jobs_status_priority_eligible_requested_idx
  on public.pricing_jobs (status, priority, next_eligible_at, requested_at);
