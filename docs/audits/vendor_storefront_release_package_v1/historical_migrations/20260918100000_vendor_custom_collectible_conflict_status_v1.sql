-- Optimistic edit conflicts are HTTP 409, never retryable serialization failures.
-- PostgREST retries SQLSTATE 40001, so use its explicit HTTP status convention.
begin;
create or replace function public.vendor_store_custom_mutate_v1(p_product_id uuid,p_expected_version bigint,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; p public.vendor_store_custom_products; k text; paths text[]; section_ids uuid[]; reason text; n numeric;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_action is null or p_action not in ('save','photos','sections','publish','unpublish','archive') or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid product action' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  if p_action not in ('unpublish','archive') and (
    not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled and custom_enabled))
    then raise exception 'Custom product access unavailable' using errcode='42501'; end if;
  if p_product_id is null then
    if p_action<>'save' or p_expected_version is not null then raise exception 'Create a draft first' using errcode='22023'; end if;
    insert into public.vendor_store_custom_products(store_id) values(s.id) returning * into p;
  else
    select * into p from public.vendor_store_custom_products where id=p_product_id and store_id=s.id for update;
    if p.id is null then raise exception 'Product unavailable' using errcode='42501'; end if;
    if p_expected_version is distinct from p.version then raise exception 'Product changed. Reload before saving.' using errcode='PT409'; end if;
    if p.archived_at is not null and p_action not in ('archive','unpublish') then raise exception 'Product archived' using errcode='22023'; end if;
  end if;
  if p_action='save' then
    for k in select jsonb_object_keys(p_data) loop
      if k not in ('title','description','category','franchise','manufacturer','release_region','language','condition_description','packaging_description','private_sku','asking_price_amount','available_quantity') then raise exception 'Unknown product field' using errcode='22023'; end if;
      if k not in ('asking_price_amount','available_quantity') and jsonb_typeof(p_data->k) not in ('string','null') then raise exception 'Invalid text field' using errcode='22023'; end if;
    end loop;
    if p_data ? 'asking_price_amount' and p_data->'asking_price_amount'<>'null'::jsonb then
      if jsonb_typeof(p_data->'asking_price_amount')<>'number' then raise exception 'Invalid price' using errcode='22023'; end if;
      n:=(p_data->>'asking_price_amount')::numeric;
      if n<0 or n>99999999.99 or n<>round(n,2) then raise exception 'Invalid price' using errcode='22023'; end if;
    end if;
    if p_data ? 'available_quantity' then
      if jsonb_typeof(p_data->'available_quantity') is distinct from 'number' then raise exception 'Invalid quantity' using errcode='22023'; end if;
      n:=(p_data->>'available_quantity')::numeric;
      if n<0 or n>1000000 or n<>trunc(n) then raise exception 'Invalid quantity' using errcode='22023'; end if;
    end if;
    p:=jsonb_populate_record(p,p_data);
    p.title:=coalesce(btrim(p.title),''); p.description:=coalesce(btrim(p.description),'');
    update public.vendor_store_custom_products set title=p.title,description=p.description,
      category=coalesce(p.category,''),franchise=coalesce(p.franchise,''),manufacturer=coalesce(p.manufacturer,''),
      release_region=coalesce(p.release_region,''),language=coalesce(p.language,''),condition_description=coalesce(p.condition_description,''),
      packaging_description=coalesce(p.packaging_description,''),private_sku=coalesce(p.private_sku,''),
      asking_price_amount=p.asking_price_amount,available_quantity=p.available_quantity,
      -- Editing never publishes. Invalidation suspends and needs explicit republish.
      published=published and p.available_quantity>0 and coalesce(p.asking_price_amount,0)>0 and p.title<>'' and p.description<>'',
      suspension_reason=case when p.available_quantity=0 then 'Out of stock' when coalesce(p.asking_price_amount,0)=0 or p.title='' or p.description='' then 'Incomplete details' when not published and suspension_reason is not null then 'Publication suspended. Publish explicitly when ready.' else suspension_reason end,
      version=version+1,updated_at=now() where id=p.id;
  elsif p_action='photos' then
    if jsonb_typeof(p_data->'paths') is distinct from 'array' or jsonb_array_length(p_data->'paths')>8 then raise exception 'Up to eight photos' using errcode='22023'; end if;
    select coalesce(array_agg(value),'{}'::text[]) into paths from jsonb_array_elements_text(p_data->'paths');
    if cardinality(paths)<>(select count(distinct x) from unnest(paths) x) or exists(select 1 from unnest(paths) x where
      x is null or not public.vendor_store_custom_media_owned_v1(x) or split_part(x,'/',3)<>p.id::text
      or not exists(select 1 from storage.objects o where o.bucket_id='vendor-store-media' and o.name=x))
      then raise exception 'Photo unavailable' using errcode='42501'; end if;
    update public.vendor_store_custom_products set photo_paths=paths,published=published and cardinality(paths)>0,
      suspension_reason=case when cardinality(paths)=0 then 'Add at least one photo' when not published and suspension_reason is not null then 'Publication suspended. Publish explicitly when ready.' else suspension_reason end,
      version=version+1,updated_at=now() where id=p.id;
  elsif p_action='sections' then
    if jsonb_typeof(p_data->'section_ids') is distinct from 'array' or jsonb_array_length(p_data->'section_ids')>20 then raise exception 'Invalid sections' using errcode='22023'; end if;
    select coalesce(array_agg(value::uuid),'{}'::uuid[]) into section_ids from jsonb_array_elements_text(p_data->'section_ids');
    if exists(select 1 from unnest(section_ids) x where x is null or not exists(select 1 from public.vendor_store_sections vs
      join public.wall_sections ws on ws.id=vs.section_id where vs.store_id=s.id and vs.section_id=x and ws.user_id=s.owner_id and ws.is_active))
      then raise exception 'Section unavailable' using errcode='42501'; end if;
    delete from public.vendor_store_custom_product_sections where product_id=p.id;
    insert into public.vendor_store_custom_product_sections select s.id,p.id,x from unnest(section_ids) x on conflict do nothing;
    update public.vendor_store_custom_products set version=version+1,updated_at=now() where id=p.id;
  elsif p_action='publish' then
    reason:=public.vendor_store_custom_reason_v1(p.id);
    if reason is not null then raise exception '%',reason using errcode='22023'; end if;
    if not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled and nullif(slug,'') is not null and nullif(display_name,'') is not null)
      then raise exception 'Enable public profile and Vault sharing' using errcode='42501'; end if;
    update public.vendor_store_custom_products set published=true,suspension_reason=null,version=version+1,updated_at=now() where id=p.id;
  else
    update public.vendor_store_custom_products set published=false,suspension_reason=case when p_action='archive' then 'Archived' else null end,
      archived_at=case when p_action='archive' then coalesce(archived_at,now()) else archived_at end,version=version+1,updated_at=now() where id=p.id;
  end if;
  return public.vendor_store_custom_owner_v1(p.id);
end; $$;
commit;
