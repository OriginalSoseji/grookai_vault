begin;

-- LOCK: user-card-images remains a private bucket.
-- LOCK: Public reads are allowed only for exact-copy media attached to
-- discoverable public wall/feed instances whose uploaded image mode is active.

drop policy if exists user_card_images_public_discoverable_instance_select_v1
on storage.objects;

create policy user_card_images_public_discoverable_instance_select_v1
on storage.objects
for select
to public
using (
  bucket_id = 'user-card-images'
  and exists (
    select 1
    from public.vault_item_instances vii
    join public.public_profiles pp
      on pp.user_id = vii.user_id
    where vii.archived_at is null
      and vii.intent in ('trade', 'sell', 'showcase')
      and vii.image_display_mode = 'uploaded'
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
      and (
        storage.objects.name = nullif(btrim(vii.image_url), '')
        or storage.objects.name = nullif(btrim(vii.image_back_url), '')
      )
  )
);

commit;
