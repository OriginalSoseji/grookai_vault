-- catalog_submissions_v1 — quarantine lane for “card not found” identity submissions
-- V0.5: capture only, no auto promotion.

create table if not exists public.catalog_submissions_v1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),

  -- provenance / linkage
  identity_scan_event_id uuid null references public.identity_scan_events(id) on delete set null,
  identity_snapshot_id uuid null references public.identity_snapshots(id) on delete set null,
  snapshot_id uuid null references public.condition_snapshots(id) on delete set null,

  -- captured evidence at time of submission
  signals jsonb not null default '{}'::jsonb,
  note text null,

  -- review lifecycle (admin-controlled later)
  status text not null default 'submitted',

  created_at timestamptz not null default now()
);

alter table public.catalog_submissions_v1 enable row level security;

-- Users can insert their own submissions
drop policy if exists "catalog_submissions_insert_own" on public.catalog_submissions_v1;
create policy "catalog_submissions_insert_own"
on public.catalog_submissions_v1
for insert
to authenticated
with check (user_id = auth.uid());

-- Users can read their own submissions
drop policy if exists "catalog_submissions_select_own" on public.catalog_submissions_v1;
create policy "catalog_submissions_select_own"
on public.catalog_submissions_v1
for select
to authenticated
using (user_id = auth.uid());

-- No update/delete policies for authenticated users (append-only)

-- Admin review view (read convenience; ordering done by query)
create or replace view public.v_catalog_submissions_review_v1 as
select
  cs.id,
  cs.created_at,
  cs.user_id,
  cs.status,
  cs.identity_scan_event_id,
  cs.identity_snapshot_id,
  cs.snapshot_id,
  coalesce(cs.signals->'ai'->>'name', cs.signals->'grookai_vision'->>'name') as name,
  coalesce(cs.signals->'ai'->>'collector_number', cs.signals->'grookai_vision'->>'number_raw') as collector_number,
  coalesce(
    nullif(cs.signals->'ai'->>'printed_total','')::int,
    nullif(cs.signals->'grookai_vision'->>'printed_total','')::int
  ) as printed_total,
  coalesce(
    nullif(cs.signals->'ai'->>'confidence','')::float,
    nullif(cs.signals->'grookai_vision'->>'confidence_0_1','')::float
  ) as confidence,
  cs.signals
from public.catalog_submissions_v1 cs;

-- optional: leave grants to existing conventions (RLS governs base table)
