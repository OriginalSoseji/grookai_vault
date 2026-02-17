insert into storage.buckets (id, name, public)
values ('identity-scans', 'identity-scans', false)
on conflict (id) do nothing;

drop policy if exists gv_identity_scans_select on storage.objects;
drop policy if exists gv_identity_scans_insert on storage.objects;

create policy gv_identity_scans_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'identity-scans'
  and name like (auth.uid()::text || '/%')
);

create policy gv_identity_scans_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'identity-scans'
  and name like (auth.uid()::text || '/%')
);
