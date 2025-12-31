-- CONDITION_ASSIST_V1 Phase 1: RLS, immutability, and auth triggers

-- Enable RLS
alter table public.condition_snapshot_analyses enable row level security;
alter table public.condition_analysis_failures enable row level security;

-- Drop existing policies if present
drop policy if exists gv_condition_snapshot_analyses_select on public.condition_snapshot_analyses;
drop policy if exists gv_condition_snapshot_analyses_insert on public.condition_snapshot_analyses;
drop policy if exists gv_condition_analysis_failures_select on public.condition_analysis_failures;
drop policy if exists gv_condition_analysis_failures_insert on public.condition_analysis_failures;

-- SELECT / INSERT policies (owner-only; append-only)
create policy gv_condition_snapshot_analyses_select
  on public.condition_snapshot_analyses
  for select
  to authenticated
  using (user_id = auth.uid());

create policy gv_condition_snapshot_analyses_insert
  on public.condition_snapshot_analyses
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy gv_condition_analysis_failures_select
  on public.condition_analysis_failures
  for select
  to authenticated
  using (user_id = auth.uid());

create policy gv_condition_analysis_failures_insert
  on public.condition_analysis_failures
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Immutability guards
create or replace function public.gv_condition_snapshot_analyses_block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'condition_snapshot_analyses is append-only';
end;$$;

create or replace function public.gv_condition_analysis_failures_block_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'condition_analysis_failures is append-only';
end;$$;

-- Auth/created_at setter triggers
create or replace function public.gv_condition_snapshot_analyses_set_auth_uid()
returns trigger language plpgsql as $$
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  new.created_at := coalesce(new.created_at, now());
  return new;
end;$$;

create or replace function public.gv_condition_analysis_failures_set_auth_uid()
returns trigger language plpgsql as $$
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  new.created_at := coalesce(new.created_at, now());
  return new;
end;$$;

-- Triggers: block UPDATE/DELETE
drop trigger if exists trg_condition_snapshot_analyses_block_update on public.condition_snapshot_analyses;
create trigger trg_condition_snapshot_analyses_block_update
  before update on public.condition_snapshot_analyses
  for each row execute function public.gv_condition_snapshot_analyses_block_mutation();

drop trigger if exists trg_condition_snapshot_analyses_block_delete on public.condition_snapshot_analyses;
create trigger trg_condition_snapshot_analyses_block_delete
  before delete on public.condition_snapshot_analyses
  for each row execute function public.gv_condition_snapshot_analyses_block_mutation();

drop trigger if exists trg_condition_analysis_failures_block_update on public.condition_analysis_failures;
create trigger trg_condition_analysis_failures_block_update
  before update on public.condition_analysis_failures
  for each row execute function public.gv_condition_analysis_failures_block_mutation();

drop trigger if exists trg_condition_analysis_failures_block_delete on public.condition_analysis_failures;
create trigger trg_condition_analysis_failures_block_delete
  before delete on public.condition_analysis_failures
  for each row execute function public.gv_condition_analysis_failures_block_mutation();

-- Triggers: set auth uid / timestamps
drop trigger if exists trg_condition_snapshot_analyses_set_auth_uid on public.condition_snapshot_analyses;
create trigger trg_condition_snapshot_analyses_set_auth_uid
  before insert on public.condition_snapshot_analyses
  for each row execute function public.gv_condition_snapshot_analyses_set_auth_uid();

drop trigger if exists trg_condition_analysis_failures_set_auth_uid on public.condition_analysis_failures;
create trigger trg_condition_analysis_failures_set_auth_uid
  before insert on public.condition_analysis_failures
  for each row execute function public.gv_condition_analysis_failures_set_auth_uid();
