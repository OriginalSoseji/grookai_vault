begin;

-- New uploads have unique paths. The pointer and sharing mode change together;
-- a failed save leaves both the old shared bytes and private staged bytes alone.
create or replace function public.vault_save_sealed_details_v1(
  p_instance_id uuid,p_notes text default null,p_front_path text default null,p_back_path text default null,p_show_photos boolean default false
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); item public.vault_item_instances%rowtype; path text; side text; prefix text; previous text;
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_show_photos is null or length(coalesce(p_notes,''))>2000 then raise exception 'invalid_sealed_details' using errcode='22023'; end if;
  select * into item from public.vault_item_instances
    where id=p_instance_id and user_id=u and archived_at is null and sealed_product_variant_id is not null for update;
  if not found then raise exception 'sealed_copy_not_owned' using errcode='P0002'; end if;
  foreach side in array array['front','back'] loop
    path:=case when side='front' then p_front_path else p_back_path end;
    previous:=case when side='front' then item.image_url else item.image_back_url end;
    prefix:=u::text||'/vault-instances/'||p_instance_id::text||'/'||side||'/';
    if path is not null and (
      not (left(path,length(prefix))=prefix and
        (substring(path from length(prefix)+1) ~ '^revisions/[a-f0-9]{32}$'
          or (path=prefix||'current' and coalesce(path=previous,false))))
      or not exists(select 1 from storage.objects o where o.bucket_id='user-card-images' and o.name=path)
    ) then raise exception 'invalid_owned_photo_path' using errcode='22023'; end if;
  end loop;
  update public.vault_item_instances set notes=nullif(btrim(p_notes),''),image_url=p_front_path,image_back_url=p_back_path,
    image_source=case when p_front_path is not null then 'user_photo' end,
    image_back_source=case when p_back_path is not null then 'user_photo' end,
    image_display_mode=case when p_show_photos then 'uploaded' else 'canonical' end
  where id=item.id and user_id=u;
  return jsonb_build_object('instance_id',item.id,'notes',nullif(btrim(p_notes),''),'front_path',p_front_path,'back_path',p_back_path,'show_photos',p_show_photos);
end $$;

create or replace function public.sealed_owned_media_visible_v1(p_path text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists (
    select 1 from public.vault_item_instances i where i.sealed_product_variant_id is not null and i.archived_at is null
      and ((p_path=i.image_url and p_path ~ ('^'||i.user_id::text||'/vault-instances/'||i.id::text||'/front/(current|revisions/[a-f0-9]{32})$'))
        or (p_path=i.image_back_url and p_path ~ ('^'||i.user_id::text||'/vault-instances/'||i.id::text||'/back/(current|revisions/[a-f0-9]{32})$')))
      and (i.user_id=auth.uid() or (i.image_display_mode='uploaded' and not public.trust_block_exists_between_v1(auth.uid(),i.user_id)
        and exists(select 1 from public.public_profiles p where p.user_id=i.user_id and p.public_profile_enabled and p.vault_sharing_enabled)
        and (i.intent in ('sell','trade','showcase') or exists(select 1 from public.wall_section_memberships m
          join public.wall_sections s on s.id=m.section_id where m.vault_item_instance_id=i.id and s.user_id=i.user_id and s.is_active and s.is_public))))
  );
$$;

-- CREATE OR REPLACE preserves the existing authenticated-only grants.
notify pgrst,'reload schema';
commit;
