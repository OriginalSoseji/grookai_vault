-- Owner-controlled, email-bound manager invitations. No automatic grants.
begin;
create table public.vendor_store_team_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_store_team_control values(true,false);
create table public.vendor_store_team_members (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permissions text[] not null check(cardinality(permissions) between 1 and 4 and permissions <@ array['inventory','pricing','listings','branding']::text[] and array_position(permissions,null) is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(store_id,user_id)
);
create table public.vendor_store_team_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  email text not null check(email=lower(btrim(email)) and length(email) between 3 and 254),
  token_hash bytea not null unique,
  permissions text[] not null check(cardinality(permissions) between 1 and 4 and permissions <@ array['inventory','pricing','listings','branding']::text[] and array_position(permissions,null) is null),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index vendor_store_team_invites_store_idx on public.vendor_store_team_invites(store_id,created_at);
-- Presentation scope only. It carries no duplicate ownership, price or quantity.
create table public.vendor_store_team_copies (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  primary key(store_id,instance_id)
);
create table public.vendor_store_team_events (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.vendor_store_team_control enable row level security;
alter table public.vendor_store_team_members enable row level security;
alter table public.vendor_store_team_invites enable row level security;
alter table public.vendor_store_team_copies enable row level security;
alter table public.vendor_store_team_events enable row level security;
revoke all on public.vendor_store_team_control,public.vendor_store_team_members,public.vendor_store_team_invites,
  public.vendor_store_team_copies,public.vendor_store_team_events from public,anon,authenticated,service_role;
grant select,update on public.vendor_store_team_control to service_role;
grant select on public.vendor_store_team_members,public.vendor_store_team_invites,public.vendor_store_team_copies,public.vendor_store_team_events to service_role;

-- All team mutations and revocations serialize on the same store row.
create function public.vendor_store_team_access_v1(p_store uuid,p_permission text default null)
returns public.vendor_stores language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into s from public.vendor_stores where id=p_store for update;
  if s.id is null then raise exception 'Store access unavailable' using errcode='42501'; end if;
  if s.owner_id=auth.uid() and p_permission is null then return s; end if;
  if not exists(select 1 from public.vendor_store_team_control where enabled)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_app')::boolean,false)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  if s.owner_id<>auth.uid() and not exists(select 1 from public.vendor_store_team_members
    where store_id=s.id and user_id=auth.uid() and revoked_at is null and (p_permission is null or p_permission=any(permissions)))
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  return s;
end; $$;

create function public.vendor_store_team_owner_v1() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  select * into s from public.vendor_stores where owner_id=auth.uid();
  if s.id is null then raise exception 'Store owner required' using errcode='42501'; end if;
  return jsonb_build_object('store_id',s.id,'enabled',(select enabled from public.vendor_store_team_control),
    'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'permissions',m.permissions,'revoked_at',m.revoked_at)
      order by m.created_at) from public.vendor_store_team_members m join auth.users u on u.id=m.user_id where m.store_id=s.id),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'permissions',i.permissions,
      'expires_at',i.expires_at,'revoked_at',i.revoked_at,'accepted_at',i.accepted_at) order by i.created_at desc)
      from (select * from public.vendor_store_team_invites where store_id=s.id order by created_at desc limit 50) i),'[]'::jsonb));
end; $$;

create function public.vendor_store_team_change_v1(p_action text,p_email text default null,p_subject uuid default null,p_permissions text[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; token text; invite_id uuid; perms text[]; mail text:=lower(btrim(p_email));
begin
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store owner required' using errcode='42501'; end if;
  if p_action in ('invite','permissions') then
    perform public.vendor_store_team_access_v1(s.id,'inventory');
    if p_permissions is null or cardinality(p_permissions) not between 1 and 4 or array_position(p_permissions,null) is not null
      or not p_permissions <@ array['inventory','pricing','listings','branding']::text[] then raise exception 'Choose manager permissions' using errcode='22023'; end if;
    select array_agg(distinct x order by x) into perms from unnest(p_permissions) x;
  end if;
  if p_action='invite' then
    if mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or exists(select 1 from auth.users where id=s.owner_id and lower(email)=mail) then raise exception 'Choose a different valid email' using errcode='22023'; end if;
    if exists(select 1 from public.vendor_store_team_members m join auth.users u on u.id=m.user_id
      where m.store_id=s.id and m.revoked_at is null and lower(u.email)=mail) then raise exception 'This manager already has access' using errcode='22023'; end if;
    if (select count(*) from public.vendor_store_team_members where store_id=s.id and revoked_at is null)+
       (select count(*) from public.vendor_store_team_invites where store_id=s.id and revoked_at is null and accepted_at is null and expires_at>now() and email<>mail)>=20
      then raise exception 'At most 20 managers and pending invitations' using errcode='22023'; end if;
    update public.vendor_store_team_invites set revoked_at=now() where store_id=s.id and email=mail and accepted_at is null and revoked_at is null;
    token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.vendor_store_team_invites(store_id,email,token_hash,permissions)
      values(s.id,mail,extensions.digest(token,'sha256'),perms) returning id into invite_id;
    insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id,details)
      values(s.id,auth.uid(),'invite',invite_id,jsonb_build_object('permissions',perms));
    return jsonb_build_object('token',token,'expires_at',now()+interval '7 days');
  elsif p_action='permissions' then
    update public.vendor_store_team_members set permissions=perms,updated_at=now()
      where store_id=s.id and user_id=p_subject and revoked_at is null;
    if not found then raise exception 'Manager unavailable' using errcode='22023'; end if;
  elsif p_action='revoke' then
    update public.vendor_store_team_members set revoked_at=coalesce(revoked_at,now()),updated_at=now() where store_id=s.id and user_id=p_subject;
    if not found then raise exception 'Manager unavailable' using errcode='22023'; end if;
  elsif p_action='cancel' then
    update public.vendor_store_team_invites set revoked_at=coalesce(revoked_at,now()) where store_id=s.id and id=p_subject and accepted_at is null;
    if not found then raise exception 'Invitation unavailable' using errcode='22023'; end if;
  else raise exception 'Invalid team action' using errcode='22023'; end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id,details)
    values(s.id,auth.uid(),p_action,p_subject,jsonb_build_object('permissions',perms));
  return jsonb_build_object('ok',true);
end; $$;

create function public.vendor_store_team_accept_v1(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare i public.vendor_store_team_invites; s public.vendor_stores; mail text;
begin
  if auth.uid() is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  select * into i from public.vendor_store_team_invites where token_hash=extensions.digest(p_token,'sha256');
  select * into s from public.vendor_stores where id=i.store_id for update;
  select * into i from public.vendor_store_team_invites where id=i.id for update;
  select lower(email) into mail from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if s.id is null or mail is distinct from i.email or auth.uid()=s.owner_id or i.revoked_at is not null or i.expires_at<=now()
    or not exists(select 1 from public.vendor_store_team_control where enabled)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_app')::boolean,false)
    then raise exception 'Invitation unavailable for this verified account' using errcode='42501'; end if;
  if i.accepted_at is not null then
    if i.accepted_by=auth.uid() and exists(select 1 from public.vendor_store_team_members where store_id=s.id and user_id=auth.uid() and revoked_at is null) then return s.id; end if;
    raise exception 'Invitation already used' using errcode='42501';
  end if;
  insert into public.vendor_store_team_members(store_id,user_id,permissions) values(s.id,auth.uid(),i.permissions)
    on conflict(store_id,user_id) do update set permissions=excluded.permissions,revoked_at=null,updated_at=now();
  update public.vendor_store_team_invites set accepted_at=now(),accepted_by=auth.uid() where id=i.id;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'accept',i.id);
  return s.id;
end; $$;

create function public.vendor_store_team_scope_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.vendor_store_team_copies(store_id,instance_id) values(new.store_id,new.instance_id) on conflict do nothing;
  return new;
end; $$;
insert into public.vendor_store_team_copies select store_id,instance_id from public.vendor_store_items;
create trigger vendor_store_team_scope after insert on public.vendor_store_items for each row execute function public.vendor_store_team_scope_v1();

create function public.vendor_store_team_stores_v1() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'slug',s.slug,'display_name',s.display_name,'permissions',m.permissions) order by s.display_name),'[]'::jsonb)
  from public.vendor_store_team_members m join public.vendor_stores s on s.id=m.store_id
  where m.user_id=auth.uid() and m.revoked_at is null
    and exists(select 1 from public.vendor_store_team_control where enabled)
    and exists(select 1 from public.vendor_store_rollout where app_enabled)
    and coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_app')::boolean,false);
$$;

create function public.vendor_store_team_workspace_v1(p_store uuid,p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; rows jsonb; total integer;
begin
  s:=public.vendor_store_team_access_v1(p_store);
  if p_query is null or length(p_query)>120 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid query' using errcode='22023'; end if;
  with copies as materialized (
    select v.id,v.gv_vi_id,cp.id as card_print_id,cp.name,cp.gv_id,cp.set_code,cp.number,v.condition_label,v.card_printing_id,
      p.printing_gv_id,f.label as finish_label,v.slab_cert_id is not null as is_graded,v.asking_price_amount,v.asking_price_currency,v.updated_at,
      cp.image_source,cp.image_path,cp.image_url,cp.image_alt_url,cp.image_status,cp.image_note,cp.representative_image_url,
      exists(select 1 from public.vendor_store_items i where i.store_id=s.id and i.instance_id=v.id) as selected,
      public.vendor_store_copy_reason_v1(s.owner_id,v.id) as ineligible_reason
    from public.vendor_store_team_copies scope join public.vault_item_instances v on v.id=scope.instance_id
    join public.card_prints cp on cp.id=coalesce(v.card_print_id,(select card_print_id from public.slab_certs where id=v.slab_cert_id))
    left join public.card_printings p on p.id=v.card_printing_id and p.card_print_id=cp.id left join public.finish_keys f on f.key=p.finish_key
    where scope.store_id=s.id and v.user_id=s.owner_id and v.archived_at is null and v.intent='sell'
      and strpos(lower(cp.name||' '||coalesce(v.gv_vi_id,'')||' '||coalesce(cp.gv_id,'')),lower(p_query))>0
  ) select (select count(*) from copies),coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from (select * from copies order by id limit 40 offset p_offset) c),'[]'::jsonb)
    into total,rows;
  return jsonb_build_object('store',jsonb_build_object('id',s.id,'slug',s.slug,'display_name',s.display_name,'description',s.description,'updated_at',s.updated_at,'has_logo',s.logo_path is not null,'has_banner',s.banner_path is not null),
    'permissions',case when s.owner_id=auth.uid() then to_jsonb(array['inventory','pricing','listings','branding']) else
      (select to_jsonb(permissions) from public.vendor_store_team_members where store_id=s.id and user_id=auth.uid() and revoked_at is null) end,
    'items',rows,'total',total,'offset',p_offset);
end; $$;

create function public.vendor_store_team_copy_v1(p_store uuid,p_instance uuid,p_action text,p_expected timestamptz,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; v public.vault_item_instances; permission text; reason text; amount numeric;
begin
  permission:=case p_action when 'condition' then 'inventory' when 'price' then 'pricing' when 'listing' then 'listings' end;
  if permission is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid inventory action' using errcode='22023'; end if;
  s:=public.vendor_store_team_access_v1(p_store,permission);
  select * into v from public.vault_item_instances where id=p_instance and user_id=s.owner_id and archived_at is null and intent='sell' for update;
  if v.id is null or not exists(select 1 from public.vendor_store_team_copies where store_id=s.id and instance_id=v.id)
    then raise exception 'Copy unavailable' using errcode='42501'; end if;
  if v.updated_at is distinct from p_expected then raise exception 'Copy changed. Reload before saving.' using errcode='PT409'; end if;
  if p_action='condition' then
    if v.slab_cert_id is not null or coalesce(p_data->>'condition','') not in ('NM','LP','MP','HP','DMG') then raise exception 'Invalid condition' using errcode='22023'; end if;
    update public.vault_item_instances set condition_label=p_data->>'condition',updated_at=clock_timestamp() where id=v.id;
  elsif p_action='price' then
    if jsonb_typeof(p_data->'amount') is distinct from 'number' or coalesce(p_data->>'currency','') !~ '^[A-Z]{3}$' then raise exception 'Invalid price' using errcode='22023'; end if;
    amount:=(p_data->>'amount')::numeric;
    if amount<=0 or amount>10000000 or amount<>round(amount,2) then raise exception 'Enter a positive price with at most two decimals' using errcode='22023'; end if;
    update public.vault_item_instances set pricing_mode='asking',asking_price_amount=amount,asking_price_currency=p_data->>'currency',updated_at=clock_timestamp() where id=v.id;
  else
    if jsonb_typeof(p_data->'selected') is distinct from 'boolean' then raise exception 'Choose listing state' using errcode='22023'; end if;
    if (p_data->>'selected')::boolean then
      reason:=public.vendor_store_copy_reason_v1(s.owner_id,v.id);
      if reason is not null then raise exception '%',reason using errcode='22023'; end if;
      insert into public.vendor_store_items(store_id,instance_id) values(s.id,v.id) on conflict do nothing;
    else delete from public.vendor_store_items where store_id=s.id and instance_id=v.id; end if;
    update public.vault_item_instances set updated_at=clock_timestamp() where id=v.id;
  end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id,details) values(s.id,auth.uid(),p_action,v.id,p_data);
end; $$;

create function public.vendor_store_team_brand_v1(p_store uuid,p_expected timestamptz,p_name text,p_description text) returns void
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  s:=public.vendor_store_team_access_v1(p_store,'branding');
  if s.updated_at is distinct from p_expected then raise exception 'Store changed. Reload before saving.' using errcode='PT409'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 80 or p_description is null or length(p_description)>1000 then raise exception 'Invalid store details' using errcode='22023'; end if;
  update public.vendor_stores set display_name=btrim(p_name),description=p_description,updated_at=clock_timestamp() where id=s.id;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'branding',s.id);
end; $$;

create function public.vendor_store_team_media_allowed_v1(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(p_path ~ '^[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(png|jpg|webp)$' and exists(
    select 1 from public.vendor_stores s join public.vendor_store_team_members m on m.store_id=s.id
    where s.id::text=split_part(p_path,'/',1) and m.user_id=auth.uid() and m.revoked_at is null and 'branding'=any(m.permissions)
      and exists(select 1 from public.vendor_store_team_control where enabled)
      and exists(select 1 from public.vendor_store_rollout where app_enabled)
      and coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_app')::boolean,false)),false);
$$;
create policy vendor_store_team_media_insert on storage.objects for insert to authenticated
  with check(bucket_id='vendor-store-media' and public.vendor_store_team_media_allowed_v1(name));
create policy vendor_store_team_media_read on storage.objects for select to authenticated
  using(bucket_id='vendor-store-media' and public.vendor_store_team_media_allowed_v1(name));
create function public.vendor_store_team_media_v1(p_store uuid,p_kind text,p_path text) returns void
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  s:=public.vendor_store_team_access_v1(p_store,'branding');
  if p_kind is null or p_kind not in('logo','banner') then raise exception 'Invalid image type' using errcode='22023'; end if;
  if p_path is not null and (p_path !~ '^[0-9a-f-]{36}/(logo|banner)/[0-9a-f-]{36}\.(png|jpg|webp)$'
    or split_part(p_path,'/',1)<>s.id::text or split_part(p_path,'/',2)<>p_kind
    or not exists(select 1 from storage.objects where bucket_id='vendor-store-media' and name=p_path))
    then raise exception 'Image unavailable' using errcode='42501'; end if;
  update public.vendor_stores set logo_path=case when p_kind='logo' then p_path else logo_path end,
    banner_path=case when p_kind='banner' then p_path else banner_path end,updated_at=clock_timestamp() where id=s.id;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id,details)
    values(s.id,auth.uid(),'branding_image',s.id,jsonb_build_object('kind',p_kind));
end; $$;
create function public.vendor_store_team_media_path_v1(p_store uuid,p_kind text) returns text
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  s:=public.vendor_store_team_access_v1(p_store,'branding');
  if p_kind='logo' then return s.logo_path; elsif p_kind='banner' then return s.banner_path; end if;
  raise exception 'Invalid image type' using errcode='22023';
end; $$;
revoke all on function public.vendor_store_team_media_path_v1(uuid,text) from public,anon,service_role;
grant execute on function public.vendor_store_team_media_path_v1(uuid,text) to authenticated;
revoke all on function public.vendor_store_team_media_allowed_v1(text),public.vendor_store_team_media_v1(uuid,text,text) from public,anon,service_role;
grant execute on function public.vendor_store_team_media_allowed_v1(text),public.vendor_store_team_media_v1(uuid,text,text) to authenticated;

revoke all on function public.vendor_store_team_access_v1(uuid,text),public.vendor_store_team_scope_v1() from public,anon,authenticated,service_role;
revoke all on function public.vendor_store_team_owner_v1(),public.vendor_store_team_change_v1(text,text,uuid,text[]),public.vendor_store_team_accept_v1(text),
  public.vendor_store_team_stores_v1(),public.vendor_store_team_workspace_v1(uuid,text,integer),public.vendor_store_team_copy_v1(uuid,uuid,text,timestamptz,jsonb),
  public.vendor_store_team_brand_v1(uuid,timestamptz,text,text) from public,anon,service_role;
grant execute on function public.vendor_store_team_owner_v1(),public.vendor_store_team_change_v1(text,text,uuid,text[]),public.vendor_store_team_accept_v1(text),
  public.vendor_store_team_stores_v1(),public.vendor_store_team_workspace_v1(uuid,text,integer),public.vendor_store_team_copy_v1(uuid,uuid,text,timestamptz,jsonb),
  public.vendor_store_team_brand_v1(uuid,timestamptz,text,text) to authenticated;
commit;
