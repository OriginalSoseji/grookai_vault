-- Identity Snapshots: minimal envelope for identity scans without vault_item_id
-- Stores images + scan_quality only. Append-only via RLS (no update/delete policies).

create table if not exists public.identity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  images jsonb not null,
  scan_quality jsonb not null default jsonb_build_object('ok', false, 'pending', true, 'source', 'identity_scan_v1'),
  created_at timestamptz not null default now()
);

comment on table public.identity_snapshots is
'Identity scan envelope: images + scan_quality only (no vault_item_id). Append-only; client ownership via user_id.';

comment on column public.identity_snapshots.images is
'Identity scan images payload (expects front path at minimum).';

comment on column public.identity_snapshots.scan_quality is
'Flags for identity scan capture (default pending, source=identity_scan_v1).';

alter table public.identity_snapshots enable row level security;

drop policy if exists gv_identity_snapshots_select on public.identity_snapshots;
create policy gv_identity_snapshots_select
  on public.identity_snapshots
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists gv_identity_snapshots_insert on public.identity_snapshots;
create policy gv_identity_snapshots_insert
  on public.identity_snapshots
  for insert
  to authenticated
  with check (user_id = auth.uid());
