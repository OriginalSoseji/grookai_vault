-- Generic background jobs and logs (DIY queue)
create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  payload jsonb not null,
  status text not null default 'queued', -- queued|processing|done|error|cancelled
  attempts int not null default 0,
  max_attempts int not null default 5,
  last_error text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_jobs_status_sched on public.jobs (status, scheduled_at);

create table if not exists public.job_logs (
  id bigserial primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  at timestamptz not null default now(),
  level text not null default 'info',
  message text,
  meta jsonb
);
create index if not exists idx_job_logs_job_time on public.job_logs (job_id, at desc);
