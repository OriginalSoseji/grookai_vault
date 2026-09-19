-- VENDOR_STOREFRONTS_V1: presentation over existing Vault ownership.
-- Local candidate only. Rollout defaults OFF; no entitlement or inventory grants.
begin;

create table public.vendor_store_rollout (
  singleton boolean primary key default true check (singleton),
  app_enabled boolean not null default false,
  web_enabled boolean not null default false
);
insert into public.vendor_store_rollout(singleton) values (true);
alter table public.vendor_store_rollout enable row level security;
revoke all on public.vendor_store_rollout from public, anon, authenticated;
grant select, update on public.vendor_store_rollout to service_role;

create table public.vendor_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 63 and slug <> 'owner'),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  description text not null default '' check (length(description) <= 1000),
  logo_path text,
  banner_path text,
  app_published boolean not null default false,
  web_published boolean not null default false,
  first_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vendor_store_items (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(store_id, instance_id)
);
create index vendor_store_items_instance_idx on public.vendor_store_items(instance_id);
create table public.vendor_store_sections (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  section_id uuid not null references public.wall_sections(id) on delete cascade,
  position integer not null default 0 check(position between 0 and 19),
  primary key(store_id, section_id)
);
create table public.vendor_referral_signups (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  vendor_user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.vendor_stores(id) on delete cascade,
  gvvi_id text,
  referral_created_at timestamptz not null,
  credited_at timestamptz not null default now(),
  check (referred_user_id <> vendor_user_id),
  check ((store_id is null) <> (gvvi_id is null))
);
alter table public.vendor_stores enable row level security;
alter table public.vendor_store_items enable row level security;
alter table public.vendor_store_sections enable row level security;
alter table public.vendor_referral_signups enable row level security;
revoke all on public.vendor_stores, public.vendor_store_items, public.vendor_store_sections,
  public.vendor_referral_signups from public, anon, authenticated;
grant select on public.vendor_stores, public.vendor_store_items, public.vendor_store_sections to authenticated;
grant select on public.vendor_stores, public.vendor_store_items, public.vendor_store_sections,
  public.vendor_referral_signups to service_role;
create policy vendor_stores_owner_read on public.vendor_stores for select to authenticated
  using(owner_id = auth.uid());
create policy vendor_store_items_owner_read on public.vendor_store_items for select to authenticated
  using(exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));
create policy vendor_store_sections_owner_read on public.vendor_store_sections for select to authenticated
  using(exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

-- Database-only authority. An active user-ID grant takes precedence over email.
create function public.vendor_store_capabilities_v1(p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with grant_row as (
    select e.features from public.user_entitlements e
    join auth.users u on u.id=p_user_id
    where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
    order by (e.user_id=u.id) desc nulls last, e.id limit 1
  )
  select jsonb_build_object(
    'store_app', coalesce((select features->'store_app' = 'true'::jsonb from grant_row),false),
    'store_web', coalesce((select features->'store_app' = 'true'::jsonb and features->'store_web' = 'true'::jsonb from grant_row),false)
  );
$$;

create function public.vendor_store_owner_v1() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.vendor_stores; c jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.vendor_stores where owner_id=auth.uid();
  c := public.vendor_store_capabilities_v1(auth.uid());
  return jsonb_build_object('schema_version','VENDOR_STORE_V1','store',
    case when s.id is null then null else to_jsonb(s)-'owner_id' end,
    'capabilities',c,'rollout',(select to_jsonb(r)-'singleton' from public.vendor_store_rollout r),
    'sections',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,
       'selected',vs.section_id is not null,'position',vs.position) order by w.position,w.id)
       from public.wall_sections w left join public.vendor_store_sections vs on vs.section_id=w.id and vs.store_id=s.id
       where w.user_id=auth.uid() and w.is_active), '[]'::jsonb));
end;
$$;

create function public.vendor_store_save_v1(p_slug text,p_display_name text,p_description text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.vendor_stores; v_slug text := trim(both '-' from regexp_replace(regexp_replace(lower(btrim(p_slug)),'[[:space:]_]+','-','g'),'-+','-','g'));
begin
  if auth.uid() is null or not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.first_published_at is not null and s.slug is distinct from v_slug then
    raise exception 'Store URL cannot change after publication' using errcode='22023';
  end if;
  insert into public.vendor_stores(owner_id,slug,display_name,description)
    values(auth.uid(),v_slug,btrim(p_display_name),coalesce(p_description,''))
    on conflict(owner_id) do update set slug=excluded.slug,display_name=excluded.display_name,
      description=excluded.description,updated_at=now();
  return public.vendor_store_owner_v1();
end;
$$;

-- Central eligibility; never changes existing copies, canonical data, or prices.
-- Caller visibility is also checked by the existing catalog read boundary.
create function public.vendor_store_copy_reason_v1(p_owner uuid,p_instance uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v public.vault_item_instances; parent_id uuid;
begin
  select * into v from public.vault_item_instances where id=p_instance;
  if v.id is null or v.user_id is distinct from p_owner then return 'Copy no longer owned'; end if;
  if v.archived_at is not null then return 'Copy archived'; end if;
  if not exists(select 1 from public.public_profiles where user_id=p_owner and public_profile_enabled
    and vault_sharing_enabled and nullif(slug,'') is not null and nullif(display_name,'') is not null)
    then return 'Enable public profile and Vault sharing'; end if;
  if v.intent is distinct from 'sell' then return 'Copy is not for sale'; end if;
  if v.pricing_mode is distinct from 'asking' or v.asking_price_amount is null or v.asking_price_amount<=0
    or v.asking_price_amount::text in ('NaN','Infinity','-Infinity')
    then return 'Set a positive asking price in Vendor Mode'; end if;
  if coalesce(v.asking_price_currency,'') !~ '^[A-Z]{3}$' then return 'Set a sale currency'; end if;
  parent_id := coalesce(v.card_print_id,(select card_print_id from public.slab_certs where id=v.slab_cert_id));
  if parent_id is null or not public.catalog_card_print_visible_to_request_v1(parent_id)
    then return 'Card is not publicly available'; end if;
  -- Store inventory uses the public release audience on every surface, including
  -- signed-in app/owner preview. Authentication must not promote staged catalog.
  if not exists(
    select 1 from public.card_prints cp
    left join public.sets st on st.id=cp.set_id
    left join public.catalog_set_release_controls sc on sc.set_id=st.id
    left join public.games g on g.id=cp.game_id
    where cp.id=parent_id and case when sc.set_id is not null then sc.release_status='public'
      else lower(coalesce(st.game,g.code,''))='pokemon' or exists(
        select 1 from public.catalog_game_release_controls gc
        where lower(gc.game_code)=lower(coalesce(st.game,g.code,'')) and gc.release_status='public') end
  ) then return 'Card is not publicly released'; end if;
  if not exists(select 1 from public.card_prints where id=parent_id and nullif(gv_id,'') is not null)
    then return 'Card identity unavailable'; end if;
  if nullif(v.gv_vi_id,'') is null or v.legacy_vault_item_id is null then return 'Exact-copy identity unavailable'; end if;
  if v.card_printing_id is null then return 'Printing unassigned'; end if;
  if not exists(select 1 from public.get_public_card_printing_options_v1(array[parent_id],1000,0) p
    where p.id=v.card_printing_id and p.card_print_id=parent_id and nullif(p.printing_gv_id,'') is not null)
    then return 'Printing unavailable or pending review'; end if;
  return null;
end;
$$;

create function public.vendor_store_select_item_v1(p_instance_id uuid,p_selected boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.vendor_stores; reason text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  if p_selected is null then raise exception 'Selection required' using errcode='22023'; end if;
  if not p_selected then delete from public.vendor_store_items where store_id=s.id and instance_id=p_instance_id; return; end if;
  if not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  perform 1 from public.vault_item_instances where id=p_instance_id for update;
  reason := public.vendor_store_copy_reason_v1(auth.uid(),p_instance_id);
  if reason is not null then raise exception '%',reason using errcode='22023'; end if;
  insert into public.vendor_store_items(store_id,instance_id) values(s.id,p_instance_id) on conflict do nothing;
end;
$$;

create function public.vendor_store_select_section_v1(p_section_id uuid,p_selected boolean,p_position integer default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.vendor_stores;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  if p_selected is null then raise exception 'Selection required' using errcode='22023'; end if;
  if not p_selected then delete from public.vendor_store_sections where store_id=s.id and section_id=p_section_id; return; end if;
  if not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.wall_sections where id=p_section_id and user_id=auth.uid() and is_active)
    then raise exception 'Section unavailable' using errcode='42501'; end if;
  if (select count(*) from public.vendor_store_sections where store_id=s.id)>=20
    and not exists(select 1 from public.vendor_store_sections where store_id=s.id and section_id=p_section_id)
    then raise exception 'At most 20 sections' using errcode='22023'; end if;
  insert into public.vendor_store_sections(store_id,section_id,position) values(s.id,p_section_id,p_position)
    on conflict(store_id,section_id) do update set position=excluded.position;
end;
$$;

create function public.vendor_store_publish_v1(p_surface text,p_publish boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.vendor_stores; c jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_surface not in ('app','web') or p_surface is null or p_publish is null then raise exception 'Invalid publication request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  c := public.vendor_store_capabilities_v1(auth.uid());
  if p_publish then
    if not coalesce((c->>('store_'||p_surface))::boolean,false)
      or not exists(select 1 from public.vendor_store_rollout where app_enabled and (p_surface='app' or web_enabled))
      then raise exception 'Package does not include this destination' using errcode='42501'; end if;
    if not exists(select 1 from public.vendor_store_items i where i.store_id=s.id
      and public.vendor_store_copy_reason_v1(s.owner_id,i.instance_id) is null)
      then raise exception 'Select eligible sale inventory before publishing' using errcode='22023'; end if;
  end if;
  update public.vendor_stores set
    app_published=case when p_surface='app' then p_publish else app_published end,
    web_published=case when p_surface='web' then p_publish else web_published end,
    first_published_at=case when p_publish then coalesce(first_published_at,now()) else first_published_at end,
    updated_at=now() where id=s.id;
  return public.vendor_store_owner_v1();
end;
$$;

-- Revocation is durable: re-upgrade never silently republishes. Serialize with publish.
create function public.vendor_store_revoke_publication_v1() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u record; c jsonb; old_value jsonb := case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_value jsonb := case when TG_OP='DELETE' then '{}'::jsonb else to_jsonb(new) end;
begin
  for u in select distinct a.id from auth.users a where a.id::text in (old_value->>'user_id',new_value->>'user_id')
    or lower(a.email) in (lower(old_value->>'email'),lower(new_value->>'email')) order by a.id loop
    perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||u.id::text,0));
    c := public.vendor_store_capabilities_v1(u.id);
    update public.vendor_stores set app_published=app_published and coalesce((c->>'store_app')::boolean,false),
      web_published=web_published and coalesce((c->>'store_web')::boolean,false),updated_at=now()
      where owner_id=u.id and (app_published or web_published);
  end loop;
  return null;
end;
$$;
create trigger vendor_store_entitlement_revocation after insert or update or delete on public.user_entitlements
  for each row execute function public.vendor_store_revoke_publication_v1();

-- One bounded DTO for Flutter, browser, and owner preview. Public responses contain
-- only selected eligible copies; management alone includes ineligibility reasons.
create function public.vendor_store_read_v1(p_slug text,p_surface text default 'web',p_query text default '',
  p_section_id uuid default null,p_condition text default null,p_kind text default 'all',p_offset integer default 0,p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.vendor_stores; c jsonb; owner_view boolean; management boolean;
  item_rows jsonb; section_rows jsonb; total_count integer;
begin
  if p_surface is null or p_surface not in ('web','app','preview','manage') or p_kind is null or p_kind not in ('all','raw','slab')
    or p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 100000
    or length(coalesce(p_query,''))>120 or (p_condition is not null and p_condition not in ('NM','LP','MP','HP','DMG'))
    then raise exception 'Invalid store query' using errcode='22023'; end if;
  select * into s from public.vendor_stores where slug=lower(btrim(p_slug));
  if s.id is null then return null; end if;
  owner_view := p_surface in ('preview','manage'); management := p_surface='manage';
  c := public.vendor_store_capabilities_v1(s.owner_id);
  if owner_view then
    if auth.uid() is distinct from s.owner_id then return null; end if;
  else
    if not exists(select 1 from public.vendor_store_rollout where app_enabled and (p_surface='app' or web_enabled))
      or not coalesce((c->>('store_'||p_surface))::boolean,false)
      or (p_surface='web' and not s.web_published)
      or (p_surface='app' and (not s.app_published or auth.uid() is null))
      or not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled)
      then return null; end if;
  end if;
  with candidates as materialized (
    select v.id,v.gv_vi_id,v.card_printing_id,v.condition_label,v.slab_cert_id,
      v.grade_company,v.grade_value,v.grade_label,v.asking_price_amount,v.asking_price_currency,
      cp.id as card_print_id,cp.gv_id,cp.name,cp.set_code,cp.number,cp.image_url,cp.image_alt_url,
      cp.image_source,cp.image_path,cp.representative_image_url,cp.image_status,cp.image_note,
      cp.variant_key,cp.printed_identity_modifier,cp.set_identity_model,
      pr.printing_gv_id, fk.label as finish_label,
      (si.instance_id is not null) as selected,
      public.vendor_store_copy_reason_v1(s.owner_id,v.id) as reason
    from public.vault_item_instances v
    left join public.slab_certs slab on slab.id=v.slab_cert_id
    join public.card_prints cp on cp.id=coalesce(v.card_print_id,slab.card_print_id)
    left join public.card_printings pr on pr.id=v.card_printing_id and pr.card_print_id=cp.id
    left join public.finish_keys fk on fk.key=pr.finish_key
    left join public.vendor_store_items si on si.store_id=s.id and si.instance_id=v.id
    where v.user_id=s.owner_id and v.archived_at is null and (management or si.instance_id is not null)
      and (coalesce(p_query,'')='' or strpos(lower(cp.name||' '||coalesce(cp.gv_id,'')||' '||coalesce(pr.printing_gv_id,'')||' '||coalesce(v.gv_vi_id,'')),lower(p_query))>0)
      and (p_condition is null or v.condition_label=p_condition)
      and (p_kind='all' or (p_kind='raw' and v.slab_cert_id is null) or (p_kind='slab' and v.slab_cert_id is not null))
      and (p_section_id is null or exists(select 1 from public.vendor_store_sections vs
        join public.wall_sections ws on ws.id=vs.section_id and ws.user_id=s.owner_id and ws.is_active
        join public.wall_section_memberships wm on wm.section_id=ws.id and wm.vault_item_instance_id=v.id
        where vs.store_id=s.id and vs.section_id=p_section_id))
  ), eligible as materialized (select * from candidates where management or reason is null),
  page as (select * from eligible order by id limit p_limit offset p_offset)
  select (select count(*) from eligible),coalesce(jsonb_agg(
    (to_jsonb(page)-'reason'-'selected'-'slab_cert_id')||jsonb_build_object('is_graded',page.slab_cert_id is not null)
    ||case when management then jsonb_build_object('selected',page.selected,'ineligible_reason',page.reason) else '{}'::jsonb end
    order by page.id),'[]'::jsonb) into total_count,item_rows from page;
  select coalesce(jsonb_agg(jsonb_build_object('id',ws.id,'name',ws.name) order by vs.position,ws.id),'[]'::jsonb)
    into section_rows from public.vendor_store_sections vs
    join public.wall_sections ws on ws.id=vs.section_id and ws.user_id=s.owner_id and ws.is_active where vs.store_id=s.id;
  return jsonb_build_object('schema_version','VENDOR_STORE_V1','store',jsonb_build_object(
    'id',s.id,'slug',s.slug,'display_name',s.display_name,'description',s.description,
    'has_logo',s.logo_path is not null,'has_banner',s.banner_path is not null,
    'collector_slug',(select slug from public.public_profiles where user_id=s.owner_id)),
    'items',item_rows,'sections',section_rows,'total',total_count,'offset',p_offset,'limit',p_limit,
    'preview',owner_view);
end;
$$;

-- Private draft media. No anonymous Storage read; web delivery rechecks publication.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('vendor-store-media','vendor-store-media',false,5242880,array['image/jpeg','image/png','image/webp']);
create function public.vendor_store_media_owned_v1(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.vendor_stores s
    where s.owner_id=auth.uid() and split_part(p_name,'/',1)=s.id::text)
    and p_name ~ '^[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    and exists(select 1 from public.vendor_store_rollout where app_enabled);
$$;
create policy vendor_store_media_insert on storage.objects for insert to authenticated
  with check(bucket_id='vendor-store-media' and public.vendor_store_media_owned_v1(name));
create policy vendor_store_media_owner_select on storage.objects for select to authenticated
  using(bucket_id='vendor-store-media' and exists(select 1 from public.vendor_stores s where s.owner_id=auth.uid() and split_part(name,'/',1)=s.id::text));
create function public.vendor_store_set_media_v1(p_kind text,p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind is null or p_kind not in ('logo','banner') or auth.uid() is null
    or not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Media access unavailable' using errcode='42501'; end if;
  if p_path is not null and (not public.vendor_store_media_owned_v1(p_path) or split_part(p_path,'/',2)<>p_kind
    or not exists(select 1 from storage.objects where bucket_id='vendor-store-media' and name=p_path))
    then raise exception 'Media unavailable' using errcode='42501'; end if;
  update public.vendor_stores set logo_path=case when p_kind='logo' then p_path else logo_path end,
    banner_path=case when p_kind='banner' then p_path else banner_path end,updated_at=now() where owner_id=auth.uid();
  if not found then raise exception 'Store unavailable' using errcode='42501'; end if;
end;
$$;

-- Only the server that decrypted the context may call this. It independently
-- derives ownership and compares auth.users.created_at, never a client event.
create function public.vendor_referral_credit_v1(p_referred_user_id uuid,p_store_id uuid,p_gvvi_id text,p_created_at timestamptz,p_expires_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare vendor_id uuid; created timestamptz; v public.vault_item_instances; inserted_count integer;
begin
  if (p_store_id is null)=(p_gvvi_id is null) or p_created_at is null or p_expires_at is null
    or p_created_at>now() or p_expires_at<=now() or p_expires_at<=p_created_at or p_expires_at-p_created_at>interval '30 days'
    then return 'invalid_context'; end if;
  select created_at into created from auth.users where id=p_referred_user_id;
  if created is null or created<p_created_at or created>p_expires_at then return 'not_new_account'; end if;
  if p_store_id is not null then
    select s.owner_id into vendor_id from public.vendor_stores s where s.id=p_store_id and s.web_published
      and coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
      and exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
      and exists(select 1 from public.public_profiles pp where pp.user_id=s.owner_id and pp.public_profile_enabled and pp.vault_sharing_enabled);
  else
    select * into v from public.vault_item_instances where gv_vi_id=p_gvvi_id and archived_at is null;
    if v.intent='sell' and v.pricing_mode='asking' and v.asking_price_amount>0 and v.legacy_vault_item_id is not null
      and exists(select 1 from public.public_profiles pp where pp.user_id=v.user_id and pp.public_profile_enabled and pp.vault_sharing_enabled)
      and exists(select 1 from public.user_entitlements e join auth.users u on u.id=v.user_id
        where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
        and (e.tier in ('vendor','founder_admin') or e.role in ('vendor','founder') or e.features->'vendor_tools'='true'::jsonb))
      then vendor_id:=v.user_id; end if;
  end if;
  if vendor_id is null then return 'vendor_offer_unavailable'; end if;
  if vendor_id=p_referred_user_id then return 'self_referral_blocked'; end if;
  insert into public.vendor_referral_signups(referred_user_id,vendor_user_id,store_id,gvvi_id,referral_created_at)
    values(p_referred_user_id,vendor_id,p_store_id,p_gvvi_id,p_created_at) on conflict(referred_user_id) do nothing;
  get diagnostics inserted_count = row_count;
  return case when inserted_count=1 then 'credited' else 'already_credited' end;
end;
$$;

revoke all on function public.vendor_store_capabilities_v1(uuid),public.vendor_store_copy_reason_v1(uuid,uuid),
  public.vendor_store_revoke_publication_v1() from public,anon,authenticated;
revoke all on function public.vendor_store_owner_v1(),public.vendor_store_save_v1(text,text,text),
  public.vendor_store_select_item_v1(uuid,boolean),public.vendor_store_select_section_v1(uuid,boolean,integer),
  public.vendor_store_publish_v1(text,boolean),public.vendor_store_set_media_v1(text,text),
  public.vendor_store_media_owned_v1(text) from public,anon;
grant execute on function public.vendor_store_owner_v1(),public.vendor_store_save_v1(text,text,text),
  public.vendor_store_select_item_v1(uuid,boolean),public.vendor_store_select_section_v1(uuid,boolean,integer),
  public.vendor_store_publish_v1(text,boolean),public.vendor_store_set_media_v1(text,text),
  public.vendor_store_media_owned_v1(text) to authenticated;
revoke all on function public.vendor_store_read_v1(text,text,text,uuid,text,text,integer,integer) from public;
grant execute on function public.vendor_store_read_v1(text,text,text,uuid,text,text,integer,integer) to anon,authenticated;
revoke all on function public.vendor_referral_credit_v1(uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.vendor_referral_credit_v1(uuid,uuid,text,timestamptz,timestamptz) to service_role;
commit;
