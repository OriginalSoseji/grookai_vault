begin;

alter table public.public_profiles
  add column if not exists avatar_path text null,
  add column if not exists banner_path text null;

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists profile_media_owner_select on storage.objects;
drop policy if exists profile_media_owner_insert on storage.objects;
drop policy if exists profile_media_owner_update on storage.objects;
drop policy if exists profile_media_owner_delete on storage.objects;

create policy profile_media_owner_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and name like ('profiles/' || auth.uid()::text || '/%')
);

create policy profile_media_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and name like ('profiles/' || auth.uid()::text || '/%')
);

create policy profile_media_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and name like ('profiles/' || auth.uid()::text || '/%')
)
with check (
  bucket_id = 'profile-media'
  and name like ('profiles/' || auth.uid()::text || '/%')
);

create policy profile_media_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and name like ('profiles/' || auth.uid()::text || '/%')
);

commit;
