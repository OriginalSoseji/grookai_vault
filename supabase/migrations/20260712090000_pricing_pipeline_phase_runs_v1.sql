-- Pricing pipeline phase run ledger.
-- Append-only operational evidence for MEE nightly/reference phases.

create table if not exists public.market_pricing_pipeline_phase_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline text not null default 'mee_nightly',
  phase text not null,
  run_key text,
  artifact_path text,
  started_at timestamptz,
  finished_at timestamptz,
  status text not null,
  acquired_count integer not null default 0,
  candidate_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  no_op_count integer not null default 0,
  failed_count integer not null default 0,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint market_pricing_pipeline_phase_runs_status_check
    check (status in ('started', 'succeeded', 'failed', 'skipped', 'warning')),
  constraint market_pricing_pipeline_phase_runs_counts_check check (
    acquired_count >= 0
    and candidate_count >= 0
    and inserted_count >= 0
    and updated_count >= 0
    and no_op_count >= 0
    and failed_count >= 0
  )
);

create index if not exists market_pricing_pipeline_phase_runs_latest_idx
  on public.market_pricing_pipeline_phase_runs (pipeline, phase, created_at desc, id desc);

create index if not exists market_pricing_pipeline_phase_runs_run_key_idx
  on public.market_pricing_pipeline_phase_runs (run_key, created_at desc)
  where run_key is not null;

alter table public.market_pricing_pipeline_phase_runs enable row level security;

drop policy if exists market_pricing_pipeline_phase_runs_service_role_all
  on public.market_pricing_pipeline_phase_runs;
create policy market_pricing_pipeline_phase_runs_service_role_all
  on public.market_pricing_pipeline_phase_runs
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.market_pricing_pipeline_phase_runs_append_only_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'market_pricing_pipeline_phase_runs is append-only';
end;
$$;

drop trigger if exists market_pricing_pipeline_phase_runs_append_only_guard
  on public.market_pricing_pipeline_phase_runs;
create trigger market_pricing_pipeline_phase_runs_append_only_guard
  before update or delete on public.market_pricing_pipeline_phase_runs
  for each row
  execute function public.market_pricing_pipeline_phase_runs_append_only_guard_v1();

create or replace view public.v_market_pricing_pipeline_phase_latest_status as
select
  id,
  pipeline,
  phase,
  run_key,
  artifact_path,
  started_at,
  finished_at,
  status,
  acquired_count,
  candidate_count,
  inserted_count,
  updated_count,
  no_op_count,
  failed_count,
  error,
  payload,
  created_at
from (
  select
    r.*,
    row_number() over (
      partition by r.pipeline, r.phase
      order by r.created_at desc, r.id desc
    ) as rn
  from public.market_pricing_pipeline_phase_runs r
) ranked
where rn = 1;

revoke all on public.market_pricing_pipeline_phase_runs from public, anon, authenticated;
revoke all on public.v_market_pricing_pipeline_phase_latest_status from public, anon, authenticated;
grant select, insert on public.market_pricing_pipeline_phase_runs to service_role;
grant select on public.v_market_pricing_pipeline_phase_latest_status to service_role;
grant execute on function public.market_pricing_pipeline_phase_runs_append_only_guard_v1() to service_role;
