-- Identity Scanner V1 - Phase 1B results table (append-only, RLS)
set search_path to public;

create table if not exists public.identity_scan_event_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  identity_scan_event_id uuid not null references public.identity_scan_events(id) on delete restrict,
  status text not null,
  signals jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  error text null,
  analysis_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create index if not exists identity_scan_event_results_event_idx on public.identity_scan_event_results (identity_scan_event_id, created_at desc);
create index if not exists identity_scan_event_results_user_idx on public.identity_scan_event_results (user_id, created_at desc);

-- Set auth uid on insert if null
create or replace function public.gv_identity_scan_event_results_set_auth_uid()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- Append-only guard
create or replace function public.gv_identity_scan_event_results_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'identity_scan_event_results is append-only';
end;
$$;

drop trigger if exists trg_identity_scan_event_results_set_auth_uid on public.identity_scan_event_results;
create trigger trg_identity_scan_event_results_set_auth_uid
before insert on public.identity_scan_event_results
for each row execute function public.gv_identity_scan_event_results_set_auth_uid();

drop trigger if exists trg_identity_scan_event_results_block_update on public.identity_scan_event_results;
create trigger trg_identity_scan_event_results_block_update
before update on public.identity_scan_event_results
for each row execute function public.gv_identity_scan_event_results_block_mutation();

drop trigger if exists trg_identity_scan_event_results_block_delete on public.identity_scan_event_results;
create trigger trg_identity_scan_event_results_block_delete
before delete on public.identity_scan_event_results
for each row execute function public.gv_identity_scan_event_results_block_mutation();

alter table public.identity_scan_event_results enable row level security;

drop policy if exists gv_identity_scan_event_results_select on public.identity_scan_event_results;
create policy gv_identity_scan_event_results_select
  on public.identity_scan_event_results
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists gv_identity_scan_event_results_insert on public.identity_scan_event_results;
create policy gv_identity_scan_event_results_insert
  on public.identity_scan_event_results
  for insert
  to authenticated
  with check (user_id = auth.uid());
