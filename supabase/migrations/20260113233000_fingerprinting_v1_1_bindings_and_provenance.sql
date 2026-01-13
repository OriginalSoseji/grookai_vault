-- Fingerprinting V1.1: bindings + provenance (append-only, same-user)
-- Schema-only migration: no data backfill, no RPCs.

-- === Table: public.fingerprint_bindings ===
create table if not exists public.fingerprint_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint_key text not null,
  vault_item_id uuid not null references public.vault_items(id) on delete restrict,
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  analysis_key text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fingerprint_bindings_user_key_unique unique (user_id, fingerprint_key)
);

comment on table public.fingerprint_bindings is
'Fingerprint V1.1 binding of (user_id, fingerprint_key) to a primary vault_item_id. Append-only; updates refresh last_seen_at.';

-- Indexes
create index if not exists idx_fingerprint_bindings_vault_item on public.fingerprint_bindings (vault_item_id);
create index if not exists idx_fingerprint_bindings_user_vault on public.fingerprint_bindings (user_id, vault_item_id);

-- RLS
alter table public.fingerprint_bindings enable row level security;

drop policy if exists gv_fingerprint_bindings_select on public.fingerprint_bindings;
create policy gv_fingerprint_bindings_select
  on public.fingerprint_bindings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists gv_fingerprint_bindings_insert on public.fingerprint_bindings;
create policy gv_fingerprint_bindings_insert
  on public.fingerprint_bindings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists gv_fingerprint_bindings_update on public.fingerprint_bindings;
create policy gv_fingerprint_bindings_update
  on public.fingerprint_bindings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete policy (bindings are not deleted in V1.1).

-- === Table: public.fingerprint_provenance_events ===
create table if not exists public.fingerprint_provenance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_item_id uuid null references public.vault_items(id) on delete restrict,
  snapshot_id uuid not null references public.condition_snapshots(id) on delete restrict,
  analysis_key text not null,
  fingerprint_key text null,
  event_type text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fingerprint_prov_events_user_analysis_event_unique unique (user_id, analysis_key, event_type)
);

comment on table public.fingerprint_provenance_events is
'Fingerprint V1.1 provenance ledger (append-only). Events per analysis_key/event_type; same-user boundary.';

-- Indexes
create index if not exists idx_fingerprint_prov_user_created on public.fingerprint_provenance_events (user_id, created_at desc);
create index if not exists idx_fingerprint_prov_vault_created on public.fingerprint_provenance_events (vault_item_id, created_at desc);
create index if not exists idx_fingerprint_prov_fingerprint_key on public.fingerprint_provenance_events (fingerprint_key);
create index if not exists idx_fingerprint_prov_event_type on public.fingerprint_provenance_events (event_type);

-- RLS
alter table public.fingerprint_provenance_events enable row level security;

drop policy if exists gv_fingerprint_prov_select on public.fingerprint_provenance_events;
create policy gv_fingerprint_prov_select
  on public.fingerprint_provenance_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists gv_fingerprint_prov_insert on public.fingerprint_provenance_events;
create policy gv_fingerprint_prov_insert
  on public.fingerprint_provenance_events
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- No update/delete policies (append-only).

-- === Verification placeholders (do not execute automatically) ===
-- \echo 'Verify tables exist and RLS:'
-- \echo 'select table_name, is_rls_enabled from information_schema.tables where table_name in (''fingerprint_bindings'',''fingerprint_provenance_events'');'
-- \echo 'Verify unique constraints:'
-- \echo '\d+ public.fingerprint_bindings'
-- \echo '\d+ public.fingerprint_provenance_events'
-- \echo 'Verify policies:'
-- \echo 'select polname, tablename from pg_policies where tablename in (''fingerprint_bindings'',''fingerprint_provenance_events'');'
