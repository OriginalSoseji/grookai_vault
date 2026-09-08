-- Typed sealed ownership reads. Existing card read contracts are unchanged.
begin;

create or replace view public.vault_sealed_current_evidence_v1 as
select variant.id variant_id,price_release.id price_release_id,image_release.id image_release_id,
  qualification.id qualification_id,qualification.observed_on,qualification.currency,
  case when qualification.observed_on between (now() at time zone 'UTC')::date-7 and (now() at time zone 'UTC')::date
    and (qualification.qualification_evidence #>> '{observation,market_price}') ~ '^[0-9]+(\.[0-9]+)?$'
    then case when (qualification.qualification_evidence #>> '{observation,market_price}')::numeric between 0.01 and 9999999999.99
      then round((qualification.qualification_evidence #>> '{observation,market_price}')::numeric,2) end
    end market_price,
  image_object.storage_bucket,image_object.object_path,image_object.image_width,image_object.image_height,
  image_object.content_sha256,image_object.image_bytes,image_object.image_mime
from public.sealed_product_release_pointer price_pointer
join public.sealed_product_releases price_release on price_release.id=price_pointer.release_id
  and price_release.game_key=price_pointer.game_key and price_release.release_state='frozen'
join public.sealed_product_release_members member on member.release_id=price_release.id and member.qualification_status='qualified_exact'
join public.sealed_product_variants variant on variant.id=member.variant_id
join public.sealed_product_families family on family.id=variant.family_id and family.game_key=price_release.game_key
join public.sealed_product_source_mappings mapping on mapping.id=member.source_mapping_id and mapping.variant_id=variant.id
join public.sealed_product_pricing_lane_qualifications qualification on qualification.id=member.qualification_id
  and qualification.variant_id=member.variant_id and qualification.source_mapping_id=member.source_mapping_id
  and qualification.qualification_status=member.qualification_status
join public.sealed_product_image_release_pointer image_pointer on image_pointer.game_key=price_pointer.game_key
join public.sealed_product_image_releases image_release on image_release.id=image_pointer.image_release_id
  and image_release.game_key=image_pointer.game_key and image_release.release_state='frozen'
  and image_release.source_price_release_id=price_release.id
join public.sealed_product_image_release_members image_member on image_member.image_release_id=image_release.id
  and image_member.game_key=image_release.game_key and image_member.variant_id=variant.id
join public.sealed_product_variant_image_assertions assertion on assertion.id=image_member.image_assertion_id
  and assertion.game_key=image_member.game_key and assertion.variant_id=image_member.variant_id
  and assertion.source_mapping_id=member.source_mapping_id and assertion.assertion_state='exact_verified'
join public.sealed_product_image_evidence evidence on evidence.id=assertion.image_evidence_id
  and evidence.game_key=assertion.game_key and evidence.variant_id=assertion.variant_id
  and evidence.source_mapping_id=assertion.source_mapping_id and evidence.source_release_member_id=member.id
  and evidence.classification in ('exact_image_ready','shared_bytes_exact_variant')
join public.sealed_product_image_objects image_object on image_object.id=assertion.image_object_id
  and image_object.game_key=assertion.game_key and image_object.content_sha256=evidence.content_sha256
  and image_object.storage_readback_sha256=evidence.content_sha256 and image_object.image_mime=evidence.image_mime
  and image_object.image_width=evidence.image_width and image_object.image_height=evidence.image_height
  and image_object.image_bytes=evidence.image_bytes
where coalesce(auth.role(),'') in ('authenticated','service_role')
  and public.catalog_game_visible_to_request_v1(family.game_key)
  and public.sealed_product_game_visible_to_request_v1(family.game_key)
  and ((family.game_key='mtg' and variant.language_code='en')
    or (family.game_key='pokemon' and variant.language_code in ('en','ja','zh','fr','de','it','ko','pt','es','ru')))
  and mapping.source_provider='tcgplayer' and qualification.source_subtype_name_normalized='normal'
  and qualification.currency='USD' and image_object.storage_bucket='user-card-images'
  and image_object.object_path like 'sealed/'||family.game_key||'/sha256/%';
revoke all on public.vault_sealed_current_evidence_v1 from public,anon,authenticated;
grant select on public.vault_sealed_current_evidence_v1 to service_role;

create or replace function public.get_owned_sealed_copies_v1(
  p_owner_id uuid default null,p_instance_ids uuid[] default null,p_limit integer default 100,p_offset integer default 0
) returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); target uuid:=coalesce(p_owner_id,auth.uid());
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0
    or (p_instance_ids is not null and (cardinality(p_instance_ids)>100 or array_position(p_instance_ids,null) is not null)) then
    raise exception 'invalid_owned_sealed_page' using errcode='22023'; end if;
  if target<>u and (public.trust_block_exists_between_v1(u,target) or not exists(
    select 1 from public.public_profiles p where p.user_id=target and p.public_profile_enabled and p.vault_sharing_enabled
  )) then return; end if;
  return query
  with selected as (
    select i.* from public.vault_item_instances i
    where i.user_id=target and i.archived_at is null and i.sealed_product_variant_id is not null
      and (p_instance_ids is null or i.id=any(p_instance_ids))
      and (target=u or i.intent in ('sell','trade','showcase') or exists(
        select 1 from public.wall_section_memberships m join public.wall_sections s on s.id=m.section_id
        where m.vault_item_instance_id=i.id and s.user_id=target and s.is_active and s.is_public))
    order by i.created_at desc,i.id limit p_limit offset p_offset
  )
  select jsonb_build_object('object_kind','sealed','instance_id',i.id,'owner_id',i.user_id,'gv_vi_id',i.gv_vi_id,
    'sealed_product_variant_id',v.id,'family_id',v.family_id,'game_key',f.game_key,'name',v.canonical_name,
    'package_form',v.package_form,'language_code',v.language_code,'region_code',v.region_code,'edition',v.edition,'wave',v.wave,
    'seal_state',i.seal_state,'package_condition',i.package_condition,'intent',i.intent,
    'asking_price_amount',i.asking_price_amount,'asking_price_currency',i.asking_price_currency,
    'acquisition_cost',case when target=u then i.acquisition_cost end,
    'acquisition_currency',case when target=u then i.acquisition_currency end,
    'notes',case when target=u then i.notes end,
    'reference_market_price',e.market_price,'market_currency',case when e.market_price is not null then e.currency end,
    'owned_market_price',case when i.seal_state='factory_sealed' and i.package_condition='undamaged' then e.market_price end,
    'price_release_id',e.price_release_id,'qualification_id',e.qualification_id,'observed_on',e.observed_on,
    'image_release_id',e.image_release_id,'image_storage_bucket',e.storage_bucket,'image_object_path',e.object_path,
    'image_width',e.image_width,'image_height',e.image_height,'image_content_sha256',e.content_sha256,
    'image_bytes',e.image_bytes,'image_mime',e.image_mime,
    'show_personal_photos',i.image_display_mode='uploaded',
    'personal_image_url',case when target=u or i.image_display_mode='uploaded' then i.image_url end,
    'personal_back_image_url',case when target=u or i.image_display_mode='uploaded' then i.image_back_url end,
    'created_at',i.created_at,'section_ids',coalesce((select jsonb_agg(s.id order by s.position,s.id)
      from public.wall_section_memberships m join public.wall_sections s on s.id=m.section_id
      where m.vault_item_instance_id=i.id and s.user_id=target and s.is_active and (target=u or s.is_public)),'[]'::jsonb))
  from selected i join public.sealed_product_variants v on v.id=i.sealed_product_variant_id
  join public.sealed_product_families f on f.id=v.family_id
  left join public.vault_sealed_current_evidence_v1 e on e.variant_id=v.id
  order by i.created_at desc,i.id;
end $$;

create or replace function public.get_owned_sealed_totals_v1() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  with owned as (
    select i.id,case when i.seal_state='factory_sealed' and i.package_condition='undamaged' then e.market_price end amount,e.currency
    from public.vault_item_instances i left join public.vault_sealed_current_evidence_v1 e on e.variant_id=i.sealed_product_variant_id
    where i.user_id=u and i.archived_at is null and i.sealed_product_variant_id is not null
  ), totals as (select currency,sum(amount) total from owned where amount is not null group by currency)
  select jsonb_build_object('object_kind','sealed','active_copy_count',count(*),'priced_copy_count',count(amount),
    'unpriced_copy_count',count(*)-count(amount),'totals_by_currency',coalesce((select jsonb_object_agg(currency,total) from totals),'{}'::jsonb)) into result from owned;
  return result;
end $$;

create or replace function public.get_sealed_ownership_capabilities_v1() returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('version',1,'add_enabled',coalesce((select enabled from public.sealed_ownership_controls_v1 where singleton),false))
  where auth.uid() is not null;
$$;
revoke all on function public.get_owned_sealed_copies_v1(uuid,uuid[],integer,integer) from public,anon;
revoke all on function public.get_owned_sealed_totals_v1() from public,anon;
revoke all on function public.get_sealed_ownership_capabilities_v1() from public,anon;
grant execute on function public.get_owned_sealed_copies_v1(uuid,uuid[],integer,integer) to authenticated;
grant execute on function public.get_owned_sealed_totals_v1() to authenticated;
grant execute on function public.get_sealed_ownership_capabilities_v1() to authenticated;
create or replace function public.get_owned_sealed_inventory_v1(
  p_owner_id uuid default null,p_query text default null,p_section_id uuid default null,
  p_wall_only boolean default false,p_limit integer default 50,p_offset integer default 0
) returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); target uuid:=coalesce(p_owner_id,auth.uid()); ids uuid[];
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0
    or length(coalesce(p_query,''))>100 then raise exception 'invalid_owned_sealed_page' using errcode='22023'; end if;
  if target<>u and (public.trust_block_exists_between_v1(u,target) or not exists(
    select 1 from public.public_profiles p where p.user_id=target and p.public_profile_enabled and p.vault_sharing_enabled
  )) then return; end if;
  select coalesce(array_agg(selected.id),'{}'::uuid[]) into ids from (
    select i.id from public.vault_item_instances i join public.sealed_product_variants v on v.id=i.sealed_product_variant_id
    where i.user_id=target and i.archived_at is null
      and (nullif(btrim(p_query),'') is null or position(lower(btrim(p_query)) in lower(v.canonical_name||' '||v.package_form||' '||v.language_code||' '||coalesce(v.edition,'')))>0)
      and (p_section_id is null or exists(select 1 from public.wall_section_memberships m join public.wall_sections s on s.id=m.section_id
        where m.vault_item_instance_id=i.id and s.id=p_section_id and s.user_id=target and s.is_active and (u=target or s.is_public)))
      and ((u=target and not coalesce(p_wall_only,false)) or i.intent in ('sell','trade','showcase') or exists(
        select 1 from public.wall_section_memberships m join public.wall_sections s on s.id=m.section_id
        where m.vault_item_instance_id=i.id and s.user_id=target and s.is_active and (u=target or s.is_public)))
    order by i.created_at desc,i.id limit p_limit offset p_offset
  ) selected;
  return query select * from public.get_owned_sealed_copies_v1(target,ids,100,0);
end $$;

create or replace function public.get_sealed_copy_by_gvvi_v1(p_gvvi_id text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare item record; result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if length(p_gvvi_id)>80 then return null; end if;
  select i.id,i.user_id into item from public.vault_item_instances i
    where i.gv_vi_id=p_gvvi_id and i.archived_at is null and i.sealed_product_variant_id is not null;
  if not found then return null; end if;
  select r into result from public.get_owned_sealed_copies_v1(item.user_id,array[item.id],1,0) r;
  return result;
end $$;
revoke all on function public.get_owned_sealed_inventory_v1(uuid,text,uuid,boolean,integer,integer) from public,anon;
revoke all on function public.get_sealed_copy_by_gvvi_v1(text) from public,anon;
grant execute on function public.get_owned_sealed_inventory_v1(uuid,text,uuid,boolean,integer,integer) to authenticated;
grant execute on function public.get_sealed_copy_by_gvvi_v1(text) to authenticated;

create or replace function public.get_sealed_ownership_history_v1(p_limit integer default 50,p_offset integer default 0)
returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0 then
    raise exception 'invalid_history_page' using errcode='22023'; end if;
  return query select jsonb_build_object('instance_id',i.id,'gv_vi_id',i.gv_vi_id,'name',v.canonical_name,
    'sealed_product_variant_id',v.id,'language_code',v.language_code,'package_form',v.package_form,
    'archived_at',i.archived_at,'operation',coalesce(d.disposition_type,'archived'),
    'sale_price_amount',d.sale_price_amount,'sale_price_currency',d.sale_price_currency,
    'counterparty',d.counterparty_label,'trade_received',d.trade_received_description,
    'cash_direction',d.trade_cash_direction,'cash_amount',d.trade_cash_amount,'cash_currency',d.trade_cash_currency)
  from public.vault_item_instances i join public.sealed_product_variants v on v.id=i.sealed_product_variant_id
  left join public.vault_item_instance_dispositions d on d.vault_item_instance_id=i.id and d.user_id=i.user_id
  where i.user_id=auth.uid() and i.archived_at is not null order by i.archived_at desc,i.id limit p_limit offset p_offset;
end $$;

create or replace function public.vault_save_sealed_details_v1(
  p_instance_id uuid,p_notes text default null,p_front_path text default null,p_back_path text default null,p_show_photos boolean default false
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare u uuid:=auth.uid(); item public.vault_item_instances%rowtype; path text; side text;
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_show_photos is null or length(coalesce(p_notes,''))>2000 then raise exception 'invalid_sealed_details' using errcode='22023'; end if;
  foreach side in array array['front','back'] loop
    path:=case when side='front' then p_front_path else p_back_path end;
    if path is not null and (path<>u::text||'/vault-instances/'||p_instance_id::text||'/'||side||'/current'
      or not exists(select 1 from storage.objects o where o.bucket_id='user-card-images' and o.name=path)) then
      raise exception 'invalid_owned_photo_path' using errcode='22023'; end if;
  end loop;
  update public.vault_item_instances set notes=nullif(btrim(p_notes),''),image_url=p_front_path,image_back_url=p_back_path,
    image_source=case when p_front_path is not null then 'user_photo' end,
    image_back_source=case when p_back_path is not null then 'user_photo' end,
    image_display_mode=case when p_show_photos then 'uploaded' else 'canonical' end
  where id=p_instance_id and user_id=u and archived_at is null and sealed_product_variant_id is not null returning * into item;
  if not found then raise exception 'sealed_copy_not_owned' using errcode='P0002'; end if;
  return jsonb_build_object('instance_id',item.id,'notes',item.notes,'front_path',item.image_url,'back_path',item.image_back_url,'show_photos',p_show_photos);
end $$;

create or replace function public.sealed_owned_media_visible_v1(p_path text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid() is not null and exists (
    select 1 from public.vault_item_instances i where i.sealed_product_variant_id is not null and i.archived_at is null
      and ((p_path=i.image_url and p_path=i.user_id::text||'/vault-instances/'||i.id::text||'/front/current')
        or (p_path=i.image_back_url and p_path=i.user_id::text||'/vault-instances/'||i.id::text||'/back/current'))
      and (i.user_id=auth.uid() or (i.image_display_mode='uploaded' and not public.trust_block_exists_between_v1(auth.uid(),i.user_id)
        and exists(select 1 from public.public_profiles p where p.user_id=i.user_id and p.public_profile_enabled and p.vault_sharing_enabled)
        and (i.intent in ('sell','trade','showcase') or exists(select 1 from public.wall_section_memberships m
          join public.wall_sections s on s.id=m.section_id where m.vault_item_instance_id=i.id and s.user_id=i.user_id and s.is_active and s.is_public))))
  );
$$;

-- Keep the existing card/slab media policy, excluding the new sealed anchor.
drop policy if exists user_card_images_public_discoverable_instance_select_v1 on storage.objects;
create policy user_card_images_public_discoverable_instance_select_v1 on storage.objects for select to public using (
  bucket_id='user-card-images' and exists(select 1 from public.vault_item_instances i join public.public_profiles p on p.user_id=i.user_id
    where i.sealed_product_variant_id is null and i.archived_at is null and i.intent in ('trade','sell','showcase')
      and i.image_display_mode='uploaded' and p.public_profile_enabled and p.vault_sharing_enabled
      and (storage.objects.name=nullif(btrim(i.image_url),'') or storage.objects.name=nullif(btrim(i.image_back_url),'')))
);
drop policy if exists sealed_owned_media_select_v1 on storage.objects;
create policy sealed_owned_media_select_v1 on storage.objects for select to authenticated
  using (bucket_id='user-card-images' and public.sealed_owned_media_visible_v1(name));
revoke all on function public.get_sealed_ownership_history_v1(integer,integer) from public,anon;
revoke all on function public.vault_save_sealed_details_v1(uuid,text,text,text,boolean) from public,anon;
revoke all on function public.sealed_owned_media_visible_v1(text) from public,anon;
grant execute on function public.get_sealed_ownership_history_v1(integer,integer) to authenticated;
grant execute on function public.vault_save_sealed_details_v1(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.sealed_owned_media_visible_v1(text) to authenticated;
notify pgrst,'reload schema';
commit;
