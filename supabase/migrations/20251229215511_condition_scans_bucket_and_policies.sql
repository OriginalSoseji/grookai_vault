-- ============================================================================
-- Phase 0 Storage: bucket + RLS policies
-- Bucket: condition-scans (PRIVATE)
-- Rule: authenticated users may read/write ONLY within their own prefix:
--   name like '{auth.uid()}/%'
-- (storage.objects.name does NOT include bucket_id; bucket_id is separate)
-- ============================================================================

-- 1) Ensure bucket exists (private)
insert into storage.buckets (id, name, public)
values ('condition-scans', 'condition-scans', false)
on conflict (id) do nothing;

-- 2) Enable RLS on storage.objects (idempotent)

-- 3) Drop existing policies if present (idempotent)
drop policy if exists gv_condition_scans_select on storage.objects;
drop policy if exists gv_condition_scans_insert on storage.objects;
drop policy if exists gv_condition_scans_update on storage.objects;
drop policy if exists gv_condition_scans_delete on storage.objects;

-- 4) SELECT: user can read only their own files in this bucket
create policy gv_condition_scans_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'condition-scans'
  and name like (auth.uid()::text || '/%')
);

-- 5) INSERT: user can upload only into their own folder in this bucket
create policy gv_condition_scans_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'condition-scans'
  and name like (auth.uid()::text || '/%')
);

-- 6) UPDATE: deny by omission (no policy). (We add an explicit restrictive policy anyway.)
create policy gv_condition_scans_update
on storage.objects
for update
to authenticated
using (false)
with check (false);

-- 7) DELETE: optional. Phase 0 wants immutable snapshots; allow delete only if you later support user cleanup.
-- For now: DENY deletes.
create policy gv_condition_scans_delete
on storage.objects
for delete
to authenticated
using (false);

