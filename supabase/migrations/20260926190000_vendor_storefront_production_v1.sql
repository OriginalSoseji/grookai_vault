-- Production storefront release candidate; original 19 inputs are retained.
-- Final bodies and grants are preserved. No duplicated pending definitions.
-- Defer body validation until all additive dependencies exist (as in pg_dump).
-- Exact schema/security parity and runtime proofs are mandatory before release.
begin;
set local check_function_bodies = off;
-- Consolidated unapplied storefront release. Historical inputs and binding are
-- retained in docs/audits/vendor_storefront_release_package_v1/.
-- Final function behavior and grants are preserved; no duplicate definitions.

-- VENDOR_STOREFRONTS_V1: presentation over existing Vault ownership.
-- Local candidate only. Rollout defaults OFF; no entitlement or inventory grants.

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
create or replace function public.vendor_store_capabilities_v1(p_user_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select case when exists(select 1 from public.vendor_billing_accounts where owner_id=p_user_id and closeout_id is not null)
    or exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_user_id))
    then '{"store_app":false,"store_web":false}'::jsonb else jsonb_build_object(
    'store_app',coalesce(public.grookai_effective_entitlement_v1(p_user_id)->'features'->'store_app','false'::jsonb),
    'store_web',coalesce(public.grookai_effective_entitlement_v1(p_user_id)->'features'->'store_web','false'::jsonb)) end;
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
create or replace function public.vendor_referral_credit_v1(p_referred_user_id uuid,p_store_id uuid,p_gvvi_id text,p_created_at timestamptz,p_expires_at timestamptz)
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
        and (e.tier in ('vendor','founder_admin') or e.role in ('vendor','founder') or e.features->'vendor_tools'='true'::jsonb
          or public.grookai_effective_entitlement_v1(v.user_id)->'features'->'vendor_tools'='true'::jsonb))
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

-- Seller-authored browse-only products; no canonical or Vault identity writes.

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


revoke all on function public.vendor_store_custom_history_v1(),public.vendor_store_custom_reason_v1(uuid),public.vendor_store_custom_revoke_v1(),public.vendor_store_custom_presentation_v1(uuid) from public,anon,authenticated;
revoke all on function public.vendor_store_custom_owner_v1(uuid,integer),public.vendor_store_custom_media_owned_v1(text),public.vendor_store_custom_mutate_v1(uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.vendor_store_custom_owner_v1(uuid,integer),public.vendor_store_custom_media_owned_v1(text),public.vendor_store_custom_mutate_v1(uuid,bigint,text,jsonb) to authenticated;
revoke all on function public.vendor_store_custom_detail_v1(text,uuid,text),public.vendor_store_read_v2(text,text,text,uuid,text,text,integer,integer) from public;
grant execute on function public.vendor_store_custom_detail_v1(text,uuid,text),public.vendor_store_read_v2(text,text,text,uuid,text,text,integer,integer) to anon,authenticated;

-- Local billing candidate. No provider call or worker activation. Only verified,
-- service-controlled projection may grant a time-bounded billing contribution.
-- Storefront prerequisite remains a separately governed release.


create table if not exists public.vendor_billing_accounts (
  owner_id uuid primary key references auth.users(id) on delete restrict,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  customer_id text null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  customer_attempt_id uuid not null unique default gen_random_uuid(),
  customer_attempt_created_at timestamptz not null default now(),
  current_subscription_id text null check (current_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  subscription_status text not null default 'none' check (subscription_status in
    ('none','incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
  lease_fence bigint not null default 0 check (lease_fence >= 0),
  lease_token uuid null,
  lease_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_billing_lease_pair check ((lease_token is null) = (lease_expires_at is null)),
  constraint vendor_billing_customer_scope unique (stripe_account_id,livemode,customer_id)
);

create table if not exists public.vendor_billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.vendor_billing_accounts(owner_id) on delete cascade,
  customer_id text not null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  requested_plan text not null check (requested_plan in ('store_app','store_web')),
  state text not null default 'creating' check (state in ('creating','open','completed','enrolled','expired','recovery')),
  session_id text null unique check (session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  subscription_id text null check (subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_billing_completed_identity check (
    (state not in ('completed','enrolled') or (session_id is not null and subscription_id is not null))
    and (state not in ('open','expired') or subscription_id is null))
);
-- Completed-but-not-enrolled still blocks another paid checkout. Enrollment and
-- account projection must eventually move this state atomically under the lease.
create unique index if not exists vendor_billing_one_pending_checkout
  on public.vendor_billing_checkout_attempts(owner_id)
  where state in ('creating','open','completed','recovery');

create table if not exists public.vendor_billing_events (
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  event_id text not null check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null check (event_type in (
    'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
    'customer.subscription.paused','customer.subscription.resumed','invoice.paid','invoice.payment_failed',
    'invoice.payment_action_required','invoice.updated','invoice.voided','invoice.marked_uncollectible')),
  customer_id text not null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  subscription_id text not null check (subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  provider_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','processed','ignored')),
  attempts integer not null default 0 check (attempts >= 0),
  retry_after timestamptz not null default now(),
  last_error_code text null check (last_error_code ~ '^[a-z_]{1,64}$'),
  processed_at timestamptz null,
  primary key (stripe_account_id,livemode,event_id)
);
create index if not exists vendor_billing_pending_event_retry
  on public.vendor_billing_events(retry_after,received_at) where state='pending';

alter table public.vendor_billing_accounts enable row level security;
alter table public.vendor_billing_checkout_attempts enable row level security;
alter table public.vendor_billing_events enable row level security;
revoke all on public.vendor_billing_accounts,public.vendor_billing_checkout_attempts,public.vendor_billing_events from public,anon,authenticated;
grant all on public.vendor_billing_accounts,public.vendor_billing_checkout_attempts,public.vendor_billing_events to service_role;

create or replace function public.vendor_billing_reserve_account_v1(p_owner_id uuid,p_stripe_account_id text,p_livemode boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  -- The service route derives p_owner_id from a verified authenticated session.
  -- Neither webhook metadata nor an email-address lookup can call this on behalf
  -- of an owner. All mutation RPCs in this migration are service-role-only.
  if exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_owner_id)) then raise exception 'billing_account_closing' using errcode='P0001';end if;
  insert into public.vendor_billing_accounts(owner_id,stripe_account_id,livemode)
    values(p_owner_id,p_stripe_account_id,p_livemode) on conflict(owner_id) do nothing;
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  if a.stripe_account_id is distinct from p_stripe_account_id or a.livemode is distinct from p_livemode then
    raise exception 'billing_scope_mismatch' using errcode='P0001';
  end if;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_claim_v1(p_owner_id uuid,p_claim_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; t timestamptz;
begin
  if p_claim_token is null then raise exception 'billing_claim_required' using errcode='22023'; end if;
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  t:=clock_timestamp();
  if a.lease_expires_at>t then
    if a.lease_token=p_claim_token then return to_jsonb(a); end if;
    return null;
  end if;
  update public.vendor_billing_accounts set lease_token=p_claim_token,lease_fence=lease_fence+1,
    lease_expires_at=t+interval '120 seconds',updated_at=t where owner_id=p_owner_id returning * into a;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_locked_account_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns public.vendor_billing_accounts language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  if a.lease_token is distinct from p_claim_token or p_claim_token is null or a.lease_fence is distinct from p_fence
    or a.lease_expires_at is null or a.lease_expires_at<=clock_timestamp() then
    raise exception 'billing_lease_lost' using errcode='P0001';
  end if;
  return a;
end;
$$;

create or replace function public.vendor_billing_bind_customer_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_customer_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if p_customer_id is null or p_customer_id !~ '^cus_[A-Za-z0-9]+$' then
    raise exception 'billing_customer_invalid' using errcode='22023';
  end if;
  if a.customer_id is not null and a.customer_id<>p_customer_id then
    raise exception 'billing_customer_already_bound' using errcode='P0001';
  end if;
  update public.vendor_billing_accounts set customer_id=p_customer_id,updated_at=clock_timestamp()
    where owner_id=p_owner_id returning * into a;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_begin_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_plan text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; c public.vendor_billing_checkout_attempts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if p_plan is null or p_plan not in ('store_app','store_web') then raise exception 'billing_plan_invalid' using errcode='22023'; end if;
  if a.customer_id is null then raise exception 'billing_customer_required' using errcode='P0001'; end if;
  if a.current_subscription_id is not null then raise exception 'billing_existing_subscription' using errcode='P0001'; end if;
  select * into c from public.vendor_billing_checkout_attempts where owner_id=p_owner_id
    and state in ('creating','open','completed','recovery') for update;
  if found then
    if c.requested_plan<>p_plan then raise exception 'billing_checkout_already_pending' using errcode='P0001'; end if;
    return to_jsonb(c);
  end if;
  insert into public.vendor_billing_checkout_attempts(owner_id,customer_id,requested_plan)
    values(p_owner_id,a.customer_id,p_plan) returning * into c;
  return to_jsonb(c);
end;
$$;

create or replace function public.vendor_billing_bind_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,
  p_attempt_id uuid,p_session_id text,p_state text,p_subscription_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; c public.vendor_billing_checkout_attempts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  select * into strict c from public.vendor_billing_checkout_attempts where id=p_attempt_id and owner_id=p_owner_id for update;
  if c.customer_id is distinct from a.customer_id then raise exception 'billing_customer_mismatch' using errcode='P0001'; end if;
  if p_session_id is null or p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' or p_state is null or p_state not in ('open','completed','expired') then
    raise exception 'billing_checkout_invalid' using errcode='22023';
  end if;
  if (c.session_id is not null and c.session_id<>p_session_id) or c.state='enrolled'
    or (c.state in ('expired','completed') and c.state<>p_state) then
    raise exception 'billing_checkout_transition_invalid' using errcode='P0001';
  end if;
  if c.subscription_id is not null and c.subscription_id is distinct from p_subscription_id then
    raise exception 'billing_subscription_mismatch' using errcode='P0001';
  end if;
  update public.vendor_billing_checkout_attempts set session_id=p_session_id,state=p_state,
    subscription_id=p_subscription_id,updated_at=clock_timestamp() where id=p_attempt_id returning * into c;
  return to_jsonb(c);
end;
$$;

create or replace function public.vendor_billing_enqueue_event_v1(p_stripe_account_id text,p_livemode boolean,p_event_id text,
  p_event_type text,p_customer_id text,p_subscription_id text,p_provider_created_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vendor_billing_events; inserted integer;
begin
  -- Only call after the official SDK has verified the raw signed envelope,
  -- account, environment and API version. Persist bounded references, not payloads.
  insert into public.vendor_billing_events(stripe_account_id,livemode,event_id,event_type,customer_id,subscription_id,provider_created_at)
    values(p_stripe_account_id,p_livemode,p_event_id,p_event_type,p_customer_id,p_subscription_id,p_provider_created_at)
    on conflict(stripe_account_id,livemode,event_id) do nothing;
  get diagnostics inserted=row_count;
  select * into strict e from public.vendor_billing_events where stripe_account_id=p_stripe_account_id
    and livemode=p_livemode and event_id=p_event_id;
  if e.event_type is distinct from p_event_type or e.customer_id is distinct from p_customer_id
    or e.subscription_id is distinct from p_subscription_id or e.provider_created_at is distinct from p_provider_created_at then
    raise exception 'billing_event_identity_conflict' using errcode='P0001';
  end if;
  return jsonb_build_object('inserted',inserted=1,'state',e.state);
end;
$$;

create or replace function public.vendor_billing_release_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  update public.vendor_billing_accounts set lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
    where owner_id=p_owner_id;
end;
$$;

revoke all on function public.vendor_billing_reserve_account_v1(uuid,text,boolean),public.vendor_billing_claim_v1(uuid,uuid),
  public.vendor_billing_locked_account_v1(uuid,uuid,bigint),public.vendor_billing_bind_customer_v1(uuid,uuid,bigint,text),
  public.vendor_billing_begin_checkout_v1(uuid,uuid,bigint,text),public.vendor_billing_bind_checkout_v1(uuid,uuid,bigint,uuid,text,text,text),
  public.vendor_billing_enqueue_event_v1(text,boolean,text,text,text,text,timestamptz),public.vendor_billing_release_v1(uuid,uuid,bigint)
  from public,anon,authenticated;
grant execute on function public.vendor_billing_reserve_account_v1(uuid,text,boolean),public.vendor_billing_claim_v1(uuid,uuid),
  public.vendor_billing_locked_account_v1(uuid,uuid,bigint),public.vendor_billing_bind_customer_v1(uuid,uuid,bigint,text),
  public.vendor_billing_begin_checkout_v1(uuid,uuid,bigint,text),public.vendor_billing_bind_checkout_v1(uuid,uuid,bigint,uuid,text,text,text),
  public.vendor_billing_enqueue_event_v1(text,boolean,text,text,text,text,timestamptz),public.vendor_billing_release_v1(uuid,uuid,bigint)
  to service_role;

-- Billing contributions are separate from manual tier/role/features. The existing
-- entitlement row remains the capability authority, including operator suspension.
alter table public.user_entitlements add column if not exists billing_plan text;
alter table public.user_entitlements add column if not exists billing_paid_from timestamptz;
alter table public.user_entitlements add column if not exists billing_paid_through timestamptz;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.user_entitlements'::regclass and conname='user_entitlements_billing_window') then
    alter table public.user_entitlements add constraint user_entitlements_billing_window check (
      (billing_plan is null and billing_paid_from is null and billing_paid_through is null)
      or (billing_plan in ('store_app','store_web') and billing_plan is not null and user_id is not null
        and billing_paid_from is not null and billing_paid_through is not null
        and isfinite(billing_paid_from) and isfinite(billing_paid_through) and billing_paid_from<billing_paid_through));
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.user_entitlements'::regclass and conname='user_entitlements_billing_owner') then
    alter table public.user_entitlements add constraint user_entitlements_billing_owner unique(id,user_id);
  end if;
end $$;
alter table public.vendor_billing_accounts add column if not exists entitlement_id uuid;
alter table public.vendor_billing_accounts add column if not exists cancel_at_period_end boolean not null default false;
alter table public.vendor_billing_accounts add column if not exists last_reconciled_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists customer_creation_started_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_id uuid;
alter table public.vendor_billing_accounts add column if not exists closeout_requested_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_ticket_hash text check(closeout_ticket_hash ~ '^[0-9a-f]{64}$');
alter table public.vendor_billing_accounts add column if not exists closeout_paid_through timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_verified_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_error text check(closeout_error in ('provider_unavailable','recovery_required','financial_review'));
alter table public.vendor_billing_accounts add column if not exists closeout_reviews jsonb not null default '[]'::jsonb check(jsonb_typeof(closeout_reviews)='array');
create table if not exists public.vendor_billing_closed_accounts (
 id uuid primary key,owner_fingerprint text not null unique check(owner_fingerprint ~ '^[0-9a-f]{64}$'),
 stripe_account_id text not null,livemode boolean not null,customer_id text,
 request_ticket_hash text not null check(request_ticket_hash ~ '^[0-9a-f]{64}$'),
 archived_at timestamptz not null default clock_timestamp(),
 financial_snapshot jsonb not null check(jsonb_typeof(financial_snapshot)='object'),
 constraint vendor_billing_closed_customer unique(stripe_account_id,livemode,customer_id)
);
create table if not exists public.vendor_account_financial_holds (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete restrict,
 reason text not null check(reason in ('order_fulfillment','refund','dispute','payout','manual_review')),
 reference_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,reason,reference_id)
);
alter table public.vendor_billing_closed_accounts enable row level security;
alter table public.vendor_account_financial_holds enable row level security;
revoke all on public.vendor_billing_closed_accounts,public.vendor_account_financial_holds from public,anon,authenticated;
grant all on public.vendor_billing_closed_accounts,public.vendor_account_financial_holds to service_role;
create or replace function public.vendor_billing_owner_fingerprint_v1(p_owner_id uuid) returns text language sql immutable strict set search_path='' as $$
 select encode(sha256(convert_to('grookai-billing-owner-v1:'||p_owner_id::text,'UTF8')),'hex');
$$;
revoke all on function public.vendor_billing_owner_fingerprint_v1(uuid) from public,anon,authenticated;
grant execute on function public.vendor_billing_owner_fingerprint_v1(uuid) to service_role;
alter table public.vendor_billing_accounts add column if not exists reconcile_after timestamptz not null default now();
alter table public.vendor_billing_accounts add column if not exists reconcile_failures integer not null default 0 check(reconcile_failures>=0);
alter table public.vendor_billing_accounts add column if not exists reconcile_error text check(reconcile_error in ('checkout_pending','binding_required','reconciliation_failed'));
create index if not exists vendor_billing_reconcile_due on public.vendor_billing_accounts(stripe_account_id,livemode,reconcile_after,owner_id) where customer_id is not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.vendor_billing_accounts'::regclass and conname='vendor_billing_entitlement_owner') then
    alter table public.vendor_billing_accounts add constraint vendor_billing_entitlement_owner
      foreign key(entitlement_id,owner_id) references public.user_entitlements(id,user_id) on delete restrict;
  end if;
end $$;

create or replace function public.grookai_effective_entitlement_v1(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with selected as (
    select e.* from public.user_entitlements e join auth.users u on u.id=p_user_id
      where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
      order by (e.user_id=u.id) desc nulls last,e.id limit 1
  ), effective as (
    select e.*,coalesce(e.user_id=p_user_id and e.billing_plan is not null
      and e.billing_paid_from<=statement_timestamp() and e.billing_paid_through>statement_timestamp(),false) as paid
      from selected e
  )
  select jsonb_build_object('user_id',e.user_id,'email',e.email,'is_active',e.is_active,
    'tier',case when paid and e.tier in ('free','premium') then 'vendor' else e.tier end,
    'role',case when paid and e.role in ('collector','subscriber') then 'vendor' else e.role end,
    'source',e.source,'notes',e.notes,
    'features',e.features||jsonb_build_object(
      'store_app',coalesce(e.features->'store_app'='true'::jsonb,false) or paid,
      'store_web',(coalesce(e.features->'store_app'='true'::jsonb,false) and coalesce(e.features->'store_web'='true'::jsonb,false)) or (paid and e.billing_plan='store_web'),
      'vendor_tools',coalesce(e.features->'vendor_tools'='true'::jsonb,false) or paid)) from effective e;
$$;
revoke all on function public.grookai_effective_entitlement_v1(uuid) from public,anon,authenticated;
grant execute on function public.grookai_effective_entitlement_v1(uuid) to service_role;



-- Call only after checkout identity and current provider state have been verified
-- under this lease. Event metadata/client success pages never call this function.
create or replace function public.vendor_billing_commit_projection_v1(
  p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_customer_id text,p_subscription_id text,
  p_status text,p_plan text,p_paid_from timestamptz,p_paid_through timestamptz,p_reason text,
  p_cancel_at_period_end boolean,p_attempt_id uuid default null,p_event_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; e public.user_entitlements;
  c public.vendor_billing_checkout_attempts; ev public.vendor_billing_events;
  t timestamptz:=clock_timestamp(); new_paid boolean; continuous boolean; manual_app boolean; manual_web boolean;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
  if a.customer_id is null or a.customer_id is distinct from p_customer_id then
    raise exception 'billing_customer_mismatch' using errcode='P0001';
  end if;
  if p_event_id is not null then
    select * into strict ev from public.vendor_billing_events where stripe_account_id=a.stripe_account_id
      and livemode=a.livemode and event_id=p_event_id for update;
    if ev.customer_id is distinct from a.customer_id or ev.subscription_id is distinct from p_subscription_id then
      raise exception 'billing_event_identity_conflict' using errcode='P0001';
    end if;
    if ev.state<>'pending' then
      perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
      return jsonb_build_object('state',ev.state,'duplicate',true);
    end if;
  end if;
  if p_attempt_id is null and a.current_subscription_id is distinct from p_subscription_id then
    -- Delayed events for an old (or unrelated) subscription cannot replace/revoke
    -- the owner's currently enrolled subscription. Pending checkout is reconciled
    -- separately using its stored session, even if this early event is ignored.
    if p_event_id is null then raise exception 'billing_subscription_not_enrolled' using errcode='P0001'; end if;
    update public.vendor_billing_events set state='ignored',processed_at=t,attempts=attempts+1,last_error_code=null
      where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id;
    perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
    return jsonb_build_object('state','ignored','duplicate',false);
  end if;
  if p_attempt_id is not null then
    select * into strict c from public.vendor_billing_checkout_attempts where id=p_attempt_id and owner_id=p_owner_id for update;
    if c.customer_id is distinct from a.customer_id or c.subscription_id is distinct from p_subscription_id
      or c.session_id is null or c.state not in ('completed','enrolled')
      or (c.state='enrolled' and a.current_subscription_id is distinct from p_subscription_id)
      or (a.current_subscription_id is not null and a.current_subscription_id is distinct from p_subscription_id) then
      raise exception 'billing_enrollment_mismatch' using errcode='P0001';
    end if;
  end if;
  if p_subscription_id is null or p_subscription_id!~'^sub_[A-Za-z0-9]{1,240}$'
    or p_status is null or p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
    or (p_plan is not null and p_plan not in ('store_app','store_web')) or p_cancel_at_period_end is null
    or p_reason is null or p_reason not in ('paid','inactive','unsupported_price','unverified_invoice','expired') then
    raise exception 'billing_projection_invalid' using errcode='22023';
  end if;
  new_paid:=p_reason='paid';
  if new_paid and (p_status<>'active' or p_plan is null or p_paid_from is null or p_paid_through is null
    or not isfinite(p_paid_from) or not isfinite(p_paid_through) or p_paid_from>t
    or p_paid_through<=t or p_paid_through<=p_paid_from) then
    raise exception 'billing_paid_window_invalid' using errcode='22023';
  end if;
  if a.entitlement_id is null then
    select * into e from public.user_entitlements where user_id=p_owner_id and is_active for update;
    if not found then
      -- Do not silently shadow email-only grants or undo a founder's deactivation.
      if exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
        where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then
        raise exception 'billing_entitlement_binding_required' using errcode='P0001';
      end if;
      insert into public.user_entitlements(user_id,tier,role,features,source)
        values(p_owner_id,'free','collector','{}','stripe_billing_baseline') returning * into e;
    end if;
  else
    select * into strict e from public.user_entitlements where id=a.entitlement_id and user_id=p_owner_id for update;
    if not e.is_active then raise exception 'billing_entitlement_inactive' using errcode='P0001'; end if;
  end if;
  -- Match existing entitlement-trigger lock order: entitlement row, then store
  -- advisory lock. Publish uses this same advisory lock before its store write.
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||p_owner_id::text,0));
  manual_app:=coalesce(e.features->'store_app'='true'::jsonb,false);
  manual_web:=manual_app and coalesce(e.features->'store_web'='true'::jsonb,false);
  continuous:=new_paid and e.billing_plan is not null and e.billing_paid_through>=p_paid_from;
  -- A missed expiry event followed by late payment must not republish. Preserve
  -- only destinations supported by a manual grant or continuous paid coverage.
  update public.vendor_stores set
    app_published=app_published and (manual_app or continuous),
    web_published=web_published and (manual_web or (continuous and e.billing_plan='store_web' and p_plan='store_web')),
    updated_at=t where owner_id=p_owner_id and (app_published or web_published);
  if not manual_app and not continuous then
    update public.vendor_store_custom_products p set published=false,suspension_reason='Store access suspended',version=version+1,updated_at=t
      from public.vendor_stores s where p.store_id=s.id and s.owner_id=p_owner_id and p.published;
  end if;
  perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if new_paid and p_paid_through<=clock_timestamp() then
    raise exception 'billing_paid_window_invalid' using errcode='22023';
  end if;
  update public.user_entitlements set billing_plan=case when new_paid then p_plan else null end,
    billing_paid_from=case when new_paid then p_paid_from else null end,
    billing_paid_through=case when new_paid then p_paid_through else null end where id=e.id;
  -- Existing entitlement triggers suspend any destination lost by this update.
  if p_attempt_id is not null then
    update public.vendor_billing_checkout_attempts set state='enrolled',updated_at=t where id=p_attempt_id;
  end if;
  update public.vendor_billing_accounts set entitlement_id=e.id,subscription_status=p_status,
    current_subscription_id=case when p_status in ('canceled','incomplete_expired') then null else p_subscription_id end,
    cancel_at_period_end=p_cancel_at_period_end,last_reconciled_at=t,updated_at=t,
    reconcile_after=t+interval '15 minutes',reconcile_failures=0,reconcile_error=null,
    lease_token=null,lease_expires_at=null where owner_id=p_owner_id;
  if p_event_id is not null then
    update public.vendor_billing_events set state='processed',processed_at=t,attempts=attempts+1,last_error_code=null
      where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id;
  end if;
  return jsonb_build_object('state','processed','duplicate',false,'capabilities',public.vendor_store_capabilities_v1(p_owner_id));
end;
$$;
revoke all on function public.vendor_billing_commit_projection_v1(uuid,uuid,bigint,text,text,text,text,timestamptz,timestamptz,text,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_commit_projection_v1(uuid,uuid,bigint,text,text,text,text,timestamptz,timestamptz,text,boolean,uuid,text) to service_role;

-- Keep the existing exact-copy referral checks; active paid vendor tools are
-- resolved through the same time-bound entitlement authority as public offers.


-- Eligibility must be resolved before any provider creation, not after payment.
create or replace function public.vendor_billing_prepare_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_plan text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.user_entitlements;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
 if p_plan is null or p_plan not in ('store_app','store_web') then raise exception 'billing_plan_invalid' using errcode='22023'; end if;
 if not exists(select 1 from public.vendor_store_rollout where app_enabled and (p_plan='store_app' or web_enabled)) then
  raise exception 'billing_store_unavailable' using errcode='P0001';
 end if;
 if a.current_subscription_id is not null then raise exception 'billing_existing_subscription' using errcode='P0001'; end if;
 if a.entitlement_id is null then
  select * into e from public.user_entitlements where user_id=p_owner_id and is_active for update;
  if not found then
   if exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
      where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then
    raise exception 'billing_entitlement_binding_required' using errcode='P0001';
   end if;
   insert into public.user_entitlements(user_id,tier,role,features,source)
    values(p_owner_id,'free','collector','{}','stripe_billing_baseline') returning * into e;
  end if;
 else
  select * into strict e from public.user_entitlements where id=a.entitlement_id and user_id=p_owner_id for update;
  if not e.is_active then raise exception 'billing_entitlement_inactive' using errcode='P0001'; end if;
 end if;
 perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 update public.vendor_billing_accounts set entitlement_id=e.id,updated_at=clock_timestamp() where owner_id=p_owner_id returning * into a;
 return to_jsonb(a);
end $$;

-- This cannot change paid access. It closes only a verified event which does not
-- describe the current or a completed pending checkout's subscription.
create or replace function public.vendor_billing_ignore_event_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_event_id text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.vendor_billing_events;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 select * into strict e from public.vendor_billing_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id for update;
 if e.customer_id is distinct from a.customer_id or e.subscription_id=a.current_subscription_id
   or exists(select 1 from public.vendor_billing_checkout_attempts c where c.owner_id=p_owner_id and c.state='completed' and c.subscription_id=e.subscription_id) then
  raise exception 'billing_event_not_unrelated' using errcode='P0001';
 end if;
 update public.vendor_billing_events set state='ignored',processed_at=clock_timestamp(),attempts=attempts+1,last_error_code=null
  where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id and state='pending';
 perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
end $$;

-- Failure metadata is a bounded code, never a provider payload, URL or secret.
-- A lost/expired lease cannot write failure state over a successor's success.
create or replace function public.vendor_billing_fail_event_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_event_id text,p_code text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.vendor_billing_events;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_code is null or p_code not in ('provider_unavailable','checkout_pending','binding_required','reconciliation_failed') then
  raise exception 'billing_failure_code_invalid' using errcode='22023';
 end if;
 select * into strict e from public.vendor_billing_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id for update;
 if e.customer_id is distinct from a.customer_id then raise exception 'billing_event_identity_conflict' using errcode='P0001'; end if;
 update public.vendor_billing_events set attempts=attempts+1,last_error_code=p_code,
  retry_after=clock_timestamp()+make_interval(secs=>least(21600,60*power(2,least(attempts,9)))::double precision)
  where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id and state='pending';
 perform public.vendor_billing_defer_reconcile_v1(p_owner_id,p_claim_token,p_fence,case when p_code='provider_unavailable' then 'reconciliation_failed' else p_code end);
end $$;
revoke all on function public.vendor_billing_prepare_checkout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_ignore_event_v1(uuid,uuid,bigint,text),public.vendor_billing_fail_event_v1(uuid,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_prepare_checkout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_ignore_event_v1(uuid,uuid,bigint,text),public.vendor_billing_fail_event_v1(uuid,uuid,bigint,text,text) to service_role;

create or replace function public.vendor_billing_owner_status_v1(p_owner_id uuid,p_stripe_account_id text,p_livemode boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.user_entitlements;c public.vendor_billing_checkout_attempts;issue text;
begin
 select * into a from public.vendor_billing_accounts where owner_id=p_owner_id;
 if a.owner_id is not null and (a.stripe_account_id is distinct from p_stripe_account_id or a.livemode is distinct from p_livemode) then
  raise exception 'billing_scope_mismatch' using errcode='P0001';
 end if;
 select * into e from public.user_entitlements where user_id=p_owner_id and (id=a.entitlement_id or (a.entitlement_id is null and is_active)) order by id limit 1;
 if e.id is not null and not e.is_active then issue:='suspended';
 elsif e.id is null and exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
    where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then issue:='binding_required'; end if;
 select * into c from public.vendor_billing_checkout_attempts where owner_id=p_owner_id and state in ('creating','open','completed','recovery');
 return jsonb_build_object('subscriptionStatus',coalesce(a.subscription_status,'none'),'plan',e.billing_plan,
  'paidThrough',e.billing_paid_through,'cancelAtPeriodEnd',coalesce(a.cancel_at_period_end,false),
  'canManagePayment',a.customer_id is not null and a.closeout_id is null,'hasSubscription',a.current_subscription_id is not null,
  'closeoutPending',a.closeout_id is not null or exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_owner_id)),
  'checkoutState',c.state,'pendingPlan',c.requested_plan,'eligibilityIssue',issue,
  'recoveryRequired',coalesce((a.customer_id is null and a.customer_attempt_created_at<now()-interval '23 hours')
    or (c.session_id is null and c.created_at<now()-interval '23 hours') or c.state='recovery',false),
  'appAvailable',coalesce((select app_enabled from public.vendor_store_rollout),false),
  'webAvailable',coalesce((select app_enabled and web_enabled from public.vendor_store_rollout),false),
  'access',public.vendor_store_capabilities_v1(p_owner_id));
end $$;
revoke all on function public.vendor_billing_owner_status_v1(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.vendor_billing_owner_status_v1(uuid,text,boolean) to service_role;

-- Scheduled reads share the same fenced projection as signed callbacks. A failed
-- provider read never grants access and cannot hot-loop an account indefinitely.
create or replace function public.vendor_billing_defer_reconcile_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_code text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_code is null or p_code not in ('checkout_pending','binding_required','reconciliation_failed') then raise exception 'billing_failure_code_invalid' using errcode='22023';end if;
 update public.vendor_billing_accounts set
  reconcile_after=clock_timestamp()+case when p_code='checkout_pending' then interval '5 minutes' else make_interval(secs=>least(21600,60*power(2,least(reconcile_failures,9)))::double precision) end,
  reconcile_failures=case when p_code='checkout_pending' then 0 else reconcile_failures+1 end,
  reconcile_error=p_code where owner_id=p_owner_id;
 perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
end $$;

create table if not exists public.vendor_billing_reconcile_runs (
 id uuid primary key,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),livemode boolean not null,
 started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,
 state text not null default 'running' check(state in ('running','completed','failed')),
 processed integer not null default 0 check(processed between 0 and 50),
 deferred integer not null default 0 check(deferred between 0 and 50),
 busy integer not null default 0 check(busy between 0 and 50),
 failures integer not null default 0 check(failures between 0 and 50),
 error_code text check(error_code in ('item_failure','worker_failed','worker_abandoned')),
 constraint vendor_billing_run_finished check((state='running')=(finished_at is null))
);
create index if not exists vendor_billing_run_scope on public.vendor_billing_reconcile_runs(stripe_account_id,livemode,started_at desc);
alter table public.vendor_billing_reconcile_runs enable row level security;
revoke all on public.vendor_billing_reconcile_runs from public,anon,authenticated;
grant all on public.vendor_billing_reconcile_runs to service_role;

create or replace function public.vendor_billing_start_run_v1(p_id uuid,p_stripe_account_id text,p_livemode boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- A dead process leaves durable evidence; the next run closes only stale runs.
 update public.vendor_billing_reconcile_runs set state='failed',finished_at=clock_timestamp(),error_code='worker_abandoned'
  where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='running' and started_at<clock_timestamp()-interval '15 minutes';
 insert into public.vendor_billing_reconcile_runs(id,stripe_account_id,livemode) values(p_id,p_stripe_account_id,p_livemode);
end $$;
create or replace function public.vendor_billing_finish_run_v1(p_id uuid,p_processed integer,p_deferred integer,p_busy integer,p_failures integer,p_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_processed is null or p_deferred is null or p_busy is null or p_failures is null or p_processed+p_deferred+p_busy+p_failures>50
  or (p_error_code is not null and p_error_code not in ('item_failure','worker_failed')) then raise exception 'billing_run_result_invalid' using errcode='22023';end if;
 update public.vendor_billing_reconcile_runs set state=case when p_failures>0 or p_error_code is not null then 'failed' else 'completed' end,
  finished_at=clock_timestamp(),processed=p_processed,deferred=p_deferred,busy=p_busy,failures=p_failures,error_code=p_error_code
  where id=p_id and state='running' and started_at>clock_timestamp()-interval '15 minutes';
 if not found then raise exception 'billing_run_not_active' using errcode='P0001';end if;
end $$;

create or replace function public.vendor_billing_due_v1(p_stripe_account_id text,p_livemode boolean,p_lane text,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_lane is null or p_lane not in ('events','accounts') or p_limit is null or p_limit<1 or p_limit>25 then raise exception 'billing_queue_bounds' using errcode='22023';end if;
 if p_lane='events' then
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
   select a.owner_id,e.event_id,e.event_type,e.customer_id,e.subscription_id,e.provider_created_at
    from public.vendor_billing_events e join public.vendor_billing_accounts a on a.stripe_account_id=e.stripe_account_id and a.livemode=e.livemode and a.customer_id=e.customer_id
    where e.stripe_account_id=p_stripe_account_id and e.livemode=p_livemode and e.state='pending' and e.retry_after<=now() and a.closeout_id is null
      and (a.lease_expires_at is null or a.lease_expires_at<=now())
    order by e.retry_after,e.received_at,e.event_id limit p_limit
  ) q;
 else
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
   select a.owner_id from public.vendor_billing_accounts a
    where a.stripe_account_id=p_stripe_account_id and a.livemode=p_livemode and a.customer_id is not null and a.reconcile_after<=now() and a.closeout_id is null
      and (a.lease_expires_at is null or a.lease_expires_at<=now())
      and (a.current_subscription_id is not null or exists(select 1 from public.vendor_billing_checkout_attempts c
        where c.owner_id=a.owner_id and c.session_id is not null and c.state in ('open','completed')))
    order by a.reconcile_after,a.owner_id limit p_limit
  ) q;
 end if;
 return result;
end $$;

create or replace function public.vendor_billing_reconcile_health_v1(p_stripe_account_id text,p_livemode boolean)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'pendingEvents',(select count(*) from public.vendor_billing_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='pending'),
  'oldestPendingAt',(select min(received_at) from public.vendor_billing_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='pending'),
  'failedAccounts',(select count(*) from public.vendor_billing_accounts where stripe_account_id=p_stripe_account_id and livemode=p_livemode and reconcile_failures>0),
  'closingAccounts',(select count(*) from public.vendor_billing_accounts where stripe_account_id=p_stripe_account_id and livemode=p_livemode and closeout_id is not null),
  'recoveryAccounts',(select count(*) from public.vendor_billing_accounts a where stripe_account_id=p_stripe_account_id and livemode=p_livemode and (
   (customer_id is null and customer_attempt_created_at<now()-interval '23 hours') or exists(select 1 from public.vendor_billing_checkout_attempts c where c.owner_id=a.owner_id and (c.state='recovery' or (c.state='creating' and c.session_id is null and c.created_at<now()-interval '23 hours'))))),
  'staleRuns',(select count(*) from public.vendor_billing_reconcile_runs where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='running' and started_at<now()-interval '15 minutes'),
  'lastRun',(select jsonb_build_object('id',id,'state',state,'startedAt',started_at,'finishedAt',finished_at,'errorCode',error_code) from public.vendor_billing_reconcile_runs where stripe_account_id=p_stripe_account_id and livemode=p_livemode order by started_at desc limit 1)
 );
$$;
revoke all on function public.vendor_billing_defer_reconcile_v1(uuid,uuid,bigint,text),public.vendor_billing_start_run_v1(uuid,text,boolean),
 public.vendor_billing_finish_run_v1(uuid,integer,integer,integer,integer,text),public.vendor_billing_due_v1(text,boolean,text,integer),public.vendor_billing_reconcile_health_v1(text,boolean) from public,anon,authenticated;
grant execute on function public.vendor_billing_defer_reconcile_v1(uuid,uuid,bigint,text),public.vendor_billing_start_run_v1(uuid,text,boolean),
 public.vendor_billing_finish_run_v1(uuid,integer,integer,integer,integer,text),public.vendor_billing_due_v1(text,boolean,text,integer),public.vendor_billing_reconcile_health_v1(text,boolean) to service_role;

create or replace function public.vendor_billing_customer_creation_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
 update public.vendor_billing_accounts set customer_creation_started_at=coalesce(customer_creation_started_at,clock_timestamp()) where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_request_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_ticket_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_ticket_hash is null or p_ticket_hash !~ '^[0-9a-f]{64}$' then raise exception 'billing_closeout_ticket_required' using errcode='22023';end if;
 if a.closeout_id is not null and a.closeout_ticket_hash<>p_ticket_hash then raise exception 'billing_closeout_ticket_conflict' using errcode='P0001';end if;
 update public.vendor_billing_accounts set closeout_id=coalesce(closeout_id,gen_random_uuid()),closeout_ticket_hash=p_ticket_hash,
  closeout_requested_at=coalesce(closeout_requested_at,clock_timestamp()),
  closeout_paid_through=case when closeout_id is null then (select billing_paid_through from public.user_entitlements where id=a.entitlement_id) else closeout_paid_through end
  where owner_id=p_owner_id returning * into a;
 update public.user_entitlements set billing_plan=null,billing_paid_from=null,billing_paid_through=null where id=a.entitlement_id and user_id=p_owner_id;
 update public.vendor_stores set app_published=false,web_published=false where owner_id=p_owner_id;
 perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 return to_jsonb(a);
end $$;
create or replace function public.vendor_billing_assert_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_closeout_id is null or a.closeout_id is distinct from p_closeout_id then raise exception 'billing_closeout_mismatch' using errcode='P0001';end if;
end $$;
create or replace function public.vendor_billing_record_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_reviews jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 if p_reviews is null or jsonb_typeof(p_reviews)<>'array' or jsonb_array_length(p_reviews)>7 or exists(select 1 from jsonb_array_elements_text(p_reviews) r where r not in
  ('open_invoices','draft_invoices','pending_invoice_items','customer_balance','balance_evidence_missing','remaining_paid_period','financial_hold')) then raise exception 'billing_closeout_reviews_invalid' using errcode='22023';end if;
 if exists(select 1 from public.vendor_billing_checkout_attempts where owner_id=p_owner_id and state in ('open','creating','recovery')) then raise exception 'billing_closeout_pending_checkout' using errcode='P0001';end if;
 update public.vendor_billing_accounts set closeout_verified_at=clock_timestamp(),closeout_reviews=p_reviews,closeout_error=case when p_reviews='[]'::jsonb then null else 'financial_review' end,
 subscription_status=case when current_subscription_id is null then subscription_status else 'canceled' end where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_fail_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 if p_code is null or p_code not in ('provider_unavailable','recovery_required') then raise exception 'billing_closeout_error_invalid' using errcode='22023';end if;
 update public.vendor_billing_accounts set closeout_error=p_code,closeout_verified_at=null where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_archive_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_ticket_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;snapshot jsonb;
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id;
 perform 1 from auth.users where id=p_owner_id for update;
 if a.closeout_ticket_hash is distinct from p_ticket_hash or a.closeout_verified_at is null or a.closeout_verified_at<clock_timestamp()-interval '5 minutes' or a.closeout_reviews<>'[]'::jsonb
  or (a.customer_id is null and a.customer_creation_started_at is not null) then raise exception 'billing_closeout_not_ready' using errcode='P0001';end if;
 if exists(select 1 from public.vendor_account_financial_holds where owner_id=p_owner_id) then raise exception 'billing_financial_hold' using errcode='P0001';end if;
 select jsonb_build_object('customerAttemptId',a.customer_attempt_id,'customerAttemptCreatedAt',a.customer_attempt_created_at,
  'subscriptionId',a.current_subscription_id,'subscriptionStatus',a.subscription_status,'closeoutRequestedAt',a.closeout_requested_at,'providerVerifiedAt',a.closeout_verified_at,
  'checkouts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'plan',requested_plan,'sessionId',session_id,'subscriptionId',subscription_id,'state',state,'createdAt',created_at)) from public.vendor_billing_checkout_attempts where owner_id=p_owner_id),'[]')) into snapshot;
 if octet_length(snapshot::text)>262144 then raise exception 'billing_closeout_archive_bounds' using errcode='P0001';end if;
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 insert into public.vendor_billing_closed_accounts(id,owner_fingerprint,stripe_account_id,livemode,customer_id,request_ticket_hash,financial_snapshot)
  values(p_closeout_id,public.vendor_billing_owner_fingerprint_v1(p_owner_id),a.stripe_account_id,a.livemode,a.customer_id,p_ticket_hash,snapshot);
 update public.vendor_billing_events set state='ignored',processed_at=clock_timestamp() where stripe_account_id=a.stripe_account_id and livemode=a.livemode and customer_id=a.customer_id and state='pending';
 delete from public.vendor_billing_accounts where owner_id=p_owner_id;
 return p_closeout_id;
end $$;
revoke all on function public.vendor_billing_customer_creation_v1(uuid,uuid,bigint),public.vendor_billing_request_closeout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_assert_closeout_v1(uuid,uuid,bigint,uuid),public.vendor_billing_record_closeout_v1(uuid,uuid,bigint,uuid,jsonb),public.vendor_billing_archive_closeout_v1(uuid,uuid,bigint,uuid,text),public.vendor_billing_fail_closeout_v1(uuid,uuid,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_customer_creation_v1(uuid,uuid,bigint),public.vendor_billing_request_closeout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_assert_closeout_v1(uuid,uuid,bigint,uuid),public.vendor_billing_record_closeout_v1(uuid,uuid,bigint,uuid,jsonb),public.vendor_billing_archive_closeout_v1(uuid,uuid,bigint,uuid,text),public.vendor_billing_fail_closeout_v1(uuid,uuid,bigint,uuid,text) to service_role;

-- Draft-only custom product batches. Existing product mutation remains authoritative.


create table if not exists public.vendor_store_custom_imports (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  id uuid not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  product_ids uuid[] not null check (
    cardinality(product_ids) between 1 and 100 and array_ndims(product_ids)=1
    and array_position(product_ids,null) is null
  ),
  created_at timestamptz not null default now(),
  primary key (store_id,id)
);
alter table public.vendor_store_custom_imports enable row level security;
revoke all on public.vendor_store_custom_imports from public,anon,authenticated;
grant select on public.vendor_store_custom_imports to authenticated;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid='public.vendor_store_custom_imports'::regclass and polname='custom_import_owner_read') then
    create policy custom_import_owner_read on public.vendor_store_custom_imports
      for select to authenticated using (exists (
        select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()
      ));
  end if;
end $$;

create or replace function public.vendor_store_custom_import_v1(p_import_id uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  s public.vendor_stores;
  batch public.vendor_store_custom_imports;
  request_hash text;
  item jsonb;
  result jsonb;
  product_ids uuid[] := '{}';
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_import_id is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Invalid import batch' using errcode='22023';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>1048576 then
    raise exception 'Import limit exceeded' using errcode='22023';
  end if;
  request_hash:=encode(sha256(convert_to(p_rows::text,'UTF8')),'hex');
  -- Same owner/store lock order as ordinary custom edits, including nested writes.
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  select * into batch from public.vendor_store_custom_imports where store_id=s.id and id=p_import_id;
  if batch.id is not null then
    if batch.request_sha256<>request_hash then
      raise exception 'Import batch payload changed' using errcode='PT409';
    end if;
    -- Retained receipts remain readable after downgrade, without creating products.
    return jsonb_build_object('id',batch.id,'product_ids',batch.product_ids,'created_at',batch.created_at);
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'title') is distinct from 'string'
      or coalesce(btrim(item->>'title'),'')='' or not (item ? 'available_quantity') then
      raise exception 'Import requires a title and quantity for each product' using errcode='22023';
    end if;
    -- Governs all field limits, ownership, active package and rollout. Creates only
    -- a new private draft; any failure rolls back every product/event in this batch.
    result:=public.vendor_store_custom_mutate_v1(null,null,'save',item);
    if result#>>'{products,0,id}' is null then
      raise exception 'Import product readback missing' using errcode='55000';
    end if;
    product_ids:=array_append(product_ids,(result#>>'{products,0,id}')::uuid);
  end loop;
  insert into public.vendor_store_custom_imports(store_id,id,request_sha256,product_ids)
    values(s.id,p_import_id,request_hash,product_ids) returning * into batch;
  return jsonb_build_object('id',batch.id,'product_ids',batch.product_ids,'created_at',batch.created_at);
end $$;
revoke all on function public.vendor_store_custom_import_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.vendor_store_custom_import_v1(uuid,jsonb) to authenticated;

-- Seller identity and coordination only. No account provisioning, checkout,
-- subscription grants, inventory mutation or payment authority is activated.


create or replace function public.vendor_seller_controller_valid_v1(p jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(case when jsonb_typeof(p)='object' then
   p-array['feesPayer','paymentLosses','requirementCollection','dashboard']='{}'::jsonb
   and p->>'feesPayer' in ('account','application')
   and p->>'paymentLosses' in ('stripe','application')
   and p->>'requirementCollection' in ('stripe','application')
   and p->>'dashboard' in ('full','express','none') else false end,false);
$$;

create table if not exists public.vendor_seller_rollout (
 singleton boolean primary key default true check(singleton),
 onboarding_enabled boolean not null default false
);
insert into public.vendor_seller_rollout(singleton) values(true) on conflict do nothing;
-- This is the only addition on an existing relation. It supports immutable
-- owner/store correlation; it never changes either store or Vault ownership.
create unique index if not exists vendor_seller_store_owner_key on public.vendor_stores(id,owner_id);
create table if not exists public.vendor_seller_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete restrict,
 store_id uuid not null unique,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 livemode boolean not null,
 controller jsonb not null check(public.vendor_seller_controller_valid_v1(controller)),
 connected_account_id text check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and connected_account_id<>stripe_account_id),
 creation_attempt_id uuid not null unique default gen_random_uuid(),
 creation_started_at timestamptz,
 state text not null default 'reserved' check(state in ('reserved','creating','bound','deauthorized','closing')),
 lease_fence bigint not null default 0 check(lease_fence>=0),
 lease_token uuid,
 lease_expires_at timestamptz,
 closeout_id uuid,
 closeout_requested_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint vendor_seller_owner_store foreign key(store_id,owner_id) references public.vendor_stores(id,owner_id) on delete restrict on update restrict,
 constraint vendor_seller_connected_scope unique(stripe_account_id,livemode,connected_account_id),
 constraint vendor_seller_lease_pair check((lease_token is null)=(lease_expires_at is null)),
 constraint vendor_seller_closeout_pair check((closeout_id is null)=(closeout_requested_at is null) and (state='closing')=(closeout_id is not null)),
 constraint vendor_seller_creation_state check(
   (state<>'reserved' or (creation_started_at is null and connected_account_id is null))
   and (state<>'creating' or (creation_started_at is not null and connected_account_id is null))
   and (state not in ('bound','deauthorized') or (creation_started_at is not null and connected_account_id is not null))
   and (connected_account_id is null or creation_started_at is not null))
);
create table if not exists public.vendor_seller_events (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 livemode boolean not null,
 event_id text not null check(event_id ~ '^evt_[A-Za-z0-9]+$'),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and connected_account_id<>stripe_account_id),
 kind text not null check(kind in ('refresh','deauthorized')),
 provider_created_at timestamptz not null,
 received_at timestamptz not null default now(),
 primary key(stripe_account_id,livemode,event_id)
);
create index if not exists vendor_seller_events_account on public.vendor_seller_events(stripe_account_id,livemode,connected_account_id,received_at);

alter table public.vendor_seller_accounts enable row level security;
alter table public.vendor_seller_events enable row level security;
alter table public.vendor_seller_rollout enable row level security;
revoke all on public.vendor_seller_accounts,public.vendor_seller_events,public.vendor_seller_rollout from public,anon,authenticated,service_role;
grant select,insert,update on public.vendor_seller_accounts to service_role;
grant select,insert on public.vendor_seller_events to service_role;
grant select,update on public.vendor_seller_rollout to service_role;

create or replace function public.vendor_seller_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'seller_closeout_required' using errcode='P0001';end if;
 if row(new.id,new.owner_id,new.store_id,new.stripe_account_id,new.livemode,new.controller,new.creation_attempt_id,new.created_at)
   is distinct from row(old.id,old.owner_id,old.store_id,old.stripe_account_id,old.livemode,old.controller,old.creation_attempt_id,old.created_at)
   or (old.connected_account_id is not null and new.connected_account_id is distinct from old.connected_account_id)
   or (old.creation_started_at is not null and new.creation_started_at is distinct from old.creation_started_at)
   or (old.closeout_id is not null and row(new.closeout_id,new.closeout_requested_at) is distinct from row(old.closeout_id,old.closeout_requested_at))
   or (old.state='deauthorized' and new.state not in ('deauthorized','closing'))
 then raise exception 'seller_identity_immutable' using errcode='P0001';end if;
 return new;
end;
$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_seller_accounts'::regclass and tgname='vendor_seller_immutable') then
   create trigger vendor_seller_immutable before update or delete on public.vendor_seller_accounts for each row execute function public.vendor_seller_immutable_v1();
 end if;
end$$;

create or replace function public.vendor_seller_require_onboarding_v1(p_owner_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_owner_id is null or not exists(select 1 from public.vendor_seller_rollout where onboarding_enabled)
   or not exists(select 1 from public.vendor_store_rollout where app_enabled)
   or not coalesce((public.vendor_store_capabilities_v1(p_owner_id)->>'store_app')::boolean,false)
   or exists(select 1 from public.vendor_account_financial_holds where owner_id=p_owner_id)
 then raise exception 'seller_onboarding_unavailable' using errcode='42501';end if;
end;
$$;

create or replace function public.vendor_seller_reserve_v1(p_owner_id uuid,p_store_id uuid,p_stripe_account_id text,p_livemode boolean,p_controller jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 if p_owner_id is null or p_store_id is null or p_stripe_account_id is null or p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$'
   or p_livemode is null or not public.vendor_seller_controller_valid_v1(p_controller)
 then raise exception 'seller_binding_invalid' using errcode='22023';end if;
 -- Protect deletion before taking the existing store advisory lock. The caller
 -- derives owner/store from verified Auth and owner storage, never request IDs.
 perform 1 from auth.users where id=p_owner_id for key share;
 if not found then raise exception 'seller_owner_missing' using errcode='P0001';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||p_owner_id::text,0));
 perform 1 from public.vendor_stores where id=p_store_id and owner_id=p_owner_id for key share;
 if not found then raise exception 'seller_store_mismatch' using errcode='42501';end if;
 select * into a from public.vendor_seller_accounts where owner_id=p_owner_id for update;
 if found then
   if row(a.store_id,a.stripe_account_id,a.livemode,a.controller) is distinct from row(p_store_id,p_stripe_account_id,p_livemode,p_controller)
   then raise exception 'seller_scope_mismatch' using errcode='P0001';end if;
   return to_jsonb(a);
 end if;
 perform public.vendor_seller_require_onboarding_v1(p_owner_id);
 insert into public.vendor_seller_accounts(owner_id,store_id,stripe_account_id,livemode,controller)
   values(p_owner_id,p_store_id,p_stripe_account_id,p_livemode,p_controller) returning * into a;
 return to_jsonb(a);
end;
$$;

create or replace function public.vendor_seller_claim_v1(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;t timestamptz;
begin
 if p_token is null then raise exception 'seller_claim_required' using errcode='22023';end if;
 select * into strict a from public.vendor_seller_accounts where id=p_id for update;t:=clock_timestamp();
 if a.lease_expires_at>t then
   if a.lease_token=p_token then return to_jsonb(a);end if;
   return null;
 end if;
 update public.vendor_seller_accounts set lease_token=p_token,lease_fence=lease_fence+1,
   lease_expires_at=t+interval '120 seconds',updated_at=t where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_locked_v1(p_id uuid,p_token uuid,p_fence bigint) returns public.vendor_seller_accounts
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 select * into strict a from public.vendor_seller_accounts where id=p_id for update;
 if p_token is null or a.lease_token is distinct from p_token or a.lease_fence is distinct from p_fence
   or a.lease_expires_at is null or a.lease_expires_at<=clock_timestamp()
 then raise exception 'seller_lease_lost' using errcode='P0001';end if;
 return a;
end;
$$;
create or replace function public.vendor_seller_prepare_creation_v1(p_id uuid,p_token uuid,p_fence bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;t timestamptz;
begin
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if a.state not in ('reserved','creating') then raise exception 'seller_creation_blocked' using errcode='P0001';end if;
 perform public.vendor_seller_require_onboarding_v1(a.owner_id);
 -- Recheck after any waits inside authorization. Time is database authority.
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);t:=clock_timestamp();
 if a.creation_started_at is not null and t-a.creation_started_at>=interval '23 hours'
 then raise exception 'seller_creation_recovery_required' using errcode='P0001';end if;
 update public.vendor_seller_accounts set state='creating',creation_started_at=coalesce(creation_started_at,t),updated_at=t
   where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_bind_v1(p_id uuid,p_token uuid,p_fence bigint,p_connected_account_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;v_deauthorized boolean;
begin
 -- Acquire provider identity before the account row. An event may arrive while
 -- the first binding is still uncommitted (or before a binding exists at all).
 -- Both paths must serialize on a key that does not depend on finding that row.
 select * into strict a from public.vendor_seller_accounts where id=p_id;
 if p_connected_account_id is null or p_connected_account_id !~ '^acct_[A-Za-z0-9]+$' or p_connected_account_id=a.stripe_account_id
 then raise exception 'seller_account_invalid' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||a.stripe_account_id||':'||a.livemode::text||':'||p_connected_account_id,0));
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if p_connected_account_id is null or p_connected_account_id !~ '^acct_[A-Za-z0-9]+$' or p_connected_account_id=a.stripe_account_id
   or a.creation_started_at is null then raise exception 'seller_account_invalid' using errcode='22023';end if;
 if a.connected_account_id is not null and a.connected_account_id<>p_connected_account_id
 then raise exception 'seller_account_already_bound' using errcode='P0001';end if;
 -- Called only after independently verifying a returned/recovered account against
 -- the durable attempt and expected controller. An old attempt may be recovered
 -- by readback, but prepare_creation can never recreate it beyond key retention.
 select exists(select 1 from public.vendor_seller_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode
   and connected_account_id=p_connected_account_id and kind='deauthorized') into v_deauthorized;
 update public.vendor_seller_accounts set connected_account_id=p_connected_account_id,
   state=case when closeout_id is not null then 'closing' when state='deauthorized' or v_deauthorized then 'deauthorized' else 'bound' end,
   updated_at=clock_timestamp() where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_release_v1(p_id uuid,p_token uuid,p_fence bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 update public.vendor_seller_accounts set lease_token=null,lease_expires_at=null,updated_at=clock_timestamp() where id=p_id;
end;
$$;
create or replace function public.vendor_seller_freeze_v1(p_id uuid,p_token uuid,p_fence bigint,p_closeout_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if p_closeout_id is null or (a.closeout_id is not null and a.closeout_id<>p_closeout_id)
 then raise exception 'seller_closeout_invalid' using errcode='22023';end if;
 update public.vendor_seller_accounts set state='closing',closeout_id=p_closeout_id,
   closeout_requested_at=coalesce(closeout_requested_at,clock_timestamp()),lease_fence=lease_fence+1,
   lease_token=null,lease_expires_at=null,updated_at=clock_timestamp() where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;

create or replace function public.vendor_seller_enqueue_v1(p_stripe_account_id text,p_livemode boolean,p_event_id text,
 p_connected_account_id text,p_kind text,p_provider_created_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.vendor_seller_events;v_inserted integer;
begin
 if p_provider_created_at is null or not isfinite(p_provider_created_at) or p_provider_created_at>clock_timestamp()+interval '5 minutes'
 then raise exception 'seller_event_invalid' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||p_stripe_account_id||':'||p_livemode::text||':'||p_connected_account_id,0));
 -- SDK signature/scope verification precedes this service-only append. Unknown
 -- accounts remain in the ledger: a deauthorization can arrive before binding.
 insert into public.vendor_seller_events(stripe_account_id,livemode,event_id,connected_account_id,kind,provider_created_at)
 values(p_stripe_account_id,p_livemode,p_event_id,p_connected_account_id,p_kind,p_provider_created_at)
 on conflict(stripe_account_id,livemode,event_id) do nothing;
 get diagnostics v_inserted=row_count;
 select * into strict e from public.vendor_seller_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and event_id=p_event_id;
 if row(e.connected_account_id,e.kind,e.provider_created_at) is distinct from row(p_connected_account_id,p_kind,p_provider_created_at)
 then raise exception 'seller_event_conflict' using errcode='P0001';end if;
 if v_inserted=1 and p_kind='deauthorized' then
   update public.vendor_seller_accounts set state=case when closeout_id is null then 'deauthorized' else 'closing' end,
     lease_fence=lease_fence+1,lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
     where stripe_account_id=p_stripe_account_id and livemode=p_livemode and connected_account_id=p_connected_account_id;
 end if;
 return jsonb_build_object('inserted',v_inserted=1);
end;
$$;

create or replace function public.vendor_seller_owner_status_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into a from public.vendor_seller_accounts where owner_id=auth.uid();
 return jsonb_build_object('schema_version','VENDOR_SELLER_BINDING_V1','binding',case when a.id is null then null else
   jsonb_build_object('storeId',a.store_id,'state',a.state,'hasConnectedAccount',a.connected_account_id is not null,
     'testMode',not a.livemode,'creationNeedsRecovery',coalesce(a.connected_account_id is null and a.creation_started_at<=now()-interval '23 hours',false)) end);
end;
$$;

revoke all on function public.vendor_seller_controller_valid_v1(jsonb),public.vendor_seller_immutable_v1(),
 public.vendor_seller_require_onboarding_v1(uuid),public.vendor_seller_reserve_v1(uuid,uuid,text,boolean,jsonb),
 public.vendor_seller_claim_v1(uuid,uuid),public.vendor_seller_locked_v1(uuid,uuid,bigint),
 public.vendor_seller_prepare_creation_v1(uuid,uuid,bigint),public.vendor_seller_bind_v1(uuid,uuid,bigint,text),
 public.vendor_seller_release_v1(uuid,uuid,bigint),public.vendor_seller_freeze_v1(uuid,uuid,bigint,uuid),
 public.vendor_seller_enqueue_v1(text,boolean,text,text,text,timestamptz),public.vendor_seller_owner_status_v1()
 from public,anon,authenticated;
grant execute on function public.vendor_seller_controller_valid_v1(jsonb),public.vendor_seller_require_onboarding_v1(uuid),
 public.vendor_seller_reserve_v1(uuid,uuid,text,boolean,jsonb),public.vendor_seller_claim_v1(uuid,uuid),
 public.vendor_seller_locked_v1(uuid,uuid,bigint),public.vendor_seller_prepare_creation_v1(uuid,uuid,bigint),
 public.vendor_seller_bind_v1(uuid,uuid,bigint,text),public.vendor_seller_release_v1(uuid,uuid,bigint),
 public.vendor_seller_freeze_v1(uuid,uuid,bigint,uuid),public.vendor_seller_enqueue_v1(text,boolean,text,text,text,timestamptz),
 public.vendor_seller_owner_status_v1() to service_role;
grant execute on function public.vendor_seller_owner_status_v1() to authenticated;

-- Private stock arbitration foundation. No checkout, payment confirmation,
-- ownership transfer, worker or public buying capability is enabled here.


create table if not exists public.vendor_stock_rollout (
 singleton boolean primary key default true check(singleton),
 reservations_enabled boolean not null default false
);
insert into public.vendor_stock_rollout(singleton) values(true) on conflict do nothing;

create table if not exists public.vendor_stock_reservations (
 id uuid primary key,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 seller_id uuid not null references public.vendor_seller_accounts(id) on delete restrict,
 instance_id uuid references public.vault_item_instances(id) on delete restrict,
 product_id uuid references public.vendor_store_custom_products(id) on delete restrict,
 quantity integer not null check(quantity between 1 and 100),
 offer jsonb not null check(jsonb_typeof(offer)='object'),
 state text not null default 'held' check(state in ('held','payment_pending','released')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 payment_started_at timestamptz,
 released_at timestamptz,
 release_reason text check(release_reason in ('canceled','expired')),
 check(buyer_id<>owner_id),
 check((instance_id is not null and product_id is null and quantity=1) or (instance_id is null and product_id is not null)),
 check(expires_at>created_at and expires_at<=created_at+interval '120 seconds'),
 check((state='payment_pending')=(payment_started_at is not null)),
 check((state='released')=(released_at is not null) and (released_at is null)=(release_reason is null))
);
create index if not exists vendor_stock_copy_active on public.vendor_stock_reservations(instance_id) where state<>'released';
create index if not exists vendor_stock_product_active on public.vendor_stock_reservations(product_id) where state<>'released';
create index if not exists vendor_stock_buyer_active on public.vendor_stock_reservations(buyer_id,store_id) where state<>'released';

alter table public.vendor_stock_rollout enable row level security;
alter table public.vendor_stock_reservations enable row level security;
revoke all on public.vendor_stock_rollout,public.vendor_stock_reservations from public,anon,authenticated,service_role;
grant select,update on public.vendor_stock_rollout to service_role;
grant select on public.vendor_stock_reservations to service_role;

-- Fresh command snapshots are necessary after waiting for stock row locks.
-- Repeatable-read callers must retry in READ COMMITTED; stale snapshots cannot
-- authorize stock mutation. No GUC supplied by a client bypasses these guards.
create or replace function public.vendor_stock_require_isolation_v1() returns void
language plpgsql set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'stock_requires_read_committed' using errcode='25000';
 end if;
end; $$;

create or replace function public.vendor_stock_live_quantity_v1(p_instance uuid,p_product uuid) returns bigint
language sql volatile security definer set search_path='' as $$
 select coalesce(sum(r.quantity),0) from public.vendor_stock_reservations r
 where ((p_instance is not null and r.instance_id=p_instance) or (p_product is not null and r.product_id=p_product))
 and (r.state='payment_pending' or (r.state='held' and r.expires_at>clock_timestamp()))
 and not exists(select 1 from public.vendor_orders o join public.vendor_order_observations e on e.order_id=o.id and e.revision=o.revision
  where o.reservation_id=r.id and e.applied_action='consume');
$$;

create or replace function public.vendor_stock_copy_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,
   new.legacy_vault_item_id,new.gv_vi_id,new.archived_at,new.condition_label,new.intent,new.pricing_mode,
   new.asking_price_amount,new.asking_price_currency) is not distinct from
   row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,
   old.legacy_vault_item_id,old.gv_vi_id,old.archived_at,old.condition_label,old.intent,old.pricing_mode,
   old.asking_price_amount,old.asking_price_currency) then return new;end if;
 perform public.vendor_stock_require_isolation_v1();
 if public.vendor_stock_live_quantity_v1(old.id,null)>0 then
  raise exception 'stock_reserved' using errcode='P0001';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end; $$;

create or replace function public.vendor_stock_product_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare held bigint;
begin
 perform public.vendor_stock_require_isolation_v1();
 held:=public.vendor_stock_live_quantity_v1(null,old.id);
 if held>0 then
  if tg_op='DELETE' then raise exception 'stock_reserved' using errcode='P0001';end if;
  -- Allow unpublishing and adjustments to genuinely unreserved stock. The offer
  -- identity, description, price, media and archive state stay fixed while held.
  if new.available_quantity<held or
   (to_jsonb(new)-array['available_quantity','published','suspension_reason','version','updated_at']) is distinct from
   (to_jsonb(old)-array['available_quantity','published','suspension_reason','version','updated_at'])
   then raise exception 'stock_reserved' using errcode='P0001';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end; $$;

create or replace function public.vendor_stock_store_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if row(new.id,new.owner_id,new.custom_currency) is distinct from row(old.id,old.owner_id,old.custom_currency) then
  perform public.vendor_stock_require_isolation_v1();
  if exists(select 1 from public.vendor_stock_reservations where store_id=old.id and
    (state='payment_pending' or (state='held' and expires_at>clock_timestamp()))) then
   raise exception 'stock_reserved' using errcode='P0001';
  end if;
 end if;return new;
end; $$;

create or replace function public.vendor_stock_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'stock_history_retained';end if;
 if (to_jsonb(new)-array['state','payment_started_at','released_at','release_reason']) is distinct from
    (to_jsonb(old)-array['state','payment_started_at','released_at','release_reason']) then raise exception 'stock_reservation_immutable';end if;
 if old.state='held' and new.state in ('payment_pending','released') then return new;end if;
 if old.state='payment_pending' and new.state in ('consumed','released') and new.payment_started_at=old.payment_started_at
  and exists(select 1 from public.vendor_orders o join public.vendor_order_observations e on e.order_id=o.id and e.revision=o.revision
   where o.reservation_id=old.id and e.applied_action=case new.state when 'consumed' then 'consume' else 'release' end)
  then return new;end if;
 -- The only additional transition requires the retained receipt and a pristine
 -- attempt. No GUC, browser status, missing session or expired lease is authority.
 if old.state='payment_pending' and new.state='released' and new.payment_started_at=old.payment_started_at
  and new.release_reason='order_canceled_unstarted'
  and exists(select 1 from public.vendor_orders o
   join public.vendor_order_cancellations c on c.order_id=o.id and c.reservation_id=old.id and c.buyer_id=o.buyer_id and c.revision=o.revision
   join public.vendor_order_attempts a on a.id=c.attempt_id and a.order_id=o.id
   where o.reservation_id=old.id and not o.paid and cardinality(o.review_reasons)=0
    and a.creation_started_at is null and a.lease_token is null and a.lease_expires_at is null and a.lease_fence=0
    and a.session_id is null and a.session_created_at is null and a.payment_intent_id is null)
  then return new;end if;
 raise exception 'stock_reservation_immutable';
end;$$;

do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='vendor_stock_copy_guard') then
  create trigger vendor_stock_copy_guard before update or delete on public.vault_item_instances for each row execute function public.vendor_stock_copy_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_store_custom_products'::regclass and tgname='vendor_stock_product_guard') then
  create trigger vendor_stock_product_guard before update or delete on public.vendor_store_custom_products for each row execute function public.vendor_stock_product_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_stores'::regclass and tgname='vendor_stock_store_guard') then
  create trigger vendor_stock_store_guard before update on public.vendor_stores for each row execute function public.vendor_stock_store_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_stock_reservations'::regclass and tgname='vendor_stock_immutable') then
  create trigger vendor_stock_immutable before update or delete on public.vendor_stock_reservations for each row execute function public.vendor_stock_immutable_v1();
 end if;
end$$;

-- Shared order: request advisory lock -> store -> seller -> physical stock ->
-- reservation. Legacy writers already lock physical stock; their trigger never
-- waits on a store/seller/reservation row, so it cannot invert that order.
create or replace function public.vendor_stock_reserve_v1(p_id uuid,p_buyer_id uuid,p_store_id uuid,
 p_instance_id uuid,p_product_id uuid,p_quantity integer) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; a public.vendor_seller_accounts; v public.vault_item_instances;
 p public.vendor_store_custom_products; r public.vendor_stock_reservations; t timestamptz; snapshot jsonb;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_id is null or p_buyer_id is null or p_store_id is null or p_quantity is null or p_quantity not between 1 and 100
  or not ((p_instance_id is not null and p_product_id is null and p_quantity=1) or (p_instance_id is null and p_product_id is not null))
  then raise exception 'stock_invalid_request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-stock:'||p_id::text,0));
 select * into r from public.vendor_stock_reservations where id=p_id;
 if found then
  if row(r.buyer_id,r.store_id,r.instance_id,r.product_id,r.quantity) is distinct from
   row(p_buyer_id,p_store_id,p_instance_id,p_product_id,p_quantity) then
    raise exception 'stock_request_conflict' using errcode='22023';end if;
  return r; -- Recovery does not extend expiry, recreate an attempt or grant payment authority.
 end if;
 if not exists(select 1 from public.vendor_stock_rollout where reservations_enabled) then
  raise exception 'stock_disabled' using errcode='42501';end if;
 select * into s from public.vendor_stores where id=p_store_id for update;
 select * into a from public.vendor_seller_accounts where store_id=p_store_id for update;
 if s.id is null or s.owner_id=p_buyer_id or not s.web_published or a.id is null or a.owner_id<>s.owner_id
  or a.state<>'bound' or a.closeout_id is not null
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled
    and nullif(slug,'') is not null and nullif(display_name,'') is not null)
  then raise exception 'stock_store_unavailable' using errcode='42501';end if;
 if (select count(*) from public.vendor_stock_reservations where buyer_id=p_buyer_id and store_id=s.id
   and (state='payment_pending' or (state='held' and expires_at>clock_timestamp())))>=10 then
  raise exception 'stock_buyer_limit' using errcode='P0001';end if;
 if p_instance_id is not null then
  select * into v from public.vault_item_instances where id=p_instance_id for update;
  if not found or public.vendor_store_copy_reason_v1(s.owner_id,p_instance_id) is not null
    or not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=p_instance_id) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
  if public.vendor_stock_live_quantity_v1(p_instance_id,null)>0 then raise exception 'stock_unavailable' using errcode='P0001';end if;
  snapshot:=jsonb_build_object('schema','VENDOR_STOCK_OFFER_V1','kind','copy','instance_id',v.id,'gvvi',v.gv_vi_id,
   'card_printing_id',v.card_printing_id,'card_print_id',coalesce(v.card_print_id,(select card_print_id from public.slab_certs where id=v.slab_cert_id)),
   'condition',v.condition_label,'slab_cert_id',v.slab_cert_id,'unit_amount',v.asking_price_amount,'currency',v.asking_price_currency);
 else
  select * into p from public.vendor_store_custom_products where id=p_product_id for update;
  if not found or p.store_id<>s.id or not p.published or public.vendor_store_custom_reason_v1(p_product_id) is not null
    or not exists(select 1 from public.vendor_store_rollout where custom_enabled) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
  if p.available_quantity-public.vendor_stock_live_quantity_v1(null,p.id)<p_quantity then
   raise exception 'stock_unavailable' using errcode='P0001';end if;
  snapshot:=jsonb_build_object('schema','VENDOR_STOCK_OFFER_V1','kind','custom','product_id',p.id,'version',p.version,
    'title',p.title,'unit_amount',p.asking_price_amount,'currency',s.custom_currency);
 end if;
 -- Checkout V1 will price USD only; accepting another currency here would lose
 -- minor-unit semantics. Browse-only stores retain their existing currencies.
 if snapshot->>'currency'<>'USD' or (snapshot->>'unit_amount')::numeric<>round((snapshot->>'unit_amount')::numeric,2) then
  raise exception 'stock_currency_unavailable' using errcode='22023';end if;
 t:=clock_timestamp();
 insert into public.vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,instance_id,product_id,quantity,offer,created_at,expires_at)
 values(p_id,p_buyer_id,s.owner_id,s.id,a.id,p_instance_id,p_product_id,p_quantity,snapshot,t,t+interval '120 seconds') returning * into r;
 return r;
end; $$;

create or replace function public.vendor_stock_release_v1(p_id uuid,p_buyer_id uuid) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into r from public.vendor_stock_reservations where id=p_id;
 if not found or r.buyer_id is distinct from p_buyer_id then raise exception 'stock_not_found' using errcode='42501';end if;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=p_id for update;
 if r.state='released' then return r;end if;
 if r.state='payment_pending' then raise exception 'stock_payment_resolution_required' using errcode='P0001';end if;
 update public.vendor_stock_reservations set state='released',released_at=clock_timestamp(),
  release_reason=case when expires_at<=clock_timestamp() then 'expired' else 'canceled' end where id=p_id returning * into r;
 return r;
end; $$;

-- Claim BEFORE any provider create request. Its durable ID is the future payment
-- attempt's idempotency anchor. No timeout or owner cancellation can release it.
-- Payment settlement/release must be added with the authoritative order ledger.
create or replace function public.vendor_stock_start_payment_v1(p_id uuid,p_buyer_id uuid) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare r public.vendor_stock_reservations; s public.vendor_stores; a public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into r from public.vendor_stock_reservations where id=p_id;
 if not found or r.buyer_id is distinct from p_buyer_id then raise exception 'stock_not_found' using errcode='42501';end if;
 select * into s from public.vendor_stores where id=r.store_id for update;
 select * into a from public.vendor_seller_accounts where id=r.seller_id for update;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=p_id for update;
 if r.state='payment_pending' then return r;end if; -- Recovery only; callers must recheck readiness before provider access.
 if r.state<>'held' or r.expires_at<=clock_timestamp() then raise exception 'stock_reservation_expired' using errcode='P0001';end if;
 if not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
   or not s.web_published or a.state<>'bound' or a.closeout_id is not null
   or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
   or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
   or not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled
    and nullif(slug,'') is not null and nullif(display_name,'') is not null) then
  raise exception 'stock_store_unavailable' using errcode='42501';end if;
 if r.instance_id is not null then
  if public.vendor_store_copy_reason_v1(s.owner_id,r.instance_id) is not null or
   not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=r.instance_id) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
 elsif public.vendor_store_custom_reason_v1(r.product_id) is not null or
   not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and store_id=s.id and published) or
   not exists(select 1 from public.vendor_store_rollout where custom_enabled) then
  raise exception 'stock_item_unavailable' using errcode='P0001';
 end if;
 update public.vendor_stock_reservations set state='payment_pending',payment_started_at=clock_timestamp() where id=p_id returning * into r;
 return r;
end; $$;

revoke all on function public.vendor_stock_require_isolation_v1(),public.vendor_stock_live_quantity_v1(uuid,uuid),
 public.vendor_stock_copy_guard_v1(),public.vendor_stock_product_guard_v1(),public.vendor_stock_store_guard_v1(),
 public.vendor_stock_immutable_v1(),public.vendor_stock_reserve_v1(uuid,uuid,uuid,uuid,uuid,integer),
 public.vendor_stock_release_v1(uuid,uuid),public.vendor_stock_start_payment_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_stock_reserve_v1(uuid,uuid,uuid,uuid,uuid,integer),
 public.vendor_stock_release_v1(uuid,uuid),public.vendor_stock_start_payment_v1(uuid,uuid) to service_role;
notify pgrst,'reload schema';

-- Private durable orders. No checkout endpoint, provider mutation or rollout.

create table if not exists public.vendor_orders_rollout (
 singleton boolean primary key default true check(singleton), orders_enabled boolean not null default false
);
insert into public.vendor_orders_rollout(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_orders (
 id uuid primary key,
 reservation_id uuid not null unique references public.vendor_stock_reservations(id) on delete restrict,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 seller jsonb not null check(jsonb_typeof(seller)='object'),
 offer jsonb not null check(jsonb_typeof(offer)='object'),
 quantity integer not null check(quantity between 1 and 100),
 unit_amount_minor bigint not null check(unit_amount_minor>0),
 shipping_amount_minor bigint not null check(shipping_amount_minor>=0),
 tax_amount_minor bigint not null check(tax_amount_minor>=0),
 currency text not null check(currency='usd'),
 quote_reference uuid not null,
 fulfillment text not null check(fulfillment in ('shipping','pickup')),
 created_at timestamptz not null default clock_timestamp(),
 revision bigint not null default 0 check(revision>=0),
 paid boolean not null default false,
 review_reasons text[] not null default '{}',
 last_checked_at timestamptz,
 check(buyer_id<>owner_id),
 check(unit_amount_minor*quantity+shipping_amount_minor+tax_amount_minor<=99999999),
 check(fulfillment<>'pickup' or shipping_amount_minor=0)
);
create table if not exists public.vendor_order_attempts (
 id uuid primary key,
 order_id uuid not null unique references public.vendor_orders(id) on delete restrict,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255),
 livemode boolean not null,
 creation_started_at timestamptz,
 lease_token uuid,
 lease_fence bigint not null default 0 check(lease_fence>=0),
 lease_expires_at timestamptz,
 session_id text check(length(session_id)<=255 and session_id ~ '^cs_(test|live)_[A-Za-z0-9]+$'),
 session_created_at timestamptz,
 payment_intent_id text check(length(payment_intent_id)<=255 and payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
 check(stripe_account_id<>connected_account_id),
 check((lease_token is null)=(lease_expires_at is null)),
 check((session_id is null)=(session_created_at is null)),
 check(session_id is null or (creation_started_at is not null and session_created_at>=creation_started_at-interval '5 seconds'
   and session_created_at<creation_started_at+interval '23 hours')),
 unique(stripe_account_id,connected_account_id,livemode,session_id),
 unique(stripe_account_id,connected_account_id,livemode,payment_intent_id)
);
create table if not exists public.vendor_order_signals (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255),
 livemode boolean not null,
 event_id text not null check(event_id ~ '^evt_[A-Za-z0-9]+$' and length(event_id)<=255),
 kind text not null check(kind in ('checkout','payment_intent')),
 resource_id text not null check(length(resource_id)<=255),
 provider_created_at timestamptz not null,
 received_at timestamptz not null default clock_timestamp(),
 primary key(stripe_account_id,connected_account_id,livemode,event_id),
 check((kind='checkout' and resource_id ~ '^cs_(test|live)_[A-Za-z0-9]+$') or (kind='payment_intent' and resource_id ~ '^pi_[A-Za-z0-9]+$'))
);
create index if not exists vendor_order_signals_resource on public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,resource_id);
create table if not exists public.vendor_order_observations (
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 evidence jsonb not null check(jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=8192),
 applied_action text not null check(applied_action in ('consume','release','retain','none')),
 revision bigint not null check(revision>0),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(order_id,evidence_hash), unique(order_id,revision)
);
do $$declare n text;begin
 foreach n in array array['vendor_orders_rollout','vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;
grant update on public.vendor_orders_rollout to service_role;

create or replace function public.vendor_order_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'order_history_retained';end if;
 if tg_table_name in ('vendor_order_signals','vendor_order_observations') then raise exception 'order_history_immutable';end if;
 if tg_table_name='vendor_orders' then
  if (to_jsonb(new)-array['revision','paid','review_reasons','last_checked_at']) is distinct from
   (to_jsonb(old)-array['revision','paid','review_reasons','last_checked_at']) or (old.paid and not new.paid)
   or not new.review_reasons @> old.review_reasons then raise exception 'order_immutable';end if;
 else
  if (to_jsonb(new)-array['creation_started_at','lease_token','lease_fence','lease_expires_at','session_id','session_created_at','payment_intent_id']) is distinct from
   (to_jsonb(old)-array['creation_started_at','lease_token','lease_fence','lease_expires_at','session_id','session_created_at','payment_intent_id'])
   or (old.creation_started_at is not null and new.creation_started_at is distinct from old.creation_started_at)
   or (old.session_id is not null and row(new.session_id,new.session_created_at) is distinct from row(old.session_id,old.session_created_at))
   or (old.payment_intent_id is not null and new.payment_intent_id is distinct from old.payment_intent_id)
   or new.lease_fence<old.lease_fence then raise exception 'order_attempt_immutable';end if;
 end if;return new;
end;$$;
do $$declare n text;begin
 foreach n in array array['vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations'] loop
  if not exists(select 1 from pg_trigger where tgrelid=('public.'||n)::regclass and tgname='vendor_order_immutable') then
   execute format('create trigger vendor_order_immutable before update or delete on public.%I for each row execute function public.vendor_order_immutable_v1()',n);
  end if;
 end loop;
end$$;

-- Extend only the named stock lifecycle constraints and transition guard.
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_state_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_state_check check(state in ('held','payment_pending','released','consumed'));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_check3;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_check3 check(
 (state in ('payment_pending','consumed') and payment_started_at is not null) or
 (state='held' and payment_started_at is null) or (state='released' and (payment_started_at is not null)=(release_reason='provider_unpaid')));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_release_reason_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_release_reason_check check(release_reason in ('canceled','expired','provider_unpaid'));

-- Paid stock can never be unarchived/repriced/transferred through a legacy path.
create or replace function public.vendor_order_consumed_copy_v1() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,new.legacy_vault_item_id,
  new.gv_vi_id,new.archived_at,new.condition_label,new.intent,new.pricing_mode,new.asking_price_amount,new.asking_price_currency)
  is not distinct from row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,old.legacy_vault_item_id,
  old.gv_vi_id,old.archived_at,old.condition_label,old.intent,old.pricing_mode,old.asking_price_amount,old.asking_price_currency) then return new;end if;
 perform public.vendor_stock_require_isolation_v1();
 if exists(select 1 from public.vendor_stock_reservations where instance_id=old.id and state='consumed') then
  raise exception 'order_copy_consumed';end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='vendor_order_consumed_copy') then
  create trigger vendor_order_consumed_copy before update or delete on public.vault_item_instances for each row execute function public.vendor_order_consumed_copy_v1();
 end if;
end$$;

-- Server-only immutable quote input: shipping/tax policy is deliberately not an
-- HTTP input here. Unit price and quantity always come from the locked hold.
create or replace function public.vendor_order_create_v1(p_id uuid,p_attempt_id uuid,p_reservation_id uuid,p_buyer_id uuid,
 p_quote_reference uuid,p_fulfillment text,p_shipping bigint,p_tax bigint) returns public.vendor_orders
language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;r public.vendor_stock_reservations;a public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_id is null or p_attempt_id is null or p_reservation_id is null or p_buyer_id is null or p_quote_reference is null
  or p_fulfillment is null or p_fulfillment not in ('shipping','pickup') or p_shipping is null or p_tax is null
  or p_shipping not between 0 and 99999999 or p_tax not between 0 and 99999999 or (p_fulfillment='pickup' and p_shipping<>0) then raise exception 'order_invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-order:'||p_reservation_id::text,0));
 select * into o from public.vendor_orders where reservation_id=p_reservation_id;
 if found then
  if row(o.id,o.buyer_id,o.quote_reference,o.fulfillment,o.shipping_amount_minor,o.tax_amount_minor) is distinct from
   row(p_id,p_buyer_id,p_quote_reference,p_fulfillment,p_shipping,p_tax) or
   not exists(select 1 from public.vendor_order_attempts where order_id=o.id and id=p_attempt_id) then raise exception 'order_request_conflict';end if;
  return o;
 end if;
 if not exists(select 1 from public.vendor_orders_rollout where orders_enabled) then raise exception 'orders_disabled';end if;
 -- Reuses the same store -> seller -> stock -> reservation arbitration.
 r:=public.vendor_stock_start_payment_v1(p_reservation_id,p_buyer_id);
 select * into strict a from public.vendor_seller_accounts where id=r.seller_id;
 if a.state<>'bound' or a.closeout_id is not null then raise exception 'order_seller_unavailable';end if;
 insert into public.vendor_orders(id,reservation_id,buyer_id,owner_id,seller,offer,quantity,unit_amount_minor,
  shipping_amount_minor,tax_amount_minor,currency,quote_reference,fulfillment)
 values(p_id,r.id,r.buyer_id,r.owner_id,jsonb_build_object('id',a.id,'ownerId',a.owner_id,'storeId',a.store_id,
  'platformAccountId',a.stripe_account_id,'connectedAccountId',a.connected_account_id,'livemode',a.livemode,'controller',a.controller),
  r.offer,r.quantity,((r.offer->>'unit_amount')::numeric*100)::bigint,p_shipping,p_tax,'usd',p_quote_reference,p_fulfillment) returning * into o;
 insert into public.vendor_order_attempts(id,order_id,stripe_account_id,connected_account_id,livemode)
 values(p_attempt_id,o.id,a.stripe_account_id,a.connected_account_id,a.livemode);
 return o;
end;$$;

-- First creation timestamp and idempotency key (attempt UUID) are durable.
-- Acquiring a fence never authorizes provider access by itself; re-read seller
-- readiness immediately before any future provider creation adapter.
create or replace function public.vendor_order_claim_v1(p_order_id uuid,p_token uuid) returns public.vendor_order_attempts
language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;s public.vendor_seller_accounts;r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_claim_invalid';end if;
 select * into strict o from public.vendor_orders where id=p_order_id;
 perform 1 from public.vendor_stores where id=(o.seller->>'storeId')::uuid for update;
 select * into strict s from public.vendor_seller_accounts where id=(o.seller->>'id')::uuid for update;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if a.session_id is not null then return a;end if;
 if s.state<>'bound' or s.closeout_id is not null or not exists(select 1 from public.vendor_orders_rollout where orders_enabled)
  or not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(o.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.vendor_stores where id=s.store_id and web_published)
  or not exists(select 1 from public.public_profiles where user_id=o.owner_id and public_profile_enabled and vault_sharing_enabled)
  then raise exception 'order_creation_unavailable';end if;
 if r.state<>'payment_pending' or (r.instance_id is not null and (public.vendor_store_copy_reason_v1(o.owner_id,r.instance_id) is not null
  or not exists(select 1 from public.vendor_store_items where store_id=s.store_id and instance_id=r.instance_id)))
  or (r.product_id is not null and (public.vendor_store_custom_reason_v1(r.product_id) is not null
   or not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and published)
   or not exists(select 1 from public.vendor_store_rollout where custom_enabled))) then raise exception 'order_item_unavailable';end if;
 if a.creation_started_at is not null and clock_timestamp()>=a.creation_started_at+interval '23 hours' then raise exception 'order_creation_recovery_required';end if;
 if a.lease_expires_at>clock_timestamp() then
  if a.lease_token=p_token then return a;end if;raise exception 'order_claim_busy';
 end if;
 update public.vendor_order_attempts set lease_token=p_token,lease_fence=lease_fence+1,lease_expires_at=clock_timestamp()+interval '120 seconds',
  creation_started_at=coalesce(creation_started_at,clock_timestamp()) where id=a.id returning * into a;
 return a;
end;$$;

create or replace function public.vendor_order_bind_v1(p_order_id uuid,p_token uuid,p_fence bigint,p_session text,p_created timestamptz)
returns public.vendor_order_attempts language plpgsql security definer set search_path='' as $$
declare a public.vendor_order_attempts;
begin
 select * into strict a from public.vendor_order_attempts where order_id=p_order_id for update;
 if p_session is null or p_created is null or p_created>clock_timestamp() or p_created<a.creation_started_at-interval '5 seconds'
  or p_created>=a.creation_started_at+interval '23 hours' or p_session !~ ((case when a.livemode then '^cs_live_' else '^cs_test_' end)||'[A-Za-z0-9]+$')
  then raise exception 'order_session_invalid';end if;
 if a.session_id is not null then
  if row(a.session_id,a.session_created_at) is distinct from row(p_session,p_created) then raise exception 'order_session_conflict';end if;return a;
 end if;
 if a.lease_token is distinct from p_token or p_token is null or a.lease_fence is distinct from p_fence or a.lease_expires_at<=clock_timestamp()
  or a.creation_started_at is null then raise exception 'order_claim_stale';end if;
 update public.vendor_order_attempts set session_id=p_session,session_created_at=p_created,lease_token=null,lease_expires_at=null
 where id=a.id returning * into a;return a;
end;$$;

create or replace function public.vendor_order_binding_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('orderId',o.id,'reservationId',o.reservation_id,'attemptId',a.id,'buyerId',o.buyer_id,'seller',o.seller,
 'revision',o.revision,'createdAt',floor(extract(epoch from o.created_at)),
 'creationStartedAt',floor(extract(epoch from a.creation_started_at)),'sessionId',a.session_id,
 'sessionCreatedAt',floor(extract(epoch from a.session_created_at)),'paymentIntentId',a.payment_intent_id,'currency',o.currency,
 'unitAmountMinor',o.unit_amount_minor,'quantity',o.quantity,'shippingAmountMinor',o.shipping_amount_minor,'taxAmountMinor',o.tax_amount_minor,'stockState',r.state)
 from public.vendor_orders o join public.vendor_order_attempts a on a.order_id=o.id
 join public.vendor_stock_reservations r on r.id=o.reservation_id where o.id=p_order_id and a.session_id is not null;
$$;

-- Signals are immutable lookup hints. Pre-binding events survive; metadata and
-- delivery order are never payment authority or order lookup keys.
create or replace function public.vendor_order_signal_v1(p_platform text,p_connected text,p_live boolean,p_event text,p_kind text,p_resource text,p_created timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.vendor_order_signals; result uuid;
begin
 perform public.vendor_order_notification_lock_v1(p_platform,p_live);
 if p_created is null or p_created>clock_timestamp()+interval '5 minutes' then raise exception 'order_signal_invalid';end if;
 insert into public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,event_id,kind,resource_id,provider_created_at)
 values(p_platform,p_connected,p_live,p_event,p_kind,p_resource,p_created) on conflict do nothing;
 select * into strict e from public.vendor_order_signals where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live and event_id=p_event;
 if row(e.kind,e.resource_id,e.provider_created_at) is distinct from row(p_kind,p_resource,p_created) then raise exception 'order_signal_conflict';end if;
 select order_id into result from public.vendor_order_attempts where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live
  and ((p_kind='checkout' and session_id=p_resource) or (p_kind='payment_intent' and payment_intent_id=p_resource));
 if result is not null then perform public.vendor_order_notification_associate_v1(p_platform,p_live,result);end if;
 return result;
end;$$;

-- The service must call this only with original, freshly verified provider
-- evidence. SQL rechecks the persisted revision, scope, identities and money
-- under locks. Evidence hashes alone confer no authority to untrusted callers.
create or replace function public.vendor_order_apply_v1(p_order_id uuid,p_revision bigint,p_platform text,p_connected text,p_live boolean,p_evidence jsonb)
returns public.vendor_orders language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
 checked timestamptz; action text; reasons text[]; v public.vault_item_instances; anchor uuid; remaining integer;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into strict o from public.vendor_orders where id=p_order_id;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 -- Same stock -> reservation order as legacy cancellation/start. No provider IO
 -- and no store/seller/entitlement lock or flag is needed for an old obligation.
 if r.instance_id is not null then select * into strict v from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if row(a.stripe_account_id,a.connected_account_id,a.livemode) is distinct from row(p_platform,p_connected,p_live) then raise exception 'order_scope_mismatch';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or octet_length(p_evidence::text)>8192 or
  not (p_evidence ?& array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons']) or
  p_evidence-array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons']<>'{}'::jsonb
  then raise exception 'order_evidence_invalid';end if;
 if p_evidence->>'version'<>'vendor-checkout-evidence-v1' or p_evidence->>'orderId' is distinct from o.id::text or p_evidence->>'attemptId' is distinct from a.id::text
  or p_evidence->>'sessionId' is distinct from a.session_id or a.session_id is null or p_evidence->>'currency' is distinct from 'usd'
  or coalesce(p_evidence->>'evidenceHash','') !~ '^[a-f0-9]{64}$' or coalesce(p_evidence->>'orderHash','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'amountMinor','')<> (o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor)::text
  or coalesce(p_evidence->>'payment','') not in ('paid','unpaid','pending') or coalesce(p_evidence->>'stockAction','') not in ('consume','release','retain','none')
  or jsonb_typeof(p_evidence->'reviewReasons')<>'array' or jsonb_array_length(p_evidence->'reviewReasons')>16
  or exists(select 1 from jsonb_array_elements(p_evidence->'reviewReasons') x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[a-z_]{1,80}$')
  or (p_evidence->>'paymentIntentId' is not null and p_evidence->>'paymentIntentId' !~ '^pi_[A-Za-z0-9]{1,252}$')
  or (p_evidence->>'chargeId' is not null and p_evidence->>'chargeId' !~ '^ch_[A-Za-z0-9]{1,252}$')
  or (a.payment_intent_id is not null and a.payment_intent_id is distinct from p_evidence->>'paymentIntentId')
  then raise exception 'order_evidence_mismatch';end if;
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if checked is null or checked>clock_timestamp() or checked<=clock_timestamp()-interval '60 seconds' then raise exception 'order_evidence_stale';end if;
 if exists(select 1 from public.vendor_order_observations where order_id=o.id and evidence_hash=p_evidence->>'evidenceHash') then return o;end if;
 if o.revision is distinct from p_revision then raise exception 'order_revision_conflict';end if;
 if checked<o.last_checked_at then raise exception 'order_observation_out_of_order';end if;
 select coalesce(array_agg(x),'{}') into reasons from jsonb_array_elements_text(p_evidence->'reviewReasons') x;
 action:=p_evidence->>'stockAction';
 if p_evidence->>'payment'='paid' and (p_evidence->>'paymentIntentId' is null or p_evidence->>'chargeId' is null) then raise exception 'order_capture_missing';end if;
 if action='consume' and (p_evidence->>'payment'<>'paid' or r.state<>'payment_pending' or cardinality(reasons)>0) then raise exception 'order_consume_invalid';end if;
 if action='release' and (p_evidence->>'payment'<>'unpaid' or r.state<>'payment_pending' or cardinality(reasons)>0) then raise exception 'order_release_invalid';end if;
 if p_evidence->>'payment'='paid' and r.state='released' then reasons:=array_append(reasons,'paid_after_stock_release');end if;
 if o.paid and p_evidence->>'payment'<>'paid' then reasons:=array_append(reasons,'payment_fact_conflict');end if;
 if cardinality(o.review_reasons)>0 or cardinality(reasons)>0 then action:=case when r.state='payment_pending' then 'retain' else 'none' end;end if;
 if o.paid and action='release' then action:='retain';end if;
 update public.vendor_orders set revision=revision+1,paid=paid or p_evidence->>'payment'='paid',last_checked_at=checked,
  review_reasons=array(select distinct x from unnest(o.review_reasons||reasons) x order by x) where id=o.id returning * into o;
 update public.vendor_order_attempts set payment_intent_id=coalesce(payment_intent_id,p_evidence->>'paymentIntentId') where id=a.id;
 insert into public.vendor_order_observations(order_id,evidence_hash,evidence,applied_action,revision) values(o.id,p_evidence->>'evidenceHash',p_evidence,action,o.revision);
 if action in ('consume','release') then
  -- Release our claim before the stock mutation, inside this same locked
  -- transaction. Any subsequent failure rolls back both ledger and stock.
  update public.vendor_stock_reservations set state='released',released_at=clock_timestamp(),release_reason='provider_unpaid'
   where id=r.id and action='release';
  if action='consume' then
   -- The existing pending guard must no longer count our claim, while the
   -- permanent consumed guard is installed only after the first archive.
   if r.instance_id is not null then
    -- No bypass GUC: the sole narrow archive authorization is this transaction's
    -- just-inserted immutable consume observation (see guard below).
    if v.user_id<>o.owner_id or v.archived_at is not null then raise exception 'order_stock_conflict';end if;
    update public.vault_item_instances set archived_at=clock_timestamp() where id=v.id;
    -- Keep the existing legacy summary derived from exact active instances.
    select id into anchor from public.vault_items where user_id=o.owner_id and card_id=(r.offer->>'card_print_id')::uuid and archived_at is null
     order by created_at desc,id desc limit 1 for update;
    select count(*) into remaining from public.vault_item_instances vi left join public.slab_certs sc on sc.id=vi.slab_cert_id
     where vi.user_id=o.owner_id and vi.archived_at is null and coalesce(vi.card_print_id,sc.card_print_id)=(r.offer->>'card_print_id')::uuid;
    update public.vault_items set qty=remaining,archived_at=case when remaining=0 then clock_timestamp() else null end where id=anchor;
   else
    update public.vendor_store_custom_products set available_quantity=available_quantity-r.quantity,version=version+1,updated_at=clock_timestamp(),
     published=case when available_quantity=r.quantity then false else published end,
     suspension_reason=case when available_quantity=r.quantity then 'out_of_stock' else suspension_reason end
     where id=r.product_id and archived_at is null and available_quantity>=r.quantity;
    if not found then raise exception 'order_stock_conflict';end if;
   end if;
   update public.vendor_stock_reservations set state='consumed' where id=r.id;
  end if;
 end if;
 if o.paid then insert into public.vendor_account_financial_holds(owner_id,reason,reference_id) values(o.owner_id,'order_fulfillment',o.id) on conflict do nothing;end if;
 if cardinality(o.review_reasons)>0 then insert into public.vendor_account_financial_holds(owner_id,reason,reference_id) values(o.owner_id,'manual_review',o.id) on conflict do nothing;end if;
 return o;
end;$$;

-- A pending claim being atomically consumed is excluded only when its current
-- immutable ledger observation authorizes consumption. No client-set context.


-- Participant read survives downgrade, but contains no provider IDs, another
-- account's identity, addresses or internal evidence. Exact order ID only.
create or replace function public.vendor_order_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',o.id,'offer',o.offer,'quantity',o.quantity,'unitAmountMinor',o.unit_amount_minor,
 'shippingAmountMinor',o.shipping_amount_minor,'taxAmountMinor',o.tax_amount_minor,'currency',o.currency,
 'fulfillment',o.fulfillment,'paid',o.paid,'needsReview',cardinality(o.review_reasons)>0,'stockState',r.state,'createdAt',o.created_at)
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 where o.id=p_order_id and auth.uid() in (o.owner_id,o.buyer_id);
$$;
revoke all on function public.vendor_order_immutable_v1(),public.vendor_order_consumed_copy_v1(),
 public.vendor_order_create_v1(uuid,uuid,uuid,uuid,uuid,text,bigint,bigint),public.vendor_order_claim_v1(uuid,uuid),
 public.vendor_order_bind_v1(uuid,uuid,bigint,text,timestamptz),public.vendor_order_binding_v1(uuid),
 public.vendor_order_signal_v1(text,text,boolean,text,text,text,timestamptz),public.vendor_order_apply_v1(uuid,bigint,text,text,boolean,jsonb),
 public.vendor_order_status_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_create_v1(uuid,uuid,uuid,uuid,uuid,text,bigint,bigint),public.vendor_order_claim_v1(uuid,uuid),
 public.vendor_order_bind_v1(uuid,uuid,bigint,text,timestamptz),public.vendor_order_binding_v1(uuid),
 public.vendor_order_signal_v1(text,text,boolean,text,text,text,timestamptz),public.vendor_order_apply_v1(uuid,bigint,text,text,boolean,jsonb) to service_role;
grant execute on function public.vendor_order_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';

-- Private checkout preparation/recovery. No rollout, HTTP endpoint or worker.

create or replace function public.vendor_order_checkout_prepare_v1(p_order_id uuid,p_buyer_id uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
 s public.vendor_stores;seller public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null or p_buyer_id is null then raise exception 'order_checkout_invalid';end if;
 select * into o from public.vendor_orders where id=p_order_id;
 if not found or o.buyer_id<>p_buyer_id then raise exception 'order_checkout_unavailable';end if;
 -- Match the existing acquisition order. Settlement never waits for store or
 -- seller locks after taking stock, so these paths cannot reverse lock order.
 select * into strict s from public.vendor_stores where id=(o.seller->>'storeId')::uuid for update;
 select * into strict seller from public.vendor_seller_accounts where id=(o.seller->>'id')::uuid for update;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 if o.paid or cardinality(o.review_reasons)>0 or r.state<>'payment_pending' or s.owner_id<>o.owner_id
  or seller.owner_id<>o.owner_id or seller.store_id<>s.id or seller.state<>'bound' or seller.closeout_id is not null
  or row(seller.stripe_account_id,seller.connected_account_id,seller.livemode,seller.controller) is distinct from
   row(o.seller->>'platformAccountId',o.seller->>'connectedAccountId',(o.seller->>'livemode')::boolean,o.seller->'controller')
  or not s.web_published or not exists(select 1 from public.vendor_orders_rollout where orders_enabled)
  or not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(o.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.public_profiles where user_id=o.owner_id and public_profile_enabled and vault_sharing_enabled
   and nullif(slug,'') is not null and nullif(display_name,'') is not null) then raise exception 'order_checkout_unavailable';end if;
 if r.instance_id is not null then
  if public.vendor_store_copy_reason_v1(o.owner_id,r.instance_id) is not null or
   not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=r.instance_id) then raise exception 'order_item_unavailable';end if;
 else
  if public.vendor_store_custom_reason_v1(r.product_id) is not null or
   not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and store_id=s.id and published) or
   not exists(select 1 from public.vendor_store_rollout where custom_enabled) then raise exception 'order_item_unavailable';end if;
 end if;
 -- The old claim's bound-session fast path is intentionally safe here because
 -- this wrapper reauthorizes BOTH new and already-bound sessions above.
 a:=public.vendor_order_claim_v1(o.id,p_token);
 return jsonb_build_object('order',to_jsonb(o),'attempt',to_jsonb(a),'stockState',r.state);
end;$$;

create or replace function public.vendor_order_checkout_recovery_v1(p_order_id uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_checkout_invalid';end if;
 select * into strict o from public.vendor_orders where id=p_order_id;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if a.creation_started_at is null then raise exception 'order_creation_not_started';end if;
 -- Recovery grants no provider-create authority. The original first timestamp
 -- is immutable: vendor_order_claim_v1 still rejects POST after 23 hours.
 -- Binding still requires a session created inside the original attempt window.
 if a.session_id is null then
  if a.lease_expires_at>clock_timestamp() then
   if a.lease_token is distinct from p_token then raise exception 'order_claim_busy';end if;
  else
   update public.vendor_order_attempts set lease_token=p_token,lease_fence=lease_fence+1,
    lease_expires_at=clock_timestamp()+interval '120 seconds' where id=a.id returning * into a;
  end if;
 end if;
 return jsonb_build_object('order',to_jsonb(o),'attempt',to_jsonb(a),'stockState',r.state);
end;$$;
revoke all on function public.vendor_order_checkout_prepare_v1(uuid,uuid,uuid),public.vendor_order_checkout_recovery_v1(uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_checkout_prepare_v1(uuid,uuid,uuid),public.vendor_order_checkout_recovery_v1(uuid,uuid) to service_role;
notify pgrst,'reload schema';

-- Buyer cancellation is evidence of no checkout start, never provider evidence.

create table if not exists public.vendor_order_cancellations (
 order_id uuid primary key references public.vendor_orders(id) on delete restrict,
 reservation_id uuid not null unique references public.vendor_stock_reservations(id) on delete restrict,
 attempt_id uuid not null unique references public.vendor_order_attempts(id) on delete restrict,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 revision bigint not null check(revision>0),
 canceled_at timestamptz not null default clock_timestamp(),
 reason text not null default 'checkout_never_started' check(reason='checkout_never_started')
);
alter table public.vendor_order_cancellations enable row level security;
revoke all on public.vendor_order_cancellations from public,anon,authenticated,service_role;
grant select on public.vendor_order_cancellations to service_role;
create or replace function public.vendor_order_cancellation_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_cancellation_retained';end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_order_cancellations'::regclass and tgname='vendor_order_cancellation_immutable') then
  create trigger vendor_order_cancellation_immutable before update or delete on public.vendor_order_cancellations
   for each row execute function public.vendor_order_cancellation_immutable_v1();
 end if;
end$$;

alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_check3;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_check3 check(
 (state in ('payment_pending','consumed') and payment_started_at is not null) or
 (state='held' and payment_started_at is null) or
 (state='released' and (payment_started_at is not null)=(release_reason in ('provider_unpaid','order_canceled_unstarted'))));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_release_reason_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_release_reason_check
 check(release_reason in ('canceled','expired','provider_unpaid','order_canceled_unstarted'));



create or replace function public.vendor_order_cancel_unstarted_v1(p_order_id uuid,p_buyer_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;r public.vendor_stock_reservations;a public.vendor_order_attempts;c public.vendor_order_cancellations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_buyer_id is null or p_order_id is null then raise exception 'order_cancellation_unavailable';end if;
 select * into o from public.vendor_orders where id=p_order_id and buyer_id=p_buyer_id;
 if not found then raise exception 'order_cancellation_unavailable';end if;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 -- Compatible with checkout preparation/claim and settlement. No acquisition,
 -- package, publication or seller-readiness gate can strand an old obligation.
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=o.id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if o.buyer_id<>p_buyer_id or r.buyer_id<>p_buyer_id or o.paid or cardinality(o.review_reasons)>0 then raise exception 'order_cancellation_unavailable';end if;
 if a.creation_started_at is not null or a.lease_token is not null or a.lease_expires_at is not null or a.lease_fence<>0
  or a.session_id is not null or a.session_created_at is not null or a.payment_intent_id is not null then raise exception 'order_checkout_started';end if;
 select * into c from public.vendor_order_cancellations where order_id=o.id;
 if found then
  if r.state<>'released' or r.release_reason<>'order_canceled_unstarted' or
   row(c.reservation_id,c.attempt_id,c.buyer_id,c.revision) is distinct from row(r.id,a.id,p_buyer_id,o.revision) then raise exception 'order_cancellation_unavailable';end if;
 else
  if r.state<>'payment_pending' then raise exception 'order_cancellation_unavailable';end if;
  insert into public.vendor_order_cancellations(order_id,reservation_id,attempt_id,buyer_id,revision)
   values(o.id,r.id,a.id,p_buyer_id,o.revision+1) returning * into c;
  update public.vendor_orders set revision=c.revision where id=o.id;
  update public.vendor_stock_reservations set state='released',release_reason='order_canceled_unstarted',released_at=c.canceled_at where id=r.id;
 end if;
 return jsonb_build_object('orderId',o.id,'state','canceled','canceledAt',c.canceled_at);
end;$$;

create or replace function public.vendor_order_cancellation_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('canceledAt',c.canceled_at,'canCancel',coalesce(
  auth.uid()=o.buyer_id and c.order_id is null and not o.paid and cardinality(o.review_reasons)=0 and r.state='payment_pending'
  and a.id is not null and a.creation_started_at is null and a.lease_token is null and a.lease_expires_at is null and a.lease_fence=0
  and a.session_id is null and a.session_created_at is null and a.payment_intent_id is null,false))
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 left join public.vendor_order_attempts a on a.order_id=o.id
 left join public.vendor_order_cancellations c on c.order_id=o.id
 where o.id=p_order_id and auth.uid() in(o.owner_id,o.buyer_id);
$$;
revoke all on function public.vendor_order_cancellation_immutable_v1(),public.vendor_order_cancel_unstarted_v1(uuid,uuid),
 public.vendor_order_cancellation_status_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_cancel_unstarted_v1(uuid,uuid) to service_role;
grant execute on function public.vendor_order_cancellation_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';

-- Operational retry ownership only. Payment and stock authority stay in the
-- existing immutable orders, provider verifier and atomic settlement boundary.
create table if not exists public.vendor_order_reconcile_control (
 id boolean primary key default true check(id), enabled boolean not null default false
);
insert into public.vendor_order_reconcile_control(id) values(true) on conflict do nothing;
create table if not exists public.vendor_order_reconcile_scopes (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 livemode boolean not null, scan_after uuid, scan_upper uuid,
 completed_sweeps bigint not null default 0 check(completed_sweeps>=0),
 last_scan_at timestamptz, last_completed_sweep_at timestamptz,
 last_claimed_at timestamptz, last_finished_at timestamptz,
 primary key(stripe_account_id,livemode), check(scan_after is null or (scan_upper is not null and scan_after<=scan_upper))
);
create table if not exists public.vendor_order_reconcile_jobs (
 order_id uuid primary key references public.vendor_orders(id) on delete restrict,
 next_run_at timestamptz not null, created_at timestamptz not null default clock_timestamp(),
 lease_token uuid, lease_fence bigint not null default 0 check(lease_fence>=0), lease_expires_at timestamptz,
 attempts bigint not null default 0 check(attempts>=0), failures integer not null default 0 check(failures>=0),
 abandoned_claims bigint not null default 0 check(abandoned_claims>=0),
 last_claimed_at timestamptz, last_finished_at timestamptz,
 last_result text check(last_result in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit')),
 check((lease_token is null)=(lease_expires_at is null)), unique(lease_token)
);
create index if not exists vendor_order_reconcile_jobs_due on public.vendor_order_reconcile_jobs(next_run_at,order_id);
create table if not exists public.vendor_order_reconcile_events (
 order_id uuid not null references public.vendor_order_reconcile_jobs(order_id) on delete restrict,
 fence bigint not null check(fence>0), phase text not null check(phase in ('claimed','finished')),
 token uuid not null, recorded_at timestamptz not null default clock_timestamp(),
 result text check(result in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit')),
 next_run_at timestamptz,
 primary key(order_id,fence,phase),
 check((phase='claimed' and result is null and next_run_at is null) or (phase='finished' and result is not null and next_run_at is not null))
);
alter table public.vendor_order_reconcile_control enable row level security;
alter table public.vendor_order_reconcile_scopes enable row level security;
alter table public.vendor_order_reconcile_jobs enable row level security;
alter table public.vendor_order_reconcile_events enable row level security;
revoke all on public.vendor_order_reconcile_control,public.vendor_order_reconcile_scopes,
 public.vendor_order_reconcile_jobs,public.vendor_order_reconcile_events from public,anon,authenticated,service_role;
grant select on public.vendor_order_reconcile_control,public.vendor_order_reconcile_scopes,
 public.vendor_order_reconcile_jobs,public.vendor_order_reconcile_events to service_role;

create or replace function public.vendor_order_reconcile_event_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'order_queue_event_immutable';end;$$;
drop trigger if exists vendor_order_reconcile_event_immutable on public.vendor_order_reconcile_events;
create trigger vendor_order_reconcile_event_immutable before update or delete on public.vendor_order_reconcile_events
 for each row execute function public.vendor_order_reconcile_event_immutable_v1();

create or replace function public.vendor_order_reconcile_require_v1(p_platform text,p_live boolean,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_platform is null or p_platform !~ '^acct_[A-Za-z0-9]+$' or length(p_platform)>255 or p_live is null or p_enabled is null then
  raise exception 'order_queue_invalid';end if;
 if p_enabled then
  perform public.vendor_stock_require_isolation_v1();
  if not coalesce((select enabled from public.vendor_order_reconcile_control where id),false) then raise exception 'order_queue_disabled';end if;
 end if;
end;$$;

-- Cursor advancement and insertion commit together. Each sweep has a fixed
-- upper UUID. Inserts behind the cursor are picked up on the next full sweep.
create or replace function public.vendor_order_reconcile_seed_v1(p_platform text,p_live boolean,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_order_reconcile_scopes;r record;n integer:=0;done boolean;due timestamptz;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,true);
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'order_queue_invalid';end if;
 perform public.vendor_order_notification_associate_v1(p_platform,p_live);
 select * into strict s from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
 if s.scan_upper is null then
  select order_id into s.scan_upper from public.vendor_order_attempts where stripe_account_id=p_platform and livemode=p_live
   and creation_started_at is not null order by order_id desc limit 1;
 end if;
 for r in select order_id,session_id,creation_started_at from public.vendor_order_attempts
  where stripe_account_id=p_platform and livemode=p_live and creation_started_at is not null
   and (s.scan_after is null or order_id>s.scan_after) and order_id<=s.scan_upper order by order_id limit p_limit
 loop
  due:=case when r.session_id is null then greatest(clock_timestamp(),r.creation_started_at+interval '23 hours 120 seconds') else clock_timestamp() end;
  insert into public.vendor_order_reconcile_jobs(order_id,next_run_at) values(r.order_id,due)
   on conflict(order_id) do update set next_run_at=least(vendor_order_reconcile_jobs.next_run_at,excluded.next_run_at)
    where vendor_order_reconcile_jobs.last_finished_at is null and vendor_order_reconcile_jobs.lease_token is null;
  s.scan_after:=r.order_id;n:=n+1;
 end loop;
 done:=not exists(select 1 from public.vendor_order_attempts where stripe_account_id=p_platform and livemode=p_live
  and creation_started_at is not null and (s.scan_after is null or order_id>s.scan_after) and order_id<=s.scan_upper);
 update public.vendor_order_reconcile_scopes set scan_after=case when done then null else s.scan_after end,
  scan_upper=case when done then null else s.scan_upper end,last_scan_at=clock_timestamp(),
  completed_sweeps=completed_sweeps+case when done then 1 else 0 end,
  last_completed_sweep_at=case when done then clock_timestamp() else last_completed_sweep_at end
  where stripe_account_id=p_platform and livemode=p_live returning * into s;
 return jsonb_build_object('scanned',n,'complete',done,'completedSweeps',s.completed_sweeps);
end;$$;

create or replace function public.vendor_order_reconcile_claim_v1(p_platform text,p_live boolean,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.vendor_order_reconcile_jobs;lane text;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,true);
 if p_token is null then raise exception 'order_queue_invalid';end if;
 -- All bookkeeping takes scope before job, including seed and completion.
 -- Provider IO happens after this short transaction has committed.
 perform public.vendor_order_notification_associate_v1(p_platform,p_live);
 select q.* into j from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id
  where a.stripe_account_id=p_platform and a.livemode=p_live and a.creation_started_at is not null
   and (a.session_id is not null or a.creation_started_at+interval '23 hours 120 seconds'<=clock_timestamp())
   and q.next_run_at<=clock_timestamp() and (q.lease_expires_at is null or q.lease_expires_at<=clock_timestamp())
  order by q.next_run_at,q.order_id limit 1 for update of q skip locked;
 if not found then return null;end if;
 update public.vendor_order_reconcile_jobs set lease_token=p_token,lease_fence=lease_fence+1,claimed_generation=requested_generation,
  lease_expires_at=clock_timestamp()+interval '180 seconds',attempts=attempts+1,last_claimed_at=clock_timestamp(),
  abandoned_claims=abandoned_claims+case when lease_token is not null then 1 else 0 end
  where order_id=j.order_id returning * into j;
 select case when session_id is null then 'discovery' else 'bound' end into lane from public.vendor_order_attempts where order_id=j.order_id;
 insert into public.vendor_order_reconcile_events(order_id,fence,phase,token) values(j.order_id,j.lease_fence,'claimed',p_token);
 update public.vendor_order_reconcile_scopes set last_claimed_at=clock_timestamp() where stripe_account_id=p_platform and livemode=p_live;
 return jsonb_build_object('orderId',j.order_id,'token',p_token,'fence',j.lease_fence,'lane',lane,'leaseExpiresAt',j.lease_expires_at);
end;$$;

create or replace function public.vendor_order_reconcile_finish_v1(p_platform text,p_live boolean,p_order uuid,p_token uuid,p_fence bigint,p_result text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.vendor_order_reconcile_jobs;e public.vendor_order_reconcile_events;o public.vendor_orders;
 result text:=p_result;due timestamptz;v_failures integer;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 perform public.vendor_stock_require_isolation_v1();
 if p_order is null or p_token is null or p_fence is null or p_fence<1 or p_result is null or
  p_result not in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit') then raise exception 'order_queue_invalid';end if;
 if not exists(select 1 from public.vendor_order_attempts where order_id=p_order and stripe_account_id=p_platform and livemode=p_live) then
  raise exception 'order_queue_scope_mismatch';end if;
 perform public.vendor_order_notification_associate_v1(p_platform,p_live,p_order);
 select * into strict j from public.vendor_order_reconcile_jobs where order_id=p_order for update;
 select * into e from public.vendor_order_reconcile_events where order_id=p_order and fence=p_fence and phase='finished';
 if found then
  if e.token<>p_token or (e.result<>p_result and not(e.result='needs_review' and p_result='verified')) then raise exception 'order_queue_receipt_conflict';end if;
  return jsonb_build_object('orderId',p_order,'fence',p_fence,'result',e.result,'nextRunAt',e.next_run_at);
 end if;
 if j.lease_token is distinct from p_token or j.lease_fence<>p_fence or j.lease_expires_at<=clock_timestamp() then raise exception 'order_queue_lease_lost';end if;
 select * into strict o from public.vendor_orders where id=p_order;
 if result='verified' then
  if not exists(select 1 from public.vendor_order_attempts where order_id=p_order and session_id is not null) then raise exception 'order_queue_not_bound';end if;
  if cardinality(o.review_reasons)>0 then result:='needs_review';end if;
 end if;
 v_failures:=case when result='verified' then 0 else least(j.failures+1,1000000) end;
 due:=clock_timestamp()+case when result='verified' then case when o.paid then interval '6 hours' else interval '15 minutes' end
  when result='needs_review' then interval '1 hour'
  else make_interval(secs=>least(3600,30*power(2,least(v_failures-1,7)))::integer) end;
 -- A successful check acknowledges only the generation captured before IO.
 -- A later event remains due even when this payment observation was clean.
 if result in ('verified','needs_review') and j.requested_generation>j.claimed_generation then due:=clock_timestamp();end if;
 update public.vendor_order_reconcile_jobs set completed_generation=case when result in ('verified','needs_review')
  then greatest(completed_generation,claimed_generation) else completed_generation end,lease_token=null,lease_expires_at=null,last_finished_at=clock_timestamp(),
  last_result=result,failures=v_failures,next_run_at=due where order_id=p_order;
 insert into public.vendor_order_reconcile_events(order_id,fence,phase,token,result,next_run_at) values(p_order,p_fence,'finished',p_token,result,due);
 update public.vendor_order_reconcile_scopes set last_finished_at=clock_timestamp() where stripe_account_id=p_platform and livemode=p_live;
 return jsonb_build_object('orderId',p_order,'fence',p_fence,'result',result,'nextRunAt',due);
end;$$;

create or replace function public.vendor_order_reconcile_status_v1(p_platform text,p_live boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_order_reconcile_scopes;stats jsonb;attention jsonb;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 select * into s from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live;
 select jsonb_build_object('total',count(*),'due',count(*) filter(where q.next_run_at<=clock_timestamp() and (q.lease_expires_at is null or q.lease_expires_at<=clock_timestamp())),
  'leased',count(*) filter(where q.lease_expires_at>clock_timestamp()),'expiredLeases',count(*) filter(where q.lease_expires_at<=clock_timestamp()),
  'unresolved',count(*) filter(where q.last_result is not null and q.last_result<>'verified'),
  'abandonedClaims',coalesce(sum(q.abandoned_claims),0),'oldestDueAt',min(q.next_run_at) filter(where q.next_run_at<=clock_timestamp())) into stats
  from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id where a.stripe_account_id=p_platform and a.livemode=p_live;
 select coalesce(jsonb_agg(x.value),'[]'::jsonb) into attention from (
  select jsonb_build_object('orderId',q.order_id,'result',q.last_result,'failures',q.failures,'nextRunAt',q.next_run_at,'leaseExpiresAt',q.lease_expires_at) value
  from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id
  where a.stripe_account_id=p_platform and a.livemode=p_live and (q.last_result is not null and q.last_result<>'verified' or q.lease_expires_at<=clock_timestamp())
  order by q.next_run_at,q.order_id limit 25) x;
 return stats||jsonb_build_object('enabled',coalesce((select enabled from public.vendor_order_reconcile_control where id),false),
  'checkedAt',clock_timestamp(),'lastScanAt',s.last_scan_at,'lastCompletedSweepAt',s.last_completed_sweep_at,
  'lastClaimedAt',s.last_claimed_at,'lastFinishedAt',s.last_finished_at,'completedSweeps',coalesce(s.completed_sweeps,0),'attention',attention);
end;$$;

revoke all on function public.vendor_order_reconcile_event_immutable_v1(),public.vendor_order_reconcile_require_v1(text,boolean,boolean),
 public.vendor_order_reconcile_seed_v1(text,boolean,integer),public.vendor_order_reconcile_claim_v1(text,boolean,uuid),
 public.vendor_order_reconcile_finish_v1(text,boolean,uuid,uuid,bigint,text),public.vendor_order_reconcile_status_v1(text,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_reconcile_seed_v1(text,boolean,integer),public.vendor_order_reconcile_claim_v1(text,boolean,uuid),
 public.vendor_order_reconcile_finish_v1(text,boolean,uuid,uuid,bigint,text),public.vendor_order_reconcile_status_v1(text,boolean) to service_role;
notify pgrst,'reload schema';

-- Seller-recorded fulfillment, separate from payment and carrier evidence.

create table if not exists public.vendor_order_fulfillment_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_fulfillment_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_fulfillment_events (
 id uuid primary key,
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 sequence bigint not null check(sequence>0),
 action text not null check(action in ('ready_pickup','collect','ship','update_tracking','deliver')),
 state text not null check(state in ('ready_pickup','collected','shipped','delivered')),
 carrier text check(carrier in ('usps','ups','fedex','dhl','other')),
 tracking text check(length(tracking) between 3 and 100 and tracking ~ '^[A-Za-z0-9][A-Za-z0-9 -]*$'),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(order_id,sequence),
 check((state in ('shipped','delivered'))=(carrier is not null and tracking is not null)),
 check(state in ('shipped','delivered') or (carrier is null and tracking is null)),
 check((action='ready_pickup' and state='ready_pickup') or (action='collect' and state='collected')
  or (action in ('ship','update_tracking') and state='shipped') or (action='deliver' and state='delivered'))
);
alter table public.vendor_order_fulfillment_control enable row level security;
alter table public.vendor_order_fulfillment_events enable row level security;
revoke all on public.vendor_order_fulfillment_control,public.vendor_order_fulfillment_events from public,anon,authenticated,service_role;
grant select on public.vendor_order_fulfillment_control,public.vendor_order_fulfillment_events to service_role;
create or replace function public.vendor_order_fulfillment_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_fulfillment_history_retained';end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_order_fulfillment_events'::regclass and tgname='vendor_order_fulfillment_immutable') then
  create trigger vendor_order_fulfillment_immutable before update or delete on public.vendor_order_fulfillment_events
   for each row execute function public.vendor_order_fulfillment_immutable_v1();
 end if;
end$$;

create or replace function public.vendor_order_fulfillment_record_v1(
 p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_sequence bigint,p_action text,p_carrier text default null,p_tracking text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders; previous public.vendor_order_fulfillment_events; saved public.vendor_order_fulfillment_events;
 a public.vendor_order_attempts; current_state text; current_sequence bigint; next_state text; next_carrier text; next_tracking text;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_actor_id is null or p_request_id is null or p_expected_sequence is null or p_expected_sequence<0
  or p_action is null or p_action not in ('ready_pickup','collect','ship','update_tracking','deliver') then raise exception 'order_fulfillment_invalid';end if;
 -- Obtain the immutable scope before the order lock; re-read pending signals
 -- only after acquiring the order lock, including a newly committed PI binding.
 select t.* into a from public.vendor_order_attempts t join public.vendor_orders v on v.id=t.order_id
  where v.id=p_order_id and v.owner_id=p_actor_id;
 if not found then raise exception 'order_fulfillment_unavailable';end if;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 -- Only this immutable owner can record fulfillment. No inventory lock is acquired
 -- after this order lock, so settlement's stock/reservation/order order cannot cycle.
 select * into o from public.vendor_orders where id=p_order_id and owner_id=p_actor_id for update;
 if not found then raise exception 'order_fulfillment_unavailable';end if;
 if p_action in ('ship','update_tracking') then
  if p_carrier is null or p_carrier not in ('usps','ups','fedex','dhl','other') or p_tracking is null
   or length(p_tracking) not between 3 and 100 or p_tracking !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$' or p_tracking<>btrim(p_tracking)
   then raise exception 'order_fulfillment_invalid';end if;
 elsif p_carrier is not null or p_tracking is not null then raise exception 'order_fulfillment_invalid';end if;
 select * into saved from public.vendor_order_fulfillment_events where id=p_request_id;
 if found then
  if row(saved.order_id,saved.actor_id,saved.sequence,saved.action) is distinct from row(o.id,p_actor_id,p_expected_sequence+1,p_action)
   or (p_action in ('ship','update_tracking') and row(saved.carrier,saved.tracking) is distinct from row(p_carrier,p_tracking))
   then raise exception 'order_fulfillment_conflict';end if;
  -- Exact receipt recovery survives pause and subsequent payment review.
 else
  if not coalesce((select enabled from public.vendor_order_fulfillment_control where singleton),false) then raise exception 'order_fulfillment_disabled';end if;
  if not o.paid or cardinality(o.review_reasons)>0 or public.vendor_order_refund_pending_v1(o.id) or public.vendor_order_notification_pending_v1(o.id) or not exists(select 1 from public.vendor_stock_reservations where id=o.reservation_id and state='consumed')
   then raise exception 'order_fulfillment_payment_unresolved';end if;
  select * into previous from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 1;
  current_state:=coalesce(previous.state,'unfulfilled');current_sequence:=coalesce(previous.sequence,0);
  if current_sequence<>p_expected_sequence then raise exception 'order_fulfillment_conflict';end if;
  if o.fulfillment='pickup' and current_state='unfulfilled' and p_action='ready_pickup' then next_state:='ready_pickup';
  elsif o.fulfillment='pickup' and current_state='ready_pickup' and p_action='collect' then next_state:='collected';
  elsif o.fulfillment='shipping' and current_state='unfulfilled' and p_action='ship' then next_state:='shipped';
  elsif o.fulfillment='shipping' and current_state='shipped' and p_action='update_tracking' then
   if row(previous.carrier,previous.tracking) is not distinct from row(p_carrier,p_tracking) then raise exception 'order_fulfillment_invalid';end if;
   next_state:='shipped';
  elsif o.fulfillment='shipping' and current_state='shipped' and p_action='deliver' then next_state:='delivered';
  else raise exception 'order_fulfillment_conflict';end if;
  if p_action='deliver' then next_carrier:=previous.carrier;next_tracking:=previous.tracking;
  else next_carrier:=p_carrier;next_tracking:=p_tracking;end if;
  insert into public.vendor_order_fulfillment_events(id,order_id,actor_id,sequence,action,state,carrier,tracking)
   values(p_request_id,o.id,p_actor_id,current_sequence+1,p_action,next_state,next_carrier,next_tracking) returning * into saved;
 end if;
 return jsonb_build_object('requestId',saved.id,'orderId',saved.order_id,'sequence',saved.sequence,'action',saved.action,
  'state',saved.state,'carrier',saved.carrier,'tracking',saved.tracking,'recordedAt',saved.recorded_at);
end;$$;

create or replace function public.vendor_order_fulfillment_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_FULFILLMENT_V1','orderId',o.id,'mode',o.fulfillment,
  'role',case when auth.uid()=o.owner_id then 'seller' else 'buyer' end,
  'canManage',auth.uid()=o.owner_id and c.enabled and o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and not public.vendor_order_notification_pending_v1(o.id) and r.state='consumed',
  'paymentReady',o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and not public.vendor_order_notification_pending_v1(o.id) and r.state='consumed',
  'sequence',coalesce(last.sequence,0),'state',coalesce(last.state,'unfulfilled'),
  'carrier',last.carrier,'tracking',last.tracking,'updatedAt',last.recorded_at,
  'events',coalesce((select jsonb_agg(jsonb_build_object('requestId',e.id,'sequence',e.sequence,'action',e.action,'state',e.state,
   'carrier',e.carrier,'tracking',e.tracking,'recordedAt',e.recorded_at) order by e.sequence desc)
   from (select * from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 20) e),'[]'::jsonb))
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 cross join public.vendor_order_fulfillment_control c
 left join lateral(select * from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 1) last on true
 where o.id=p_order_id and auth.uid() in(o.owner_id,o.buyer_id) and c.singleton;
$$;
revoke all on function public.vendor_order_fulfillment_immutable_v1(),
 public.vendor_order_fulfillment_record_v1(uuid,uuid,uuid,bigint,text,text,text),public.vendor_order_fulfillment_status_v1(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_fulfillment_record_v1(uuid,uuid,uuid,bigint,text,text,text) to service_role;
grant execute on function public.vendor_order_fulfillment_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';

-- Durable owner-authorized refunds. Disabled by default; no provider or stock action.

create table if not exists public.vendor_order_refunds_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_refunds_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_refund_requests (
 id uuid primary key,
 request_version text not null default 'v1' check(request_version='v1'),
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 amount_minor bigint not null check(amount_minor between 1 and 99999999),
 reason text not null check(reason in ('requested_by_customer','duplicate')),
 charge_id text not null check(charge_id ~ '^ch_[A-Za-z0-9]+$' and length(charge_id)<=255),
 payment_intent_id text not null check(payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and length(payment_intent_id)<=255),
 platform_account_id text not null check(platform_account_id ~ '^acct_[A-Za-z0-9]+$' and length(platform_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255 and connected_account_id<>platform_account_id),
 livemode boolean not null,
 created_at timestamptz not null default clock_timestamp(),
 creation_started_at timestamptz not null default clock_timestamp(),
 lease_token uuid not null,
 lease_fence bigint not null default 1 check(lease_fence>0),
 lease_expires_at timestamptz not null,
 refund_id text check(refund_id ~ '^re_[A-Za-z0-9]+$' and length(refund_id)<=255),
 status text not null default 'unbound' check(status in ('unbound','pending','requires_action','succeeded','failed','canceled')),
 last_checked_at timestamptz,
 check((refund_id is null)=(status='unbound')),
 unique(platform_account_id,connected_account_id,livemode,refund_id)
);
create index if not exists vendor_order_refund_requests_order on public.vendor_order_refund_requests(order_id,created_at,id);
create table if not exists public.vendor_order_refund_observations (
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 charge_id text not null,
 checked_at timestamptz not null,
 inventory jsonb not null check(jsonb_typeof(inventory)='object' and octet_length(inventory::text)<=262144),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(order_id,evidence_hash)
);
do $$declare n text;begin
 foreach n in array array['vendor_order_refunds_control','vendor_order_refund_requests','vendor_order_refund_observations'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;

create or replace function public.vendor_order_refund_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or tg_table_name='vendor_order_refund_observations' then raise exception 'order_refund_history_retained';end if;
 if (to_jsonb(new)-array['lease_token','lease_fence','lease_expires_at','refund_id','status','last_checked_at']) is distinct from
  (to_jsonb(old)-array['lease_token','lease_fence','lease_expires_at','refund_id','status','last_checked_at'])
  or (old.refund_id is not null and new.refund_id is distinct from old.refund_id)
  or new.lease_fence<old.lease_fence then raise exception 'order_refund_request_immutable';end if;
 return new;
end;$$;
drop trigger if exists vendor_order_refund_immutable on public.vendor_order_refund_requests;
create trigger vendor_order_refund_immutable before update or delete on public.vendor_order_refund_requests
 for each row execute function public.vendor_order_refund_immutable_v1();
drop trigger if exists vendor_order_refund_immutable on public.vendor_order_refund_observations;
create trigger vendor_order_refund_immutable before update or delete on public.vendor_order_refund_observations
 for each row execute function public.vendor_order_refund_immutable_v1();

create or replace function public.vendor_order_refund_validate_v1(p_order uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r jsonb;checked timestamptz;
 amount bigint;success bigint:=0;pending bigint:=0;failed bigint:=0;canceled bigint:=0;seen text[]:='{}';
begin
 select * into strict o from public.vendor_orders where id=p_order;
 select * into strict a from public.vendor_order_attempts where order_id=p_order;
 if p_revision is null or o.revision<>p_revision then raise exception 'order_revision_conflict';end if;
 if not o.paid or a.payment_intent_id is null then raise exception 'order_refund_payment_unverified';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or
  not (p_evidence ?& array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons'])
  or exists(select 1 from unnest(array['version','orderId','attemptId','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','currency','payment','stockAction']) k where jsonb_typeof(p_evidence->k) is distinct from 'string')
  or jsonb_typeof(p_evidence->'checkedAt') is distinct from 'number' or jsonb_typeof(p_evidence->'amountMinor') is distinct from 'number'
  or jsonb_typeof(p_evidence->'reviewReasons') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_evidence->'reviewReasons') x where jsonb_typeof(x) is distinct from 'string')
  or p_evidence->>'version'<>'vendor-checkout-evidence-v1' or p_evidence->>'orderId'<>p_order::text
  or p_evidence->>'attemptId'<>a.id::text or p_evidence->>'sessionId'<>a.session_id
  or p_evidence->>'paymentIntentId'<>a.payment_intent_id or p_evidence->>'currency'<>o.currency
  or p_evidence->>'payment'<>'paid' or p_evidence->>'evidenceHash' !~ '^[a-f0-9]{64}$'
  or p_evidence->>'orderHash' !~ '^[a-f0-9]{64}$' or p_evidence->>'chargeId' !~ '^ch_[A-Za-z0-9]{1,252}$'
  or p_evidence->>'amountMinor' !~ '^[0-9]{1,8}$' or p_evidence->>'checkedAt' !~ '^[0-9]{1,12}$'
  or (p_evidence->>'amountMinor')::bigint<>o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor
  then raise exception 'order_refund_evidence_invalid';end if;
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if checked>clock_timestamp() or checked<=clock_timestamp()-interval '60 seconds' then raise exception 'order_refund_evidence_stale';end if;
 if not exists(select 1 from public.vendor_order_observations where order_id=p_order and evidence->>'payment'='paid'
  and evidence->>'chargeId'=p_evidence->>'chargeId' and evidence->>'paymentIntentId'=a.payment_intent_id)
  then raise exception 'order_refund_capture_mismatch';end if;
 if p_inventory is null or jsonb_typeof(p_inventory)<>'object' or octet_length(p_inventory::text)>262144
  or not (p_inventory ?& array['complete','rows','succeededMinor','pendingMinor','failedMinor','canceledMinor','reviewReasons'])
  or p_inventory-array['complete','rows','succeededMinor','pendingMinor','failedMinor','canceledMinor','reviewReasons']<>'{}'::jsonb
  or p_inventory->'complete' is distinct from 'true'::jsonb or jsonb_typeof(p_inventory->'rows') is distinct from 'array' or jsonb_array_length(p_inventory->'rows')>500
  or exists(select 1 from unnest(array['succeededMinor','pendingMinor','failedMinor','canceledMinor']) k where jsonb_typeof(p_inventory->k) is distinct from 'number')
  or jsonb_typeof(p_inventory->'reviewReasons') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_inventory->'reviewReasons') x where jsonb_typeof(x) is distinct from 'string')
  then raise exception 'order_refund_inventory_incomplete';end if;
 for r in select value from jsonb_array_elements(p_inventory->'rows') loop
  if jsonb_typeof(r)<>'object' or not (r ?& array['id','amountMinor','createdAt','requestId','status','balanceTransactionId','failureBalanceTransactionId','failureReason','pendingReason'])
   or r-array['id','amountMinor','createdAt','requestId','status','balanceTransactionId','failureBalanceTransactionId','failureReason','pendingReason']<>'{}'::jsonb
   or jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'status') is distinct from 'string'
   or jsonb_typeof(r->'amountMinor') is distinct from 'number' or jsonb_typeof(r->'createdAt') is distinct from 'number'
   or r->>'id' !~ '^re_[A-Za-z0-9]{1,252}$' or r->>'id'=any(seen)
   or r->>'amountMinor' !~ '^[0-9]{1,8}$' or (r->>'amountMinor')::bigint not between 1 and (p_evidence->>'amountMinor')::bigint
   or r->>'createdAt' !~ '^[0-9]{1,12}$' or (r->>'createdAt')::bigint>extract(epoch from clock_timestamp())
   or r->>'status' not in ('pending','requires_action','succeeded','failed','canceled')
   or (r->>'requestId' is not null and r->>'requestId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
   or exists(select 1 from unnest(array['balanceTransactionId','failureBalanceTransactionId']) k
    where r->k<>'null'::jsonb and (jsonb_typeof(r->k) is distinct from 'string' or r->>k !~ '^txn_[A-Za-z0-9]{1,251}$'))
   or exists(select 1 from unnest(array['failureReason','pendingReason']) k
    where r->k<>'null'::jsonb and (jsonb_typeof(r->k) is distinct from 'string' or r->>k !~ '^[a-z_]{1,80}$'))
   then raise exception 'order_refund_inventory_invalid';end if;
  seen:=array_append(seen,r->>'id');amount:=(r->>'amountMinor')::bigint;
  case r->>'status' when 'succeeded' then success:=success+amount;
   when 'pending' then pending:=pending+amount;when 'requires_action' then pending:=pending+amount;
   when 'failed' then failed:=failed+amount;when 'canceled' then canceled:=canceled+amount;end case;
 end loop;
 if p_inventory->>'succeededMinor'<>success::text or p_inventory->>'pendingMinor'<>pending::text
  or p_inventory->>'failedMinor'<>failed::text or p_inventory->>'canceledMinor'<>canceled::text
  or success+pending>(p_evidence->>'amountMinor')::bigint then raise exception 'order_refund_amount_mismatch';end if;
end;$$;

create or replace function public.vendor_order_refund_context_v1(p_order_id uuid,p_actor_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('binding',public.vendor_order_binding_v1(o.id),'paid',o.paid,
  'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from
   (select * from public.vendor_order_refund_requests where order_id=o.id order by created_at,id limit 500) r),'[]'::jsonb))
 from public.vendor_orders o where o.id=p_order_id and (p_actor_id is null or o.owner_id=p_actor_id);
$$;

create or replace function public.vendor_order_refund_observe_v1(p_order_id uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare req public.vendor_order_refund_requests;r jsonb;checked timestamptz;
begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_orders where id=p_order_id for update;
 perform public.vendor_order_refund_validate_v1(p_order_id,p_revision,p_evidence,p_inventory);
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if exists(select 1 from public.vendor_order_refund_observations where order_id=p_order_id and evidence_hash=p_evidence->>'evidenceHash'
  and (inventory is distinct from p_inventory or charge_id is distinct from p_evidence->>'chargeId')) then raise exception 'order_refund_evidence_conflict';end if;
 if exists(select 1 from public.vendor_order_refund_observations where order_id=p_order_id and checked_at>checked)
  then raise exception 'order_refund_evidence_stale';end if;
 for req in select * from public.vendor_order_refund_requests where order_id=p_order_id and refund_id is not null for update loop
  select value into r from jsonb_array_elements(p_inventory->'rows') where value->>'id'=req.refund_id;
  if not found or (r->>'amountMinor')::bigint<>req.amount_minor then raise exception 'order_refund_binding_mismatch';end if;
  update public.vendor_order_refund_requests set status=r->>'status',last_checked_at=checked where id=req.id;
 end loop;
 insert into public.vendor_order_refund_observations(order_id,evidence_hash,charge_id,checked_at,inventory)
  values(p_order_id,p_evidence->>'evidenceHash',p_evidence->>'chargeId',checked,p_inventory) on conflict do nothing;
end;$$;

create or replace function public.vendor_order_refund_prepare_v1(p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_amount bigint,p_reason text,
 p_token uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_order_refund_requests;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into o from public.vendor_orders where id=p_order_id for update;
 if o.id is null or p_actor_id is null or o.owner_id<>p_actor_id then raise exception 'order_refund_unavailable';end if;
 if p_request_id is null or p_token is null or p_amount is null or p_amount not between 1 and 99999999 or
  p_reason is null or p_reason not in ('requested_by_customer','duplicate') then raise exception 'order_refund_invalid';end if;
 select * into r from public.vendor_order_refund_requests where id=p_request_id;
 if found then
  if row(r.order_id,r.actor_id,r.amount_minor,r.reason) is distinct from row(o.id,p_actor_id,p_amount,p_reason) then raise exception 'order_refund_request_conflict';end if;
  if r.refund_id is not null then return r;end if;
  if r.creation_started_at<=clock_timestamp()-interval '23 hours' then raise exception 'order_refund_recovery_required';end if;
  if r.lease_token<>p_token and r.lease_expires_at>clock_timestamp() then raise exception 'order_refund_busy';end if;
 end if;
 if not coalesce((select enabled from public.vendor_order_refunds_control where singleton),false) then raise exception 'order_refunds_disabled';end if;
 perform public.vendor_order_refund_validate_v1(o.id,p_revision,p_evidence,p_inventory);
 if jsonb_typeof(p_evidence->'reviewReasons')<>'array' or exists(select 1 from jsonb_array_elements_text(p_evidence->'reviewReasons') x
  where x not in ('refund_requires_reconciliation','refund_pending','refund_action_required','refund_failed','paid_after_stock_release'))
  then raise exception 'order_refund_review_required';end if;
 if r.id is not null then
  -- Same request bytes/key only. Fresh history can prevent another POST when a
  -- previous ambiguous attempt is now discoverable by its durable request ID.
  if exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'requestId'=r.id::text)
   then raise exception 'order_refund_recovery_required';end if;
  update public.vendor_order_refund_requests set lease_token=p_token,
   lease_fence=lease_fence+case when lease_token=p_token then 0 else 1 end,
   lease_expires_at=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
  return r;
 end if;
 if exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null)
  then raise exception 'order_refund_unresolved_request';end if;
 if (select count(*) from public.vendor_order_refund_requests where order_id=o.id)>=500 then raise exception 'order_refund_limit';end if;
 if p_amount>(p_evidence->>'amountMinor')::bigint-(p_inventory->>'succeededMinor')::bigint-(p_inventory->>'pendingMinor')::bigint
  then raise exception 'order_refund_amount_unavailable';end if;
 perform public.vendor_order_refund_observe_v1(o.id,p_revision,p_evidence,p_inventory);
 select * into strict a from public.vendor_order_attempts where order_id=o.id;
 insert into public.vendor_order_refund_requests(id,order_id,actor_id,amount_minor,reason,charge_id,payment_intent_id,
  platform_account_id,connected_account_id,livemode,lease_token,lease_expires_at)
 values(p_request_id,o.id,p_actor_id,p_amount,p_reason,p_evidence->>'chargeId',a.payment_intent_id,
  a.stripe_account_id,a.connected_account_id,a.livemode,p_token,clock_timestamp()+interval '120 seconds') returning * into r;
 return r;
end;$$;

create or replace function public.vendor_order_refund_recovery_v1(p_order_id uuid,p_request_id uuid,p_token uuid)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare r public.vendor_order_refund_requests;begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_refund_invalid';end if;
 perform 1 from public.vendor_orders where id=p_order_id for update;
 select * into strict r from public.vendor_order_refund_requests where id=p_request_id and order_id=p_order_id for update;
 if r.refund_id is not null then return r;end if;
 if r.lease_token<>p_token and r.lease_expires_at>clock_timestamp() then raise exception 'order_refund_busy';end if;
 update public.vendor_order_refund_requests set lease_token=p_token,
  lease_fence=lease_fence+case when lease_token=p_token then 0 else 1 end,
  lease_expires_at=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
 return r;
end;$$;

create or replace function public.vendor_order_refund_bind_v1(p_order_id uuid,p_request_id uuid,p_token uuid,p_fence bigint,p_refund_id text,
 p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare req public.vendor_order_refund_requests;r jsonb;begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_orders where id=p_order_id for update;
 select * into strict req from public.vendor_order_refund_requests where id=p_request_id and order_id=p_order_id for update;
 perform public.vendor_order_refund_validate_v1(p_order_id,p_revision,p_evidence,p_inventory);
 if p_refund_id is null or (req.refund_id is not null and req.refund_id<>p_refund_id) then raise exception 'order_refund_binding_mismatch';end if;
 if req.refund_id is null and (p_token is null or req.lease_token<>p_token or p_fence is null or req.lease_fence<>p_fence or req.lease_expires_at<=clock_timestamp())
  then raise exception 'order_refund_lease_lost';end if;
 select value into r from jsonb_array_elements(p_inventory->'rows') where value->>'id'=p_refund_id;
 if not found or (r->>'amountMinor')::bigint<>req.amount_minor or r->>'requestId' is distinct from req.id::text
  or (r->>'createdAt')::bigint<extract(epoch from req.creation_started_at)-5
  or p_evidence->>'chargeId'<>req.charge_id then raise exception 'order_refund_binding_mismatch';end if;
 if (select count(*) from jsonb_array_elements(p_inventory->'rows') where value->>'requestId'=req.id::text)<>1
  then raise exception 'order_refund_ambiguous_match';end if;
 update public.vendor_order_refund_requests set refund_id=p_refund_id,status=r->>'status',
  last_checked_at=to_timestamp((p_evidence->>'checkedAt')::bigint) where id=req.id;
 perform public.vendor_order_refund_observe_v1(p_order_id,p_revision,p_evidence,p_inventory);
 select * into strict req from public.vendor_order_refund_requests where id=p_request_id;return req;
end;$$;

create or replace function public.vendor_order_refund_pending_v1(p_order uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendor_order_refund_requests where order_id=p_order and status in ('unbound','pending','requires_action','succeeded'));
$$;

create or replace function public.vendor_order_refund_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_REFUNDS_V1','orderId',o.id,'role',case when auth.uid()=o.owner_id then 'seller' else 'buyer' end,
  'canRequest',auth.uid()=o.owner_id and o.paid and coalesce(c.enabled,false) and not exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null),
  'totalAmountMinor',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,
  'succeededMinor',coalesce((last.inventory->>'succeededMinor')::bigint,0),'pendingMinor',coalesce((last.inventory->>'pendingMinor')::bigint,0),
  'checkedAt',last.checked_at,'uncertain',exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null),
  'requests',coalesce((select jsonb_agg(jsonb_build_object('requestId',r.id,'amountMinor',r.amount_minor,'reason',r.reason,'status',r.status,'createdAt',r.created_at,'checkedAt',r.last_checked_at) order by r.created_at desc,r.id desc)
   from (select * from public.vendor_order_refund_requests where order_id=o.id order by created_at desc,id desc limit 20) r),'[]'::jsonb))
 from public.vendor_orders o left join public.vendor_order_refunds_control c on c.singleton
 left join lateral (select * from public.vendor_order_refund_observations where order_id=o.id order by checked_at desc,recorded_at desc limit 1) last on true
 where o.id=p_order_id and auth.uid() in (o.owner_id,o.buyer_id);
$$;

-- Original fulfillment ownership/sequence rules stay exact; pending refunds add
-- a shared order-lock check to both write and participant-read availability.



-- Function grants are narrow even for tables protected by RLS.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'vendor_order_refund%_v1' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end$$;
grant execute on function public.vendor_order_refund_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';

-- Operational notification progress, never a payment or ownership ledger.
alter table public.vendor_order_reconcile_jobs
 add column if not exists requested_generation bigint not null default 0 check(requested_generation>=0),
 add column if not exists claimed_generation bigint not null default 0 check(claimed_generation>=0 and claimed_generation<=requested_generation),
 add column if not exists completed_generation bigint not null default 0 check(completed_generation>=0 and completed_generation<=requested_generation);
create table if not exists public.vendor_order_signal_associations (
 stripe_account_id text not null, connected_account_id text not null, livemode boolean not null, event_id text not null,
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 generation bigint not null check(generation>0), associated_at timestamptz not null default clock_timestamp(),
 primary key(stripe_account_id,connected_account_id,livemode,event_id), unique(order_id,generation),
 foreign key(stripe_account_id,connected_account_id,livemode,event_id)
  references public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,event_id) on delete restrict
);
alter table public.vendor_order_signal_associations enable row level security;
revoke all on public.vendor_order_signal_associations from public,anon,authenticated,service_role;
grant select on public.vendor_order_signal_associations to service_role;
drop trigger if exists vendor_order_signal_association_immutable on public.vendor_order_signal_associations;
create trigger vendor_order_signal_association_immutable before update or delete on public.vendor_order_signal_associations
 for each row execute function public.vendor_order_reconcile_event_immutable_v1();

-- Always create the lock row: a missing scope must never mean no serialization.
create or replace function public.vendor_order_notification_lock_v1(p_platform text,p_live boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 perform public.vendor_stock_require_isolation_v1();
 insert into public.vendor_order_reconcile_scopes(stripe_account_id,livemode) values(p_platform,p_live) on conflict do nothing;
 perform 1 from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
end;$$;

-- Bounded association includes old signals that arrived before immutable binding.
-- Scope -> job is also the seed/claim/finish order. No provider IO or order update.
create or replace function public.vendor_order_notification_associate_v1(p_platform text,p_live boolean,p_order uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare e record;g bigint;n integer:=0;
begin
 perform public.vendor_order_notification_lock_v1(p_platform,p_live);
 for e in select s.*,a.order_id from public.vendor_order_signals s join public.vendor_order_attempts a
  on a.stripe_account_id=s.stripe_account_id and a.connected_account_id=s.connected_account_id and a.livemode=s.livemode
  and ((s.kind='checkout' and a.session_id=s.resource_id) or (s.kind='payment_intent' and a.payment_intent_id=s.resource_id))
  where s.stripe_account_id=p_platform and s.livemode=p_live and (p_order is null or a.order_id=p_order)
  and not exists(select 1 from public.vendor_order_signal_associations x where
   (x.stripe_account_id,x.connected_account_id,x.livemode,x.event_id)=(s.stripe_account_id,s.connected_account_id,s.livemode,s.event_id))
  order by s.received_at,s.connected_account_id,s.event_id limit 100
 loop
  insert into public.vendor_order_reconcile_jobs(order_id,next_run_at) values(e.order_id,clock_timestamp()) on conflict do nothing;
  update public.vendor_order_reconcile_jobs set requested_generation=requested_generation+1,
   next_run_at=least(next_run_at,clock_timestamp()) where order_id=e.order_id returning requested_generation into g;
  insert into public.vendor_order_signal_associations(stripe_account_id,connected_account_id,livemode,event_id,order_id,generation)
   values(e.stripe_account_id,e.connected_account_id,e.livemode,e.event_id,e.order_id,g);
  n:=n+1;
 end loop;
 return n;
end;$$;

-- Includes unassociated signals: neither batching nor pre-binding delay can
-- allow new fulfillment on stale payment state. Used only inside private readers.
create or replace function public.vendor_order_notification_pending_v1(p_order uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendor_order_reconcile_jobs where order_id=p_order and requested_generation>completed_generation)
 or exists(select 1 from public.vendor_order_attempts a join public.vendor_order_signals s
  on a.stripe_account_id=s.stripe_account_id and a.connected_account_id=s.connected_account_id and a.livemode=s.livemode
  and ((s.kind='checkout' and a.session_id=s.resource_id) or (s.kind='payment_intent' and a.payment_intent_id=s.resource_id))
  where a.order_id=p_order and not exists(select 1 from public.vendor_order_signal_associations x where
   (x.stripe_account_id,x.connected_account_id,x.livemode,x.event_id)=(s.stripe_account_id,s.connected_account_id,s.livemode,s.event_id)));
$$;














-- Helpers are not new RPC authority; existing service/participant grants remain.
revoke all on function public.vendor_order_notification_lock_v1(text,boolean),
 public.vendor_order_notification_associate_v1(text,boolean,uuid),public.vendor_order_notification_pending_v1(uuid)
 from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

-- Retained review and consent only. Never clears financial holds or changes stock.

create table if not exists public.vendor_order_resolutions_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_resolutions_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_resolution_cases (
 id uuid primary key, order_id uuid not null references public.vendor_orders(id) on delete restrict,
 terms_version text not null check(terms_version='continue-original-order-after-failed-refund-v1'),
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 evidence_hash text not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(order_id,evidence_hash) references public.vendor_order_refund_observations(order_id,evidence_hash) on delete restrict
);
create index if not exists vendor_order_resolution_cases_order on public.vendor_order_resolution_cases(order_id,created_at,id);
create table if not exists public.vendor_order_resolution_events (
 id uuid primary key, case_id uuid not null references public.vendor_order_resolution_cases(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 sequence integer not null check(sequence between 1 and 8),
 action text not null check(action in ('request','agree','decline','withdraw','accept','reject')),
 actor_role text not null check(actor_role in ('seller','buyer','operator')),
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(), unique(case_id,sequence),
 check((sequence=1)=(action='request')),
 check((action='request' and actor_role='seller') or (action in ('agree','decline') and actor_role='buyer')
  or (action in ('accept','reject') and actor_role='operator') or (action='withdraw' and actor_role in ('seller','buyer')))
);
do $$declare n text;begin
 foreach n in array array['vendor_order_resolutions_control','vendor_order_resolution_cases','vendor_order_resolution_events'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;
create or replace function public.vendor_order_resolution_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_resolution_history_retained';end;$$;
drop trigger if exists vendor_order_resolution_immutable on public.vendor_order_resolution_cases;
create trigger vendor_order_resolution_immutable before update or delete on public.vendor_order_resolution_cases
 for each row execute function public.vendor_order_resolution_immutable_v1();
drop trigger if exists vendor_order_resolution_immutable on public.vendor_order_resolution_events;
create trigger vendor_order_resolution_immutable before update or delete on public.vendor_order_resolution_events
 for each row execute function public.vendor_order_resolution_immutable_v1();

create or replace function public.vendor_order_resolution_operator_v1(p_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_entitlements where user_id=p_actor and is_active
  and tier='founder_admin' and role in ('founder','internal') and features->'order_resolution_operator'='true'::jsonb);
$$;
-- Deliberately excludes volatile observation timestamps and order revision.
-- A changed refund request/outcome, historical hold, notification generation or
-- physical progress invalidates positive responses, even after a clean later check.
create or replace function public.vendor_order_resolution_basis_v1(p_order uuid) returns text
language sql stable security definer set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_object('paid',o.paid,'review',o.review_reasons,'stock',r.state,
  'amount',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,'mode',o.fulfillment,
  'intent',a.payment_intent_id,'generation',coalesce(j.requested_generation,0),
  'pending',public.vendor_order_notification_pending_v1(o.id),
  'fulfillment',coalesce((select max(sequence) from public.vendor_order_fulfillment_events where order_id=o.id),0),
  'requests',coalesce((select jsonb_agg(jsonb_build_array(id,refund_id,status,amount_minor) order by id)
   from public.vendor_order_refund_requests where order_id=o.id),'[]'::jsonb),
  'inventory',(select inventory from public.vendor_order_refund_observations where order_id=o.id order by checked_at desc,recorded_at desc,evidence_hash desc limit 1),
  'holds',coalesce((select jsonb_agg(jsonb_build_array(reason,reference_id) order by reason,reference_id)
   from public.vendor_account_financial_holds where owner_id=o.owner_id),'[]'::jsonb))::text,'UTF8')),'hex')
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 join public.vendor_order_attempts a on a.order_id=o.id left join public.vendor_order_reconcile_jobs j on j.order_id=o.id where o.id=p_order;
$$;

create or replace function public.vendor_order_resolution_request_v1(
 p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb,p_disputes jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;c public.vendor_order_resolution_cases;
 b text;h text;t timestamptz;v_terms constant text:='continue-original-order-after-failed-refund-v1';
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_actor_id is null or p_request_id is null then raise exception 'order_resolution_invalid';end if;
 select x.* into a from public.vendor_order_attempts x join public.vendor_orders y on y.id=x.order_id where y.id=p_order_id and y.owner_id=p_actor_id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 select * into c from public.vendor_order_resolution_cases where id=p_request_id;
 if found then
  if c.order_id<>o.id then raise exception 'order_resolution_conflict';end if;
  return c.id; -- Same request always recovers its immutable original terms.
 end if;
 if not coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false) then raise exception 'order_resolutions_disabled';end if;
 if exists(select 1 from public.vendor_order_resolution_events where id=p_request_id) then raise exception 'order_resolution_conflict';end if;
 if (select count(*) from public.vendor_order_resolution_cases where order_id=o.id)>=20 or exists(
  select 1 from public.vendor_order_resolution_cases x join lateral
   (select action from public.vendor_order_resolution_events where case_id=x.id order by sequence desc limit 1) e on true
   where x.order_id=o.id and e.action in ('request','agree','accept')) then raise exception 'order_resolution_conflict';end if;
 perform public.vendor_order_refund_validate_v1(o.id,p_revision,p_evidence,p_inventory);
 if not o.paid or (select state from public.vendor_stock_reservations where id=o.reservation_id)<>'consumed'
  or public.vendor_order_notification_pending_v1(o.id)
  or exists(select 1 from public.vendor_order_fulfillment_events where order_id=o.id)
  or not o.review_reasons <@ array['refund_requires_reconciliation','refund_failed']::text[]
  or exists(select 1 from jsonb_array_elements_text(p_evidence->'reviewReasons') x where x not in ('refund_requires_reconciliation','refund_failed'))
  or p_disputes is distinct from '{"complete":true,"rows":[],"reviewReasons":[]}'::jsonb
  or jsonb_array_length(p_inventory->'rows')=0 or (p_inventory->>'succeededMinor')::bigint<>0 or (p_inventory->>'pendingMinor')::bigint<>0
  or exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'status' not in ('failed','canceled'))
  or exists(select 1 from public.vendor_order_refund_requests q where q.order_id=o.id and (q.refund_id is null or q.status not in ('failed','canceled')
   or not exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'id'=q.refund_id and x->>'status'=q.status and (x->>'amountMinor')::bigint=q.amount_minor)))
  then raise exception 'order_resolution_not_ready';end if;
 perform public.vendor_order_refund_observe_v1(o.id,p_revision,p_evidence,p_inventory);
 b:=public.vendor_order_resolution_basis_v1(o.id);
 h:=encode(sha256(convert_to(jsonb_build_array(v_terms,o.id,b)::text,'UTF8')),'hex');t:=clock_timestamp();
 insert into public.vendor_order_resolution_cases(id,order_id,terms_version,basis_hash,terms_hash,evidence_hash,created_at)
  values(p_request_id,o.id,v_terms,b,h,p_evidence->>'evidenceHash',t);
 insert into public.vendor_order_resolution_events(id,case_id,actor_id,sequence,action,actor_role,terms_hash,recorded_at)
  values(p_request_id,p_request_id,p_actor_id,1,'request','seller',h,t);
 return p_request_id;
end;$$;

create or replace function public.vendor_order_resolution_record_v1(
 p_order_id uuid,p_case_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_sequence integer,p_action text,p_terms_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;c public.vendor_order_resolution_cases;
 e public.vendor_order_resolution_events;previous public.vendor_order_resolution_events;v_role text;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_case_id is null or p_actor_id is null or p_request_id is null or p_expected_sequence is null
  or p_expected_sequence not between 1 and 7 or p_action is null or p_action not in ('agree','decline','withdraw','accept','reject')
  or p_terms_hash is null or p_terms_hash !~ '^[a-f0-9]{64}$' then raise exception 'order_resolution_invalid';end if;
 select * into o from public.vendor_orders where id=p_order_id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 v_role:=case when p_actor_id=o.owner_id then 'seller' when p_actor_id=o.buyer_id then 'buyer'
  when public.vendor_order_resolution_operator_v1(p_actor_id) then 'operator' else null end;
 if v_role is null then raise exception 'order_resolution_unavailable';end if;
 select * into strict a from public.vendor_order_attempts where order_id=o.id;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 perform 1 from public.vendor_orders where id=o.id for update;
 if v_role='operator' then
  perform 1 from public.user_entitlements where user_id=p_actor_id and is_active and tier='founder_admin'
   and role in ('founder','internal') and features->'order_resolution_operator'='true'::jsonb for share;
  if not found then raise exception 'order_resolution_unavailable';end if;
 end if;
 select * into c from public.vendor_order_resolution_cases where id=p_case_id and order_id=o.id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 if c.terms_hash<>p_terms_hash then raise exception 'order_resolution_conflict';end if;
 select * into e from public.vendor_order_resolution_events where id=p_request_id;
 if found then
  if row(e.case_id,e.actor_id,e.sequence,e.action,e.actor_role,e.terms_hash) is distinct from
   row(c.id,p_actor_id,p_expected_sequence+1,p_action,v_role,p_terms_hash) then raise exception 'order_resolution_conflict';end if;
  return e.case_id;
 end if;
 if not coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false) then raise exception 'order_resolutions_disabled';end if;
 select * into strict previous from public.vendor_order_resolution_events where case_id=c.id order by sequence desc limit 1;
 if previous.sequence<>p_expected_sequence then raise exception 'order_resolution_conflict';end if;
 if not ((v_role='buyer' and previous.action='request' and p_action in ('agree','decline'))
  or (v_role='buyer' and previous.action in ('agree','accept') and p_action='withdraw')
  or (v_role='seller' and previous.action in ('request','agree','accept') and p_action='withdraw')
  or (v_role='operator' and previous.action='agree' and p_action in ('accept','reject')))
  then raise exception 'order_resolution_conflict';end if;
 if p_action in ('agree','accept') and (public.vendor_order_notification_pending_v1(o.id)
  or public.vendor_order_resolution_basis_v1(o.id) is distinct from c.basis_hash) then raise exception 'order_resolution_changed';end if;
 insert into public.vendor_order_resolution_events(id,case_id,actor_id,sequence,action,actor_role,terms_hash)
  values(p_request_id,c.id,p_actor_id,previous.sequence+1,p_action,v_role,p_terms_hash);
 return c.id;
end;$$;

create or replace function public.vendor_order_resolution_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_RESOLUTIONS_V1','orderId',o.id,
  'role',case when auth.uid()=o.owner_id then 'seller' when auth.uid()=o.buyer_id then 'buyer' else 'operator' end,
  'writesEnabled',coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false),
  'canRequest',auth.uid()=o.owner_id and coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false)
   and o.paid and not exists(select 1 from public.vendor_order_fulfillment_events where order_id=o.id)
   and (select count(*) from public.vendor_order_resolution_cases where order_id=o.id)<20
   and not exists(select 1 from public.vendor_order_resolution_cases x join lateral
    (select action from public.vendor_order_resolution_events where case_id=x.id order by sequence desc limit 1) e on true
    where x.order_id=o.id and e.action in ('request','agree','accept')),
  'clearsFinancialHolds',false,'permitsFulfillment',false,
  'cases',coalesce((select jsonb_agg(jsonb_build_object('caseId',c.id,'termsVersion',c.terms_version,'termsHash',c.terms_hash,
   'totalAmountMinor',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,
   'createdAt',c.created_at,'basisCurrent',not public.vendor_order_notification_pending_v1(o.id) and c.basis_hash=public.vendor_order_resolution_basis_v1(o.id),
   'sequence',last.sequence,'state',case last.action when 'request' then 'requested' when 'agree' then 'agreed' when 'decline' then 'declined'
    when 'withdraw' then 'withdrawn' when 'accept' then 'accepted' when 'reject' then 'rejected' end,
   'events',(select jsonb_agg(jsonb_build_object('requestId',e.id,'sequence',e.sequence,'action',e.action,'role',e.actor_role,'recordedAt',e.recorded_at) order by e.sequence)
    from public.vendor_order_resolution_events e where e.case_id=c.id)) order by c.created_at desc,c.id)
   from (select * from public.vendor_order_resolution_cases where order_id=o.id order by created_at desc,id limit 20) c
   join lateral(select * from public.vendor_order_resolution_events where case_id=c.id order by sequence desc limit 1) last on true),'[]'::jsonb))
 from public.vendor_orders o where o.id=p_order_id and (auth.uid() in(o.owner_id,o.buyer_id) or public.vendor_order_resolution_operator_v1(auth.uid()));
$$;
do $$declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'vendor_order_resolution_%_v1' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
 end loop;
end$$;
grant execute on function public.vendor_order_resolution_request_v1(uuid,uuid,uuid,bigint,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.vendor_order_resolution_record_v1(uuid,uuid,uuid,uuid,integer,text,text) to service_role;
grant execute on function public.vendor_order_resolution_status_v1(uuid) to authenticated;

-- Private future-stock planning. No publication, reservations, orders or payments.

create table if not exists public.vendor_preorders (
  id uuid primary key,
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null default '' check (length(description)<=2000),
  expected_date date not null check (isfinite(expected_date)),
  price_cents integer not null check (price_cents between 1 and 100000000),
  currency text not null default 'USD' check (currency='USD'),
  allocation_limit integer not null check (allocation_limit between 1 and 100000),
  payment_mode text not null check (payment_mode in ('reservation','full','deposit')),
  deposit_cents integer,
  terms text not null check (length(btrim(terms)) between 1 and 4000),
  status text not null default 'draft' check (status in ('draft','archived')),
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_preorders_deposit check (
    (payment_mode='deposit' and deposit_cents is not null and deposit_cents>0 and deposit_cents<price_cents)
    or (payment_mode in ('reservation','full') and deposit_cents is null))
);
create index if not exists vendor_preorders_store_idx on public.vendor_preorders(store_id,updated_at desc,id);
alter table public.vendor_preorders enable row level security;
revoke all on public.vendor_preorders from public,anon,authenticated,service_role;
grant select on public.vendor_preorders to authenticated,service_role;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='vendor_preorders' and policyname='vendor_preorders_owner_read') then
    create policy vendor_preorders_owner_read on public.vendor_preorders for select to authenticated
      using (exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));
  end if;
end $$;

create or replace function public.vendor_preorders_owner_v1(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select id into sid from public.vendor_stores where owner_id=auth.uid();
  select coalesce(jsonb_agg(to_jsonb(p)-'store_id'),'[]'::jsonb) into result from
    (select * from public.vendor_preorders where store_id=sid order by updated_at desc,id limit 25 offset p_offset) p;
  return jsonb_build_object('items',result,'total',(select count(*) from public.vendor_preorders where store_id=sid));
end $$;

create or replace function public.vendor_preorders_save_v1(p_id uuid,p_version integer,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid; current_row public.vendor_preorders; candidate public.vendor_preorders; same_terms boolean;
begin
  if auth.uid() is null or not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  if p_id is null or p_version is null or p_version<0 or jsonb_typeof(p_data) is distinct from 'object'
    then raise exception 'Invalid preorder' using errcode='22023'; end if;
  select id into sid from public.vendor_stores where owner_id=auth.uid() for update;
  if sid is null then raise exception 'Create your store first' using errcode='22023'; end if;
  -- JSON conversion cannot set ownership, timestamps, version or currency.
  select * into candidate from jsonb_populate_record(null::public.vendor_preorders,p_data);
  candidate.title:=btrim(candidate.title); candidate.description:=btrim(coalesce(candidate.description,'')); candidate.terms:=btrim(candidate.terms);
  select * into current_row from public.vendor_preorders where id=p_id for update;
  if found then
    if current_row.store_id<>sid then raise exception 'Preorder unavailable' using errcode='42501'; end if;
    same_terms:= (to_jsonb(current_row)-array['id','store_id','currency','created_at','updated_at','version'])
      = (to_jsonb(candidate)-array['id','store_id','currency','created_at','updated_at','version']);
    -- A retried successful save returns the same row, without incrementing twice.
    if current_row.version=p_version+1 and same_terms then return to_jsonb(current_row)-'store_id'; end if;
    if current_row.version<>p_version then raise exception 'Preorder changed. Reload before editing.' using errcode='PT409'; end if;
    update public.vendor_preorders set title=candidate.title,description=candidate.description,expected_date=candidate.expected_date,
      price_cents=candidate.price_cents,allocation_limit=candidate.allocation_limit,payment_mode=candidate.payment_mode,
      deposit_cents=candidate.deposit_cents,terms=candidate.terms,status=candidate.status,version=version+1,updated_at=now()
      where id=p_id returning * into current_row;
  else
    if p_version<>0 then raise exception 'Preorder unavailable' using errcode='22023'; end if;
    if (select count(*) from public.vendor_preorders where store_id=sid)>=1000 then raise exception 'Preorder draft limit reached' using errcode='22023'; end if;
    insert into public.vendor_preorders(id,store_id,title,description,expected_date,price_cents,allocation_limit,payment_mode,deposit_cents,terms,status)
      values(p_id,sid,candidate.title,candidate.description,candidate.expected_date,candidate.price_cents,candidate.allocation_limit,
        candidate.payment_mode,candidate.deposit_cents,candidate.terms,candidate.status) returning * into current_row;
  end if;
  return to_jsonb(current_row)-'store_id';
end $$;
revoke all on function public.vendor_preorders_owner_v1(integer),public.vendor_preorders_save_v1(uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vendor_preorders_owner_v1(integer),public.vendor_preorders_save_v1(uuid,integer,jsonb) to authenticated;
comment on table public.vendor_preorders is 'Private preorder planning; payment_mode is a vendor preference, never payment or reservation evidence. No owned inventory is created.';

-- Optimistic edit conflicts are HTTP 409, not retryable transaction failures.

-- One immutable request and one allocated GVVI per physical scan item. Preparation
-- creates an archived hold copy; only finalization admits it to active inventory.
create table if not exists public.vendor_batch_intake_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into public.vendor_batch_intake_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_batch_intake_receipts (
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 batch_id uuid not null,
 item_id uuid not null,
 instance_id uuid not null unique references public.vault_item_instances(id) on delete restrict,
 request jsonb not null check(jsonb_typeof(request)='object'),
 prepared_at timestamptz not null default now(),
 completed_at timestamptz,
 primary key(owner_id,store_id,batch_id,item_id)
);
alter table public.vendor_batch_intake_control enable row level security;
alter table public.vendor_batch_intake_receipts enable row level security;
revoke all on public.vendor_batch_intake_control,public.vendor_batch_intake_receipts from public,anon,authenticated,service_role;
grant select,update on public.vendor_batch_intake_control to service_role;
grant select on public.vendor_batch_intake_receipts to authenticated,service_role;
drop policy if exists vendor_batch_intake_owner_read on public.vendor_batch_intake_receipts;
create policy vendor_batch_intake_owner_read on public.vendor_batch_intake_receipts for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

create or replace function public.vendor_batch_intake_access_v1(p_owner uuid,p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_stores where id=p_store and owner_id=p_owner for update;
 if not found or not exists(select 1 from public.vendor_batch_intake_control where enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(p_owner)->>'store_app')::boolean,false)
 then raise exception 'Batch adding unavailable' using errcode='42501';end if;
end; $$;

create or replace function public.vendor_batch_intake_validate_v1(p_owner uuid,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare c uuid; p uuid; section uuid; amount numeric;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or p_data->'version' is distinct from '1'::jsonb
  or jsonb_typeof(p_data->'list') is distinct from 'boolean'
  or not (p_data ?& array['batch_id','item_id','card_id','printing_id','condition','intent','amount','currency','sections','location','front_sha256','back_sha256'])
  or (p_data - array['version','batch_id','item_id','card_id','printing_id','condition','intent','amount','currency','sections','location','list','front_sha256','back_sha256'])<>'{}'::jsonb
 then raise exception 'Invalid batch request' using errcode='22023';end if;
 perform (p_data->>'batch_id')::uuid,(p_data->>'item_id')::uuid;
 c:=(p_data->>'card_id')::uuid;p:=(p_data->>'printing_id')::uuid;
 if c is null or p is null or coalesce(p_data->>'condition','') not in('NM','LP','MP','HP','DMG')
  or coalesce(p_data->>'intent','') not in('hold','sell')
  or jsonb_typeof(p_data->'amount') is distinct from 'string'
  or (p_data->>'amount'<>'' and p_data->>'amount' !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
  or coalesce(p_data->>'currency','') !~ '^[A-Z]{3}$'
  or jsonb_typeof(p_data->'location') is distinct from 'string' or length(p_data->>'location')>120
  or jsonb_typeof(p_data->'sections') is distinct from 'array'
  or coalesce(p_data->>'front_sha256','') !~ '^[0-9a-f]{64}$'
  or (p_data->'back_sha256'<>'null'::jsonb and coalesce(p_data->>'back_sha256','') !~ '^[0-9a-f]{64}$')
 then raise exception 'Invalid copy details' using errcode='22023';end if;
 if jsonb_array_length(p_data->'sections')>50 then raise exception 'Too many sections' using errcode='22023';end if;
 amount:=nullif(p_data->>'amount','')::numeric;
 if amount>99999999 or (p_data->>'intent'='sell' and coalesce(amount,0)<=0)
  or ((p_data->>'list')::boolean and p_data->>'intent'<>'sell')
 then raise exception 'Invalid asking price' using errcode='22023';end if;
 if not public.catalog_card_print_visible_to_request_v1(c)
  or not exists(select 1 from public.card_prints cp
   left join public.sets st on st.id=cp.set_id left join public.catalog_set_release_controls sc on sc.set_id=st.id
   left join public.games g on g.id=cp.game_id
   where cp.id=c and nullif(cp.gv_id,'') is not null and case when sc.set_id is not null then sc.release_status='public'
    else lower(coalesce(st.game,g.code,''))='pokemon' or exists(select 1 from public.catalog_game_release_controls gc
     where lower(gc.game_code)=lower(coalesce(st.game,g.code,'')) and gc.release_status='public') end)
  or not exists(select 1 from public.get_public_card_printing_options_v1(array[c],1000,0) o
   where o.id=p and o.card_print_id=c and nullif(o.printing_gv_id,'') is not null)
 then raise exception 'Card or printing is no longer available' using errcode='22023';end if;
 for section in select value::uuid from jsonb_array_elements_text(p_data->'sections') loop
  perform 1 from public.wall_sections where id=section and user_id=p_owner and is_active for share;
  if not found then raise exception 'Section unavailable' using errcode='42501';end if;
 end loop;
 if p_data->>'intent'='sell' and not exists(select 1 from public.public_profiles where user_id=p_owner
  and public_profile_enabled and vault_sharing_enabled and nullif(slug,'') is not null and nullif(display_name,'') is not null)
 then raise exception 'Enable public profile and Vault sharing before adding sale copies' using errcode='22023';end if;
end; $$;

create or replace function public.vendor_batch_intake_prepare_v1(p_owner uuid,p_store uuid,p_data jsonb)
returns public.vendor_batch_intake_receipts language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 if exists(select 1 from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store
  and batch_id=(p_data->>'batch_id')::uuid and item_id=(p_data->>'item_id')::uuid)
 then raise exception 'This submission was cancelled. Review a new attempt to add this copy.' using errcode='PT409';end if;
 return public.vendor_batch_intake_prepare_base_v1(p_owner,p_store,p_data);
end $$;

create or replace function public.vendor_batch_intake_finish_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 if exists(select 1 from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item)
 then raise exception 'This submission was cancelled. Review a new attempt to add this copy.' using errcode='PT409';end if;
 return public.vendor_batch_intake_finish_base_v1(p_owner,p_store,p_batch,p_item);
end $$;
revoke all on function public.vendor_batch_intake_access_v1(uuid,uuid),public.vendor_batch_intake_validate_v1(uuid,jsonb),
 public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';

-- Preserve market-mode null pricing metadata for private copies with no asking price.
create or replace function public.vendor_batch_intake_finish_base_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; c public.card_prints;
 anchor uuid; section uuid; front text; back text; reason text;
begin
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item for update;
 if not found then raise exception 'Submission unavailable' using errcode='42501';end if;
 select * into v from public.vault_item_instances where id=r.instance_id for update;
 if v.user_id is distinct from p_owner then raise exception 'Copy unavailable' using errcode='42501';end if;
 if r.completed_at is not null then return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);end if;
 if v.archived_at is null or v.intent<>'hold' or v.legacy_vault_item_id is not null
  or v.card_print_id is distinct from (r.request->>'card_id')::uuid
  or v.card_printing_id is distinct from (r.request->>'printing_id')::uuid
 then raise exception 'Prepared copy changed' using errcode='PT409';end if;
 perform public.vendor_batch_intake_validate_v1(p_owner,r.request);
 front:=p_owner::text||'/vault-instances/'||v.id::text||'/front/current';
 if r.request->>'back_sha256' is not null then back:=p_owner::text||'/vault-instances/'||v.id::text||'/back/current';end if;
 -- The service checks byte hashes and decoding before calling this RPC. Storage
 -- is private; neither an owner RPC nor a caller-provided URL can attach media.
 if not exists(select 1 from storage.objects where bucket_id='user-card-images' and name=front)
  or (back is not null and not exists(select 1 from storage.objects where bucket_id='user-card-images' and name=back))
 then raise exception 'Upload both required scans before finishing' using errcode='22023';end if;
 select * into strict c from public.card_prints where id=v.card_print_id;
 select id into anchor from public.vault_items where user_id=p_owner and card_id=c.id and archived_at is null order by created_at desc,id desc limit 1 for update;
 if anchor is null then
  insert into public.vault_items(user_id,card_id,gv_id,qty,name,condition_label)
   values(p_owner,c.id,c.gv_id,1,c.name,r.request->>'condition') returning id into anchor;
 else update public.vault_items set qty=qty+1 where id=anchor;end if;
 update public.vault_item_instances set archived_at=null,legacy_vault_item_id=anchor,
  condition_label=r.request->>'condition',intent=r.request->>'intent',
  pricing_mode=case when r.request->>'amount'='' then 'market' else 'asking' end,
  asking_price_amount=nullif(r.request->>'amount','')::numeric,asking_price_currency=case when r.request->>'amount'='' then null else r.request->>'currency' end,
  notes=nullif(r.request->>'location',''),image_source='user_photo',image_url=front,
  image_back_source=case when back is null then null else 'user_photo' end,image_back_url=back,image_display_mode='uploaded'
 where id=v.id;
 for section in select distinct value::uuid from jsonb_array_elements_text(r.request->'sections') loop
  insert into public.wall_section_memberships(section_id,vault_item_instance_id) values(section,v.id) on conflict do nothing;
 end loop;
 if (r.request->>'list')::boolean then
  reason:=public.vendor_store_copy_reason_v1(p_owner,v.id);
  if reason is not null then raise exception '%',reason using errcode='22023';end if;
  insert into public.vendor_store_items(store_id,instance_id) values(p_store,v.id);
 end if;
 update public.vendor_batch_intake_receipts set completed_at=now() where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item;
 return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);
end; $$;
notify pgrst,'reload schema';

-- Tombstones also cover a prepare request whose HTTP response was lost or whose
-- transaction has not arrived yet. Old tabs/backups can never revive this item.
create table if not exists public.vendor_batch_intake_cancellations (
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 batch_id uuid not null,
 item_id uuid not null,
 cancelled_at timestamptz not null default now(),
 primary key(owner_id,store_id,batch_id,item_id)
);
alter table public.vendor_batch_intake_cancellations enable row level security;
revoke all on public.vendor_batch_intake_cancellations from public,anon,authenticated,service_role;
grant select on public.vendor_batch_intake_cancellations to authenticated,service_role;
drop policy if exists vendor_batch_cancellation_owner_read on public.vendor_batch_intake_cancellations;
create policy vendor_batch_cancellation_owner_read on public.vendor_batch_intake_cancellations for select to authenticated
 using(owner_id=auth.uid() and exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));

-- Keep the already-proven allocation and admission bodies byte-for-byte. Only
-- the service entry points gain the serialized cancellation boundary.
-- Final base functions are created directly by the consolidated release.
create or replace function public.vendor_batch_intake_prepare_base_v1(p_owner uuid,p_store uuid,p_data jsonb) returns public.vendor_batch_intake_receipts
language plpgsql security definer set search_path='' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; c public.card_prints; b uuid; i uuid;
begin
 -- Store lock serializes same-item requests and the 50-copy bound. Server derives owner.
 perform public.vendor_batch_intake_access_v1(p_owner,p_store);
 b:=(p_data->>'batch_id')::uuid;i:=(p_data->>'item_id')::uuid;
 if b is null or i is null then raise exception 'Invalid batch identity' using errcode='22023';end if;
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=b and item_id=i for update;
 if found then
  if r.request is distinct from p_data then raise exception 'This copy already has a different submission. Resume its saved request.' using errcode='PT409';end if;
  return r;
 end if;
 if (select count(*) from public.vendor_batch_intake_receipts existing_receipt where existing_receipt.owner_id=p_owner and existing_receipt.store_id=p_store and existing_receipt.batch_id=b
  and not exists(select 1 from public.vendor_batch_intake_cancellations x where x.owner_id=existing_receipt.owner_id and x.store_id=existing_receipt.store_id and x.batch_id=existing_receipt.batch_id and x.item_id=existing_receipt.item_id))>=50
 then raise exception 'Batch limit reached' using errcode='22023';end if;
 perform public.vendor_batch_intake_validate_v1(p_owner,p_data);
 select * into strict c from public.card_prints where id=(p_data->>'card_id')::uuid;
 v:=public.admin_vault_instance_create_v1(p_user_id=>p_owner,p_card_print_id=>c.id,
  p_card_printing_id=>(p_data->>'printing_id')::uuid,p_condition_label=>p_data->>'condition',
  p_name=>c.name,p_archived_at=>now());
 insert into public.vendor_batch_intake_receipts(owner_id,store_id,batch_id,item_id,instance_id,request)
 values(p_owner,p_store,b,i,v.id,p_data) returning * into r;
 return r;
end; $$;


revoke all on function public.vendor_batch_intake_prepare_base_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_base_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;





create or replace function public.vendor_batch_intake_cancel_v1(p_owner uuid,p_store uuid,p_batch uuid,p_item uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare r public.vendor_batch_intake_receipts; v public.vault_item_instances; stamp timestamptz;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_owner is null or p_store is null or p_batch is null or p_item is null then raise exception 'Invalid submission' using errcode='22023';end if;
 -- Owners retain cancellation even after downgrade or rollout suspension.
 perform 1 from public.vendor_stores where id=p_store and owner_id=p_owner for update;
 if not found then raise exception 'Store unavailable' using errcode='42501';end if;
 select * into r from public.vendor_batch_intake_receipts where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item for update;
 if found then
  select * into v from public.vault_item_instances where id=r.instance_id for update;
  if v.user_id is distinct from p_owner then raise exception 'Copy unavailable' using errcode='42501';end if;
  if r.completed_at is not null then
   return jsonb_build_object('cancelled',false,'completed',true,'batch_id',p_batch,'item_id',p_item,'id',v.id,'gvvi',v.gv_vi_id);
  end if;
  if v.archived_at is null or v.intent<>'hold' or v.legacy_vault_item_id is not null
   then raise exception 'Prepared copy changed; cancellation unavailable' using errcode='PT409';end if;
 end if;
 insert into public.vendor_batch_intake_cancellations(owner_id,store_id,batch_id,item_id)
 values(p_owner,p_store,p_batch,p_item) on conflict do nothing;
 select cancelled_at into strict stamp from public.vendor_batch_intake_cancellations where owner_id=p_owner and store_id=p_store and batch_id=p_batch and item_id=p_item;
 return jsonb_build_object('cancelled',true,'completed',false,'batch_id',p_batch,'item_id',p_item,'cancelled_at',stamp);
end $$;
revoke all on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid),public.vendor_batch_intake_cancel_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_batch_intake_prepare_v1(uuid,uuid,jsonb),public.vendor_batch_intake_finish_v1(uuid,uuid,uuid,uuid),public.vendor_batch_intake_cancel_v1(uuid,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';

-- Shared admission for production scan workers. Disabled until a separately
-- verified reference release is bound. These are resource controls, not billing.
create table public.vendor_scan_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  global_concurrency integer not null default 4 check(global_concurrency between 1 and 16),
  per_minute integer not null default 50 check(per_minute between 1 and 120),
  per_day integer not null default 2000 check(per_day between 1 and 10000),
  database_ref text,
  artifact_sha256 text,
  metadata_sha256 text,
  feature_manifest_sha256 text,
  check (not enabled or (database_ref = 'ycdxbpibncqcchqiihfz'
    and artifact_sha256 ~ '^[0-9a-f]{64}$'
    and metadata_sha256 ~ '^[0-9a-f]{64}$'
    and feature_manifest_sha256 ~ '^[0-9a-f]{64}$'
    and database_ref is not null and artifact_sha256 is not null
    and metadata_sha256 is not null and feature_manifest_sha256 is not null))
);
insert into public.vendor_scan_control(singleton) values(true);
create table public.vendor_scan_usage (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null check(minute_count >= 0),
  day_start timestamptz not null,
  day_count integer not null check(day_count >= 0)
);
create table public.vendor_scan_leases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.vendor_scan_control enable row level security;
alter table public.vendor_scan_usage enable row level security;
alter table public.vendor_scan_leases enable row level security;
revoke all on public.vendor_scan_control,public.vendor_scan_usage,public.vendor_scan_leases from public,anon,authenticated,service_role;
grant select,update on public.vendor_scan_control to service_role;
grant select on public.vendor_scan_usage,public.vendor_scan_leases to service_role;

create function public.vendor_scan_acquire_v1(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctl public.vendor_scan_control; usage public.vendor_scan_usage;
  t timestamptz; minute_key timestamptz; day_key timestamptz; lease uuid;
begin
  -- One singleton lock serializes grants across all server instances. Check the
  -- clock after acquiring it so expiry/rate windows do not use a stale instant.
  select * into ctl from public.vendor_scan_control where singleton for update;
  if not found or not ctl.enabled then return null; end if;
  if p_owner is null or not exists(select 1 from public.vendor_stores where owner_id=p_owner)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    or not coalesce((public.vendor_store_capabilities_v1(p_owner)->>'store_app')::boolean,false)
  then return null; end if;
  t := clock_timestamp(); minute_key := date_trunc('minute',t); day_key := date_trunc('day',t at time zone 'UTC') at time zone 'UTC';
  delete from public.vendor_scan_leases where expires_at <= t;
  if exists(select 1 from public.vendor_scan_leases where owner_id=p_owner)
    or (select count(*) from public.vendor_scan_leases) >= ctl.global_concurrency then return null; end if;
  select * into usage from public.vendor_scan_usage where owner_id=p_owner;
  if found and ((usage.minute_start=minute_key and usage.minute_count>=ctl.per_minute)
    or (usage.day_start=day_key and usage.day_count>=ctl.per_day)) then return null; end if;
  insert into public.vendor_scan_usage(owner_id,minute_start,minute_count,day_start,day_count)
    values(p_owner,minute_key,1,day_key,1)
    on conflict(owner_id) do update set minute_start=excluded.minute_start,
      minute_count=case when vendor_scan_usage.minute_start=excluded.minute_start then vendor_scan_usage.minute_count+1 else 1 end,
      day_start=excluded.day_start,
      day_count=case when vendor_scan_usage.day_start=excluded.day_start then vendor_scan_usage.day_count+1 else 1 end;
  -- Long enough for the 45s HTTP/worker budget; crashes recover without a job.
  insert into public.vendor_scan_leases(owner_id,expires_at) values(p_owner,t+interval '60 seconds') returning id into lease;
  return jsonb_build_object('lease',lease,'database_ref',ctl.database_ref,
    'artifact_sha256',ctl.artifact_sha256,'metadata_sha256',ctl.metadata_sha256,
    'feature_manifest_sha256',ctl.feature_manifest_sha256);
end; $$;
create function public.vendor_scan_release_v1(p_lease uuid) returns void
language sql security definer set search_path='' as $$
  delete from public.vendor_scan_leases where id=p_lease;
$$;
revoke all on function public.vendor_scan_acquire_v1(uuid),public.vendor_scan_release_v1(uuid) from public,anon,authenticated;
grant execute on function public.vendor_scan_acquire_v1(uuid),public.vendor_scan_release_v1(uuid) to service_role;
commit;
