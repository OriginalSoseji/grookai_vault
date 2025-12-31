-- ============================================================================
-- Phase 0: condition_snapshots (immutable, append-only)
-- Contract: GROOKAI FINGERPRINT + CONDITION CONTRACT v1
-- Decision: legacy public.scans is quarantined and NOT used for Phase 0.
-- ============================================================================

create table if not exists public.condition_snapshots (
  id uuid primary key default gen_random_uuid(),

  -- anchors
  vault_item_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),

  -- image pointers + metadata only (no binaries)
  images jsonb not null,

  -- raw observations only (no grades/bands)
  scan_quality jsonb not null,
  measurements jsonb not null,
  defects jsonb not null,
  confidence numeric not null,

  -- optional metadata
  device_meta jsonb null,

  -- optional anchors (Phase 0)
  fingerprint_id uuid null,
  card_print_id uuid null
);

comment on table public.condition_snapshots is
'Phase 0 condition assist snapshots. Append-only. No stored grades/bands. Raw observations only.';

-- RLS: owner-only read/insert; no update/delete
alter table public.condition_snapshots enable row level security;

drop policy if exists gv_condition_snapshots_select on public.condition_snapshots;
create policy gv_condition_snapshots_select
on public.condition_snapshots
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists gv_condition_snapshots_insert on public.condition_snapshots;
create policy gv_condition_snapshots_insert
on public.condition_snapshots
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- NOTE: Do NOT create UPDATE/DELETE policies (immutability contract).

-- Trigger: enforce server-side user_id + created_at
create or replace function public.gv_condition_snapshots_set_auth_uid()
returns trigger
language plpgsql
as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists trg_condition_snapshots_set_auth_uid on public.condition_snapshots;

create trigger trg_condition_snapshots_set_auth_uid
before insert on public.condition_snapshots
for each row
execute function public.gv_condition_snapshots_set_auth_uid();
