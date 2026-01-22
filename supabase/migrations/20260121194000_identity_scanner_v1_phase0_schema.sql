-- Identity Scanner V1 - Phase 0 schema (append-only tables + RLS)
set search_path to public;

-- =========================
-- identity_scan_events
-- =========================
create table if not exists public.identity_scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  signals jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  analysis_version text not null default 'v1',
  status text not null default 'pending',
  error text null,
  created_at timestamptz not null default now()
);

create index if not exists identity_scan_events_user_created_idx on public.identity_scan_events (user_id, created_at desc);
create index if not exists identity_scan_events_snapshot_idx on public.identity_scan_events (snapshot_id);

-- Set auth.uid() on insert if not provided (mirrors condition_snapshots)
create or replace function public.gv_identity_scan_events_set_auth_uid()
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

-- Append-only: block updates/deletes
create or replace function public.gv_identity_scan_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'identity_scan_events is append-only';
end;
$$;

-- Triggers
drop trigger if exists trg_identity_scan_events_set_auth_uid on public.identity_scan_events;
create trigger trg_identity_scan_events_set_auth_uid
before insert on public.identity_scan_events
for each row execute function public.gv_identity_scan_events_set_auth_uid();

drop trigger if exists trg_identity_scan_events_block_update on public.identity_scan_events;
create trigger trg_identity_scan_events_block_update
before update on public.identity_scan_events
for each row execute function public.gv_identity_scan_events_block_mutation();

drop trigger if exists trg_identity_scan_events_block_delete on public.identity_scan_events;
create trigger trg_identity_scan_events_block_delete
before delete on public.identity_scan_events
for each row execute function public.gv_identity_scan_events_block_mutation();

-- RLS
alter table public.identity_scan_events enable row level security;
drop policy if exists gv_identity_scan_events_select on public.identity_scan_events;
create policy gv_identity_scan_events_select
  on public.identity_scan_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists gv_identity_scan_events_insert on public.identity_scan_events;
create policy gv_identity_scan_events_insert
  on public.identity_scan_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- =========================
-- identity_scan_selections
-- =========================
create table if not exists public.identity_scan_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  identity_scan_event_id uuid not null references public.identity_scan_events(id) on delete restrict,
  selected_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists identity_scan_selections_user_created_idx on public.identity_scan_selections (user_id, created_at desc);
create index if not exists identity_scan_selections_event_idx on public.identity_scan_selections (identity_scan_event_id);

-- Set auth.uid() on insert if not provided
create or replace function public.gv_identity_scan_selections_set_auth_uid()
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
create or replace function public.gv_identity_scan_selections_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'identity_scan_selections is append-only';
end;
$$;

-- Triggers
drop trigger if exists trg_identity_scan_selections_set_auth_uid on public.identity_scan_selections;
create trigger trg_identity_scan_selections_set_auth_uid
before insert on public.identity_scan_selections
for each row execute function public.gv_identity_scan_selections_set_auth_uid();

drop trigger if exists trg_identity_scan_selections_block_update on public.identity_scan_selections;
create trigger trg_identity_scan_selections_block_update
before update on public.identity_scan_selections
for each row execute function public.gv_identity_scan_selections_block_mutation();

drop trigger if exists trg_identity_scan_selections_block_delete on public.identity_scan_selections;
create trigger trg_identity_scan_selections_block_delete
before delete on public.identity_scan_selections
for each row execute function public.gv_identity_scan_selections_block_mutation();

-- RLS
alter table public.identity_scan_selections enable row level security;
drop policy if exists gv_identity_scan_selections_select on public.identity_scan_selections;
create policy gv_identity_scan_selections_select
  on public.identity_scan_selections
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists gv_identity_scan_selections_insert on public.identity_scan_selections;
create policy gv_identity_scan_selections_insert
  on public.identity_scan_selections
  for insert
  to authenticated
  with check (user_id = auth.uid());
