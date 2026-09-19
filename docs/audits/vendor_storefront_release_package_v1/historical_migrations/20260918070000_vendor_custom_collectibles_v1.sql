-- Seller-authored browse-only products; no canonical or Vault identity writes.
begin;
alter table public.vendor_store_rollout add column custom_enabled boolean not null default false;
alter table public.vendor_stores add column custom_currency text not null default 'USD' check(custom_currency='USD');

create table public.vendor_store_custom_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  title text not null default '' check(length(title)<=120),
  description text not null default '' check(length(description)<=4000),
  category text not null default '' check(length(category)<=80),
  franchise text not null default '' check(length(franchise)<=80),
  manufacturer text not null default '' check(length(manufacturer)<=120),
  release_region text not null default '' check(length(release_region)<=80),
  language text not null default '' check(length(language)<=80),
  condition_description text not null default '' check(length(condition_description)<=500),
  packaging_description text not null default '' check(length(packaging_description)<=500),
  private_sku text not null default '' check(length(private_sku)<=80),
  asking_price_amount numeric(12,2) check(asking_price_amount between 0 and 99999999.99),
  available_quantity integer not null default 0 check(available_quantity between 0 and 1000000),
  photo_paths text[] not null default '{}' check(cardinality(photo_paths)<=8),
  published boolean not null default false,
  suspension_reason text,
  archived_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id,id)
);
create table public.vendor_store_custom_product_sections (
  store_id uuid not null,
  product_id uuid not null,
  section_id uuid not null,
  primary key(store_id,product_id,section_id),
  foreign key(store_id,product_id) references public.vendor_store_custom_products(store_id,id) on delete cascade,
  foreign key(store_id,section_id) references public.vendor_store_sections(store_id,section_id) on delete cascade
);
create table public.vendor_store_custom_product_events (
  product_id uuid not null references public.vendor_store_custom_products(id) on delete cascade,
  version bigint not null,
  recorded_at timestamptz not null default now(),
  snapshot jsonb not null,
  primary key(product_id,version)
);
alter table public.vendor_store_custom_products enable row level security;
alter table public.vendor_store_custom_product_sections enable row level security;
alter table public.vendor_store_custom_product_events enable row level security;
revoke all on public.vendor_store_custom_products,public.vendor_store_custom_product_sections,public.vendor_store_custom_product_events from public,anon,authenticated;
grant select on public.vendor_store_custom_products,public.vendor_store_custom_product_sections to authenticated;
grant select on public.vendor_store_custom_products,public.vendor_store_custom_product_sections,public.vendor_store_custom_product_events to service_role;
create policy custom_products_owner_read on public.vendor_store_custom_products for select to authenticated
  using(exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));
create policy custom_sections_owner_read on public.vendor_store_custom_product_sections for select to authenticated
  using(exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

create function public.vendor_store_custom_history_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.vendor_store_custom_product_events(product_id,version,snapshot)
    values(new.id,new.version,to_jsonb(new)||jsonb_build_object('section_ids',coalesce((select jsonb_agg(section_id order by section_id) from public.vendor_store_custom_product_sections where product_id=new.id),'[]'::jsonb)));
  return null;
end; $$;
create trigger vendor_store_custom_history after insert or update on public.vendor_store_custom_products
  for each row execute function public.vendor_store_custom_history_v1();

create function public.vendor_store_custom_reason_v1(p_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare p public.vendor_store_custom_products;
begin
  select * into p from public.vendor_store_custom_products where id=p_id;
  if p.id is null then return 'Product unavailable'; end if;
  if p.archived_at is not null then return 'Archived'; end if;
  if btrim(p.title)='' then return 'Add a title'; end if;
  if btrim(p.description)='' then return 'Add a description'; end if;
  if cardinality(p.photo_paths)=0 then return 'Add at least one photo'; end if;
  if exists(select 1 from unnest(p.photo_paths) path where not exists(select 1 from storage.objects o where o.bucket_id='vendor-store-media' and o.name=path)) then return 'Photo unavailable'; end if;
  if p.asking_price_amount is null or p.asking_price_amount<=0 then return 'Set a positive asking price'; end if;
  if p.available_quantity<=0 then return 'Out of stock'; end if;
  return null;
end; $$;

create function public.vendor_store_custom_owner_v1(p_product_id uuid default null,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page'; end if;
  select * into s from public.vendor_stores where owner_id=auth.uid();
  return jsonb_build_object('products',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object(
    'asking_price_currency',s.custom_currency,'ineligible_reason',public.vendor_store_custom_reason_v1(p.id),
    'section_ids',coalesce((select jsonb_agg(section_id order by section_id) from public.vendor_store_custom_product_sections where product_id=p.id),'[]'::jsonb)) order by p.id)
    from (select * from public.vendor_store_custom_products where store_id=s.id and (p_product_id is null or id=p_product_id) order by id limit 40 offset p_offset) p),'[]'::jsonb),
    'total',(select count(*) from public.vendor_store_custom_products where store_id=s.id and (p_product_id is null or id=p_product_id)),
    'offset',p_offset,'limit',40);
end; $$;

create function public.vendor_store_custom_media_owned_v1(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select p_name ~ '^[0-9a-f-]{36}/products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and exists(select 1 from public.vendor_store_custom_products p join public.vendor_stores s on s.id=p.store_id
      where s.owner_id=auth.uid() and s.id::text=split_part(p_name,'/',1) and p.id::text=split_part(p_name,'/',3) and p.archived_at is null)
    and coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    and exists(select 1 from public.vendor_store_rollout where app_enabled and custom_enabled);
$$;
create policy vendor_store_custom_media_insert on storage.objects for insert to authenticated
  with check(bucket_id='vendor-store-media' and public.vendor_store_custom_media_owned_v1(name));
-- Existing store-media owner SELECT applies; anonymous delivery remains guarded.

create function public.vendor_store_custom_mutate_v1(p_product_id uuid,p_expected_version bigint,p_action text,p_data jsonb default '{}') returns jsonb
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
    if p_expected_version is distinct from p.version then raise exception 'Product changed. Reload before saving.' using errcode='40001'; end if;
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

create function public.vendor_store_custom_revoke_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare u record; old_value jsonb:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_value jsonb:=case when TG_OP='DELETE' then '{}'::jsonb else to_jsonb(new) end;
begin
  for u in select distinct a.id from auth.users a where a.id::text in(old_value->>'user_id',new_value->>'user_id')
    or lower(a.email) in(lower(old_value->>'email'),lower(new_value->>'email')) order by a.id loop
    perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||u.id::text,0));
    if not coalesce((public.vendor_store_capabilities_v1(u.id)->>'store_app')::boolean,false) then
      update public.vendor_store_custom_products p set published=false,suspension_reason='Store access suspended',version=version+1,updated_at=now()
        from public.vendor_stores s where p.store_id=s.id and s.owner_id=u.id and p.published;
    end if;
  end loop;
  return null;
end; $$;
create trigger vendor_store_custom_entitlement_revocation after insert or update or delete on public.user_entitlements
  for each row execute function public.vendor_store_custom_revoke_v1();

create function public.vendor_store_custom_presentation_v1(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('entry_type','custom_product','id',p.id,'title',p.title,'description',p.description,
    'category',p.category,'franchise',p.franchise,'manufacturer',p.manufacturer,'release_region',p.release_region,
    'language',p.language,'condition_description',p.condition_description,'packaging_description',p.packaging_description,
    'asking_price_amount',p.asking_price_amount,'asking_price_currency',s.custom_currency,'available_quantity',p.available_quantity,
    'photo_ids',to_jsonb(array(select split_part(x,'/',4) from unnest(p.photo_paths) x)))
  from public.vendor_store_custom_products p join public.vendor_stores s on s.id=p.store_id where p.id=p_id;
$$;

create function public.vendor_store_custom_detail_v1(p_slug text,p_product_id uuid,p_surface text default 'web') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare base jsonb; p public.vendor_store_custom_products;
begin
  if p_surface not in ('web','app','preview') or p_surface is null then raise exception 'Invalid audience'; end if;
  base:=public.vendor_store_read_v1(p_slug,p_surface,'',null,null,'all',0,1);
  if base is null then return null; end if;
  select * into p from public.vendor_store_custom_products where id=p_product_id and store_id=(base#>>'{store,id}')::uuid;
  if p.id is null then return null; end if;
  if p_surface<>'preview' and (not p.published or public.vendor_store_custom_reason_v1(p.id) is not null
    or not exists(select 1 from public.vendor_store_rollout where custom_enabled)
    or not exists(select 1 from public.vendor_stores s join public.public_profiles pp on pp.user_id=s.owner_id where s.id=p.store_id
      and pp.public_profile_enabled and pp.vault_sharing_enabled and nullif(pp.slug,'') is not null and nullif(pp.display_name,'') is not null)) then return null; end if;
  return jsonb_build_object('schema_version','VENDOR_STORE_V2','store',base->'store','preview',p_surface='preview',
    'product',public.vendor_store_custom_presentation_v1(p.id));
end; $$;

create function public.vendor_store_read_v2(p_slug text,p_surface text default 'web',p_query text default '',
  p_section_id uuid default null,p_condition text default null,p_kind text default 'all',p_offset integer default 0,p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb; store_uuid uuid; owner_uuid uuid; rows jsonb; total_count integer; management boolean:=p_surface='manage';
begin
  if p_kind is null or p_kind not in('all','catalog','custom','raw','slab') then raise exception 'Invalid product type' using errcode='22023'; end if;
  -- Reuse V1 audience, entitlement, privacy, pagination and query validation.
  base:=public.vendor_store_read_v1(p_slug,p_surface,p_query,p_section_id,p_condition,case when p_kind in('raw','slab') then p_kind else 'all' end,p_offset,p_limit);
  if base is null then return null; end if;
  store_uuid:=(base#>>'{store,id}')::uuid;
  select owner_id into owner_uuid from public.vendor_stores where id=store_uuid;
  with entries as materialized (
    select v.id,'catalog_copy'::text as kind,cp.name as search_text,v.condition_label,
      jsonb_build_object('entry_type','catalog_copy','id',v.id,'gv_vi_id',v.gv_vi_id,'card_print_id',cp.id,'card_printing_id',v.card_printing_id,
        'gv_id',cp.gv_id,'printing_gv_id',pr.printing_gv_id,'name',cp.name,'set_code',cp.set_code,'number',cp.number,
        'variant_key',cp.variant_key,'printed_identity_modifier',cp.printed_identity_modifier,'set_identity_model',cp.set_identity_model,
        'image_url',cp.image_url,'image_alt_url',cp.image_alt_url,'image_source',cp.image_source,'image_path',cp.image_path,
        'representative_image_url',cp.representative_image_url,'image_status',cp.image_status,'image_note',cp.image_note,
        'finish_label',fk.label,'condition_label',v.condition_label,'is_graded',v.slab_cert_id is not null,
        'grade_company',v.grade_company,'grade_value',v.grade_value,'grade_label',v.grade_label,
        'asking_price_amount',v.asking_price_amount,'asking_price_currency',v.asking_price_currency)
      ||case when management then jsonb_build_object('selected',si.instance_id is not null,'ineligible_reason',public.vendor_store_copy_reason_v1(owner_uuid,v.id)) else '{}'::jsonb end as value
    from public.vault_item_instances v left join public.slab_certs slab on slab.id=v.slab_cert_id
    join public.card_prints cp on cp.id=coalesce(v.card_print_id,slab.card_print_id)
    left join public.card_printings pr on pr.id=v.card_printing_id and pr.card_print_id=cp.id
    left join public.finish_keys fk on fk.key=pr.finish_key
    left join public.vendor_store_items si on si.store_id=store_uuid and si.instance_id=v.id
    where p_kind in('all','catalog','raw','slab') and v.user_id=owner_uuid and v.archived_at is null
      and (management or (si.instance_id is not null and public.vendor_store_copy_reason_v1(owner_uuid,v.id) is null))
      and (p_kind not in('raw','slab') or (p_kind='raw' and v.slab_cert_id is null) or (p_kind='slab' and v.slab_cert_id is not null))
      and (coalesce(p_query,'')='' or strpos(lower(cp.name||' '||coalesce(cp.gv_id,'')||' '||coalesce(pr.printing_gv_id,'')||' '||coalesce(v.gv_vi_id,'')),lower(p_query))>0)
      and (p_condition is null or v.condition_label=p_condition)
      and (p_section_id is null or exists(select 1 from public.vendor_store_sections vs join public.wall_sections ws on ws.id=vs.section_id
        join public.wall_section_memberships wm on wm.section_id=ws.id where vs.store_id=store_uuid and vs.section_id=p_section_id and ws.user_id=owner_uuid and ws.is_active and wm.vault_item_instance_id=v.id))
    union all
    select p.id,'custom_product',p.title,null,public.vendor_store_custom_presentation_v1(p.id)
    from public.vendor_store_custom_products p
    where p.store_id=store_uuid and p_kind in('all','custom') and p_condition is null
      and p.archived_at is null and public.vendor_store_custom_reason_v1(p.id) is null
      and exists(select 1 from public.vendor_store_rollout where custom_enabled)
      and (p_surface in('preview','manage') or p.published)
      and exists(select 1 from public.public_profiles where user_id=owner_uuid and public_profile_enabled and vault_sharing_enabled and nullif(slug,'') is not null and nullif(display_name,'') is not null)
      and (coalesce(p_query,'')='' or strpos(lower(p.title||' '||p.description||' '||p.category||' '||p.franchise||' '||p.manufacturer),lower(p_query))>0)
      and (p_section_id is null or exists(select 1 from public.vendor_store_custom_product_sections ps
        join public.wall_sections ws on ws.id=ps.section_id where ps.store_id=store_uuid and ps.product_id=p.id and ps.section_id=p_section_id and ws.user_id=owner_uuid and ws.is_active))
  ), page as(select * from entries order by kind,id limit p_limit offset p_offset)
  select (select count(*) from entries),coalesce(jsonb_agg(value order by kind,id),'[]'::jsonb) into total_count,rows from page;
  return base||jsonb_build_object('schema_version','VENDOR_STORE_V2','items',rows,'total',total_count);
end; $$;

-- Retain V1 publication behavior, additionally admit explicitly published custom stock.
create or replace function public.vendor_store_publish_v1(p_surface text,p_publish boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; c jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_surface not in('app','web') or p_surface is null or p_publish is null then raise exception 'Invalid publication request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  c:=public.vendor_store_capabilities_v1(auth.uid());
  if p_publish then
    if not coalesce((c->>('store_'||p_surface))::boolean,false)
      or not exists(select 1 from public.vendor_store_rollout where app_enabled and (p_surface='app' or web_enabled))
      then raise exception 'Package does not include this destination' using errcode='42501'; end if;
    if not exists(select 1 from public.vendor_store_items i where i.store_id=s.id and public.vendor_store_copy_reason_v1(s.owner_id,i.instance_id) is null)
      and not exists(select 1 from public.vendor_store_custom_products p where p.store_id=s.id and p.published and public.vendor_store_custom_reason_v1(p.id) is null
        and exists(select 1 from public.vendor_store_rollout where custom_enabled)
        and exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled))
      then raise exception 'Select eligible sale inventory before publishing' using errcode='22023'; end if;
  end if;
  update public.vendor_stores set app_published=case when p_surface='app' then p_publish else app_published end,
    web_published=case when p_surface='web' then p_publish else web_published end,
    first_published_at=case when p_publish then coalesce(first_published_at,now()) else first_published_at end,updated_at=now() where id=s.id;
  return public.vendor_store_owner_v1();
end; $$;

revoke all on function public.vendor_store_custom_history_v1(),public.vendor_store_custom_reason_v1(uuid),public.vendor_store_custom_revoke_v1(),public.vendor_store_custom_presentation_v1(uuid) from public,anon,authenticated;
revoke all on function public.vendor_store_custom_owner_v1(uuid,integer),public.vendor_store_custom_media_owned_v1(text),public.vendor_store_custom_mutate_v1(uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.vendor_store_custom_owner_v1(uuid,integer),public.vendor_store_custom_media_owned_v1(text),public.vendor_store_custom_mutate_v1(uuid,bigint,text,jsonb) to authenticated;
revoke all on function public.vendor_store_custom_detail_v1(text,uuid,text),public.vendor_store_read_v2(text,text,text,uuid,text,text,integer,integer) from public;
grant execute on function public.vendor_store_custom_detail_v1(text,uuid,text),public.vendor_store_read_v2(text,text,text,uuid,text,text,integer,integer) to anon,authenticated;
commit;
