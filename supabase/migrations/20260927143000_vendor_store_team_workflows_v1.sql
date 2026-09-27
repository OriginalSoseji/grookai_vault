-- Opt-in manager workflows. Existing memberships and publication stay unchanged.
begin;
create table public.vendor_store_team_workflow_control (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into public.vendor_store_team_workflow_control values(true,false);
alter table public.vendor_store_team_workflow_control enable row level security;
revoke all on public.vendor_store_team_workflow_control from public,anon,authenticated,service_role;
grant select,update on public.vendor_store_team_workflow_control to service_role;

create table public.vendor_store_team_requests (
 store_id uuid not null references public.vendor_stores(id) on delete cascade,
 request_id uuid not null,
 actor_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('card','section','product')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8192),
 resource_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(store_id,request_id)
);
alter table public.vendor_store_team_requests enable row level security;
revoke all on public.vendor_store_team_requests from public,anon,authenticated,service_role;
grant select on public.vendor_store_team_requests to service_role;

alter table public.vendor_store_team_members drop constraint vendor_store_team_members_permissions_check;
alter table public.vendor_store_team_members add constraint vendor_store_team_members_permissions_check
 check(cardinality(permissions) between 1 and 7 and permissions <@ array['inventory','pricing','listings','branding','intake','sections','custom']::text[] and array_position(permissions,null) is null);
alter table public.vendor_store_team_invites drop constraint vendor_store_team_invites_permissions_check;
alter table public.vendor_store_team_invites add constraint vendor_store_team_invites_permissions_check
 check(cardinality(permissions) between 1 and 7 and permissions <@ array['inventory','pricing','listings','branding','intake','sections','custom']::text[] and array_position(permissions,null) is null);

create function public.vendor_store_team_workflow_access_v1(p_store uuid,p_permission text)
returns public.vendor_stores language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
 if p_permission is null or p_permission not in ('intake','sections','custom')
  or not exists(select 1 from public.vendor_store_team_workflow_control where enabled)
  then raise exception 'Manager workflow unavailable' using errcode='42501'; end if;
 s:=public.vendor_store_team_access_v1(p_store,p_permission);
 return s;
end; $$;

create function public.vendor_store_team_request_v1(p_store uuid,p_request uuid,p_kind text,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.vendor_store_team_requests;
begin
 if p_request is null or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>8192
  then raise exception 'Invalid request' using errcode='22023'; end if;
 select * into r from public.vendor_store_team_requests where store_id=p_store and request_id=p_request;
 if found then
  if r.actor_id is distinct from auth.uid() or r.kind<>p_kind or r.payload is distinct from p_data
   then raise exception 'Request already used with different details' using errcode='PT409'; end if;
  return r.resource_id;
 end if;
 return null;
end; $$;

create function public.vendor_store_team_workflows_v1(p_store uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; perms text[];
begin
 s:=public.vendor_store_team_access_v1(p_store);
 select case when s.owner_id=auth.uid() then array['intake','sections','custom']::text[] else permissions end
  into perms from public.vendor_store_team_members where store_id=s.id and user_id=auth.uid() and revoked_at is null;
 if s.owner_id=auth.uid() then perms:=array['intake','sections','custom']; end if;
 if not exists(select 1 from public.vendor_store_team_workflow_control where enabled) then return jsonb_build_object('enabled',false,'sections','[]'::jsonb); end if;
 if not coalesce(perms && array['intake','sections','custom']::text[],false) then raise exception 'Workflow permission required' using errcode='42501'; end if;
 perform public.vendor_store_team_access_v1(p_store,case when 'intake'=any(perms) then 'intake' when 'sections'=any(perms) then 'sections' else 'custom' end);
 return jsonb_build_object('enabled',true,'currency',s.custom_currency,'sections',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'updated_at',w.updated_at,'position',v.position) order by v.position,w.id)
  from public.vendor_store_sections v join public.wall_sections w on w.id=v.section_id
  where v.store_id=s.id and w.user_id=s.owner_id and w.is_active),'[]'::jsonb));
end; $$;

create function public.vendor_store_team_add_card_v1(p_store uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; c public.card_prints; v public.vault_item_instances;
 card uuid; printing uuid; anchor uuid; existing uuid; section uuid; amount numeric; reason text;
begin
 s:=public.vendor_store_team_workflow_access_v1(p_store,'intake');
 perform public.vendor_stock_require_isolation_v1();
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2048
  or not(p_data ?& array['card_id','printing_id','condition','amount','currency','listed','sections'])
  or p_data-array['card_id','printing_id','condition','amount','currency','listed','sections']::text[]<>'{}'::jsonb
  or coalesce(p_data->>'condition','') not in ('NM','LP','MP','HP','DMG')
  or jsonb_typeof(p_data->'listed') is distinct from 'boolean'
  or jsonb_typeof(p_data->'sections') is distinct from 'array'
  or coalesce(p_data->>'currency','') !~ '^[A-Z]{3}$'
  then raise exception 'Invalid card details' using errcode='22023'; end if;
 existing:=public.vendor_store_team_request_v1(s.id,p_request,'card',p_data);
 if existing is not null then
  select * into v from public.vault_item_instances where id=existing and user_id=s.owner_id and archived_at is null and intent='sell';
  if v.id is null then raise exception 'Previously added copy is no longer available' using errcode='PT409'; end if;
  return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);
 end if;
 card:=(p_data->>'card_id')::uuid; printing:=(p_data->>'printing_id')::uuid;
 if card is null or printing is null or not public.catalog_card_print_visible_to_request_v1(card)
  or not exists(select 1 from public.card_prints cp
   left join public.sets st on st.id=cp.set_id left join public.catalog_set_release_controls sc on sc.set_id=st.id
   left join public.games g on g.id=cp.game_id where cp.id=card and case when sc.set_id is not null then sc.release_status='public'
    else lower(coalesce(st.game,g.code,''))='pokemon' or exists(select 1 from public.catalog_game_release_controls gc where lower(gc.game_code)=lower(coalesce(st.game,g.code,'')) and gc.release_status='public') end)
  or not exists(select 1 from public.get_public_card_printing_options_v1(array[card],1000,0) p where p.id=printing and p.card_print_id=card and nullif(p.printing_gv_id,'') is not null)
  then raise exception 'Card printing unavailable' using errcode='22023'; end if;
 select * into c from public.card_prints where id=card and nullif(gv_id,'') is not null;
 if c.id is null then raise exception 'Card unavailable' using errcode='22023'; end if;
 if p_data->'amount'<>'null'::jsonb then
  perform public.vendor_store_team_access_v1(s.id,'pricing');
  if jsonb_typeof(p_data->'amount')<>'number' then raise exception 'Invalid price' using errcode='22023'; end if;
  amount:=(p_data->>'amount')::numeric;
  if amount<=0 or amount>10000000 or amount<>round(amount,2) then raise exception 'Invalid price' using errcode='22023'; end if;
 end if;
 if (p_data->>'listed')::boolean then perform public.vendor_store_team_access_v1(s.id,'listings'); end if;
 if jsonb_array_length(p_data->'sections')>20 then raise exception 'Too many sections' using errcode='22023'; end if;
 if jsonb_array_length(p_data->'sections')>0 then perform public.vendor_store_team_workflow_access_v1(s.id,'sections'); end if;
 for section in select value::uuid from jsonb_array_elements_text(p_data->'sections') loop
  if not exists(select 1 from public.vendor_store_sections vs join public.wall_sections ws on ws.id=vs.section_id
   where vs.store_id=s.id and ws.id=section and ws.user_id=s.owner_id and ws.is_active) then raise exception 'Section unavailable' using errcode='42501'; end if;
 end loop;
 -- Same allocator and legacy anchor rule as governed batch intake; actor is unchanged.
 v:=public.admin_vault_instance_create_v1(p_user_id=>s.owner_id,p_card_print_id=>c.id,p_card_printing_id=>printing,p_condition_label=>p_data->>'condition',p_name=>c.name,p_archived_at=>now());
 select id into anchor from public.vault_items where user_id=s.owner_id and card_id=c.id and archived_at is null order by created_at desc,id desc limit 1 for update;
 if anchor is null then insert into public.vault_items(user_id,card_id,gv_id,qty,name,condition_label) values(s.owner_id,c.id,c.gv_id,1,c.name,p_data->>'condition') returning id into anchor;
 else update public.vault_items set qty=qty+1 where id=anchor; end if;
 update public.vault_item_instances set archived_at=null,legacy_vault_item_id=anchor,intent='sell',
  pricing_mode=case when amount is null then 'market' else 'asking' end,asking_price_amount=amount,
  asking_price_currency=case when amount is null then null else p_data->>'currency' end where id=v.id;
 insert into public.vendor_store_team_copies(store_id,instance_id) values(s.id,v.id);
 for section in select distinct value::uuid from jsonb_array_elements_text(p_data->'sections') loop
  insert into public.wall_section_memberships(section_id,vault_item_instance_id) values(section,v.id);
 end loop;
 if (p_data->>'listed')::boolean then
  reason:=public.vendor_store_copy_reason_v1(s.owner_id,v.id);
  if reason is not null then raise exception '%',reason using errcode='22023'; end if;
  insert into public.vendor_store_items(store_id,instance_id) values(s.id,v.id);
 end if;
 insert into public.vendor_store_team_requests values(s.id,p_request,auth.uid(),'card',p_data,v.id,now());
 insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'add_card',v.id);
 return jsonb_build_object('id',v.id,'gvvi',v.gv_vi_id);
end; $$;

create function public.vendor_store_team_section_v1(p_store uuid,p_action text,p_request uuid,p_section uuid,p_expected timestamptz,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; w public.wall_sections; existing uuid; copy uuid; copy_updated timestamptz; section_name text;
begin
 s:=public.vendor_store_team_workflow_access_v1(p_store,'sections');
 if p_action is null or p_action not in('create','rename','assign') or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2048 then raise exception 'Invalid section action' using errcode='22023'; end if;
 if p_action in ('create','rename') then
  if p_data-array['name']::text[]<>'{}'::jsonb or jsonb_typeof(p_data->'name') is distinct from 'string' then raise exception 'Invalid section name' using errcode='22023'; end if;
  section_name:=regexp_replace(btrim(p_data->>'name'),'\s+',' ','g');
  if length(section_name) not between 1 and 80 then raise exception 'Invalid section name' using errcode='22023'; end if;
 end if;
 if p_action='create' then
  existing:=public.vendor_store_team_request_v1(s.id,p_request,'section',p_data);
  if existing is not null then return public.vendor_store_team_workflows_v1(s.id); end if;
  -- Preserve current owner limits:20 stored and3 active until governed plan limits exist.
  if (select count(*) from public.wall_sections where user_id=s.owner_id)>=20 or (select count(*) from public.wall_sections where user_id=s.owner_id and is_active)>=3
   then raise exception 'Section limit reached' using errcode='22023'; end if;
  if exists(select 1 from public.wall_sections where user_id=s.owner_id and lower(regexp_replace(btrim(wall_sections.name),'\s+',' ','g'))=lower(section_name)) then raise exception 'Section name already used' using errcode='22023'; end if;
  insert into public.wall_sections(user_id,name,position) values(s.owner_id,section_name,coalesce((select max(position)+1 from public.wall_sections where user_id=s.owner_id),0)) returning * into w;
  insert into public.vendor_store_sections(store_id,section_id,position) values(s.id,w.id,coalesce((select max(position)+1 from public.vendor_store_sections where store_id=s.id),0));
  insert into public.vendor_store_team_requests values(s.id,p_request,auth.uid(),'section',p_data,w.id,now());
 else
  select ws.* into w from public.wall_sections ws join public.vendor_store_sections vs on vs.section_id=ws.id
   where vs.store_id=s.id and ws.id=p_section and ws.user_id=s.owner_id and ws.is_active for update of ws;
  if w.id is null then raise exception 'Store section unavailable' using errcode='42501'; end if;
  if p_action='rename' then
   if w.updated_at is distinct from p_expected then raise exception 'Section changed. Reload.' using errcode='PT409'; end if;
   if exists(select 1 from public.wall_sections where user_id=s.owner_id and id<>w.id and lower(regexp_replace(btrim(wall_sections.name),'\s+',' ','g'))=lower(section_name)) then raise exception 'Section name already used' using errcode='22023'; end if;
   update public.wall_sections set name=section_name,updated_at=clock_timestamp() where id=w.id;
  else
   if p_data-array['instance_id','included']::text[]<>'{}'::jsonb or jsonb_typeof(p_data->'included') is distinct from 'boolean' then raise exception 'Invalid assignment' using errcode='22023'; end if;
   copy:=(p_data->>'instance_id')::uuid;
   select v.updated_at into copy_updated from public.vault_item_instances v join public.vendor_store_team_copies scope on scope.instance_id=v.id
    where scope.store_id=s.id and v.id=copy and v.user_id=s.owner_id and v.archived_at is null and v.intent='sell' for update of v;
   if not found then raise exception 'Copy unavailable' using errcode='42501'; end if;
   if copy_updated is distinct from p_expected then raise exception 'Copy changed. Reload.' using errcode='PT409'; end if;
   if (p_data->>'included')::boolean then insert into public.wall_section_memberships(section_id,vault_item_instance_id) values(w.id,copy) on conflict do nothing;
   else delete from public.wall_section_memberships where section_id=w.id and vault_item_instance_id=copy; end if;
   update public.vault_item_instances set updated_at=clock_timestamp() where id=copy;
  end if;
 end if;
 insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'section_'||p_action,w.id);
 return public.vendor_store_team_workflows_v1(s.id);
end; $$;

create or replace function public.vendor_store_team_owner_v1() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  select * into s from public.vendor_stores where owner_id=auth.uid();
  if s.id is null then raise exception 'Store owner required' using errcode='42501'; end if;
  return jsonb_build_object('workflows_enabled',(select enabled from public.vendor_store_team_workflow_control),'store_id',s.id,'enabled',(select enabled from public.vendor_store_team_control),
    'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'permissions',m.permissions,'revoked_at',m.revoked_at)
      order by m.created_at) from public.vendor_store_team_members m join auth.users u on u.id=m.user_id where m.store_id=s.id),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'permissions',i.permissions,
      'expires_at',i.expires_at,'revoked_at',i.revoked_at,'accepted_at',i.accepted_at) order by i.created_at desc)
      from (select * from public.vendor_store_team_invites where store_id=s.id order by created_at desc limit 50) i),'[]'::jsonb));
end; $$;

create or replace function public.vendor_store_team_change_v1(p_action text,p_email text default null,p_subject uuid default null,p_permissions text[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; token text; invite_id uuid; perms text[]; mail text:=lower(btrim(p_email));
begin
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store owner required' using errcode='42501'; end if;
  if p_action in ('invite','permissions') then
    perform public.vendor_store_team_access_v1(s.id,'inventory');
    if p_permissions is null or cardinality(p_permissions) not between 1 and 7 or array_position(p_permissions,null) is not null
      or not p_permissions <@ array['inventory','pricing','listings','branding','intake','sections','custom']::text[] then raise exception 'Choose manager permissions' using errcode='22023'; end if;
    if p_permissions && array['intake','sections','custom']::text[] and not exists(select 1 from public.vendor_store_team_workflow_control where enabled)
      then raise exception 'Manager workflows are not enabled' using errcode='42501'; end if;
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

create or replace function public.vendor_store_team_workspace_v1(p_store uuid,p_query text default '',p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; rows jsonb; total integer;
begin
  s:=public.vendor_store_team_access_v1(p_store);
  if p_query is null or length(p_query)>120 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid query' using errcode='22023'; end if;
  with copies as materialized (
    select v.id,v.gv_vi_id,cp.id as card_print_id,cp.name,cp.gv_id,cp.set_code,cp.number,v.condition_label,v.card_printing_id,
      p.printing_gv_id,f.label as finish_label,v.slab_cert_id is not null as is_graded,v.asking_price_amount,v.asking_price_currency,v.updated_at,
      cp.image_source,cp.image_path,cp.image_url,cp.image_alt_url,cp.image_status,cp.image_note,cp.representative_image_url,
      coalesce((select jsonb_agg(m.section_id order by m.section_id) from public.wall_section_memberships m
        join public.vendor_store_sections vs on vs.section_id=m.section_id and vs.store_id=s.id
        join public.wall_sections ws on ws.id=m.section_id and ws.user_id=s.owner_id and ws.is_active
        where m.vault_item_instance_id=v.id),'[]'::jsonb) as section_ids,
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
    'permissions',case when s.owner_id=auth.uid() then to_jsonb(array['inventory','pricing','listings','branding','intake','sections','custom']) else
      (select to_jsonb(permissions) from public.vendor_store_team_members where store_id=s.id and user_id=auth.uid() and revoked_at is null) end,
    'items',rows,'total',total,'offset',p_offset);
end; $$;

create function public.vendor_store_team_products_v1(p_store uuid,p_product_id uuid default null,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page'; end if;
  s:=public.vendor_store_team_workflow_access_v1(p_store,'custom');
  return jsonb_build_object('products',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object(
    'asking_price_currency',s.custom_currency,'ineligible_reason',public.vendor_store_custom_reason_v1(p.id),
    'section_ids',coalesce((select jsonb_agg(section_id order by section_id) from public.vendor_store_custom_product_sections where product_id=p.id),'[]'::jsonb)) order by p.id)
    from (select * from public.vendor_store_custom_products where store_id=s.id and (p_product_id is null or id=p_product_id) order by id limit 40 offset p_offset) p),'[]'::jsonb),
    'total',(select count(*) from public.vendor_store_custom_products where store_id=s.id and (p_product_id is null or id=p_product_id)),
    'offset',p_offset,'limit',40);
end; $$;

create function public.vendor_store_team_product_v1(p_store uuid,p_request uuid,p_product_id uuid,p_expected_version bigint,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; p public.vendor_store_custom_products; k text; paths text[]; section_ids uuid[]; reason text; n numeric; existing uuid; created boolean:=p_product_id is null;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_action is null or p_action not in ('save','photos','sections','publish','unpublish') or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid product action' using errcode='22023'; end if;
  s:=public.vendor_store_team_workflow_access_v1(p_store,'custom');
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  if p_action not in ('unpublish','archive') and (
    not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled and custom_enabled))
    then raise exception 'Custom product access unavailable' using errcode='42501'; end if;
  if octet_length(p_data::text)>8192 then raise exception 'Product payload too large' using errcode='22023'; end if;
  if p_action in ('publish','unpublish') then perform public.vendor_store_team_access_v1(s.id,'listings'); end if;
  if p_action='sections' then
    perform public.vendor_store_team_workflow_access_v1(s.id,'sections');
    if p_data-array['section_ids']::text[]<>'{}'::jsonb then raise exception 'Invalid section fields' using errcode='22023'; end if;
  end if;
  if p_action='photos' and p_data-array['paths']::text[]<>'{}'::jsonb then raise exception 'Invalid photo fields' using errcode='22023'; end if;
  if p_action in ('publish','unpublish') and p_data<>'{}'::jsonb then raise exception 'Invalid publication fields' using errcode='22023'; end if;
  if p_action='save' and p_data ? 'asking_price_amount' then perform public.vendor_store_team_access_v1(s.id,'pricing'); end if;
  if p_product_id is null then
    if p_action<>'save' or p_expected_version is not null then raise exception 'Create a draft first' using errcode='22023'; end if;
    existing:=public.vendor_store_team_request_v1(s.id,p_request,'product',p_data);
    if existing is not null then return public.vendor_store_team_products_v1(s.id,existing); end if;
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
      x is null or x !~ '^[0-9a-f-]{36}/products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' or split_part(x,'/',1)<>s.id::text or split_part(x,'/',3)<>p.id::text
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
  if created then insert into public.vendor_store_team_requests values(s.id,p_request,auth.uid(),'product',p_data,p.id,now()); end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'product_'||p_action,p.id);
  return public.vendor_store_team_products_v1(s.id,p.id);
end; $$;

-- Private product media is served/uploaded through the validating server route.
-- This grants no direct Storage INSERT or SELECT policy to managers.
create function public.vendor_store_team_product_media_v1(p_store uuid,p_product uuid,p_upload boolean default false,p_path text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; p public.vendor_store_custom_products;
begin
 s:=public.vendor_store_team_workflow_access_v1(p_store,'custom');
 select * into p from public.vendor_store_custom_products where id=p_product and store_id=s.id and archived_at is null;
 if p.id is null then raise exception 'Product unavailable' using errcode='42501'; end if;
 if p_upload is true then
  if (select count(*) from public.vendor_store_team_events where store_id=s.id and action='product_upload' and created_at>now()-interval '1 hour')>=20
   then raise exception 'Image upload limit reached. Try again later.' using errcode='22023'; end if;
  insert into public.vendor_store_team_events(store_id,actor_id,action,subject_id) values(s.id,auth.uid(),'product_upload',p.id);
 elsif p_path is not null and not p_path=any(p.photo_paths) then raise exception 'Image unavailable' using errcode='42501';
 end if;
 return jsonb_build_object('version',p.version,'photo_paths',p.photo_paths);
end; $$;

revoke all on function public.vendor_store_team_workflow_access_v1(uuid,text),public.vendor_store_team_request_v1(uuid,uuid,text,jsonb)
 from public,anon,authenticated,service_role;
revoke all on function public.vendor_store_team_workflows_v1(uuid),public.vendor_store_team_add_card_v1(uuid,uuid,jsonb),
 public.vendor_store_team_section_v1(uuid,text,uuid,uuid,timestamptz,jsonb),public.vendor_store_team_products_v1(uuid,uuid,integer),
 public.vendor_store_team_product_v1(uuid,uuid,uuid,bigint,text,jsonb),public.vendor_store_team_product_media_v1(uuid,uuid,boolean,text)
 from public,anon,service_role;
grant execute on function public.vendor_store_team_workflows_v1(uuid),public.vendor_store_team_add_card_v1(uuid,uuid,jsonb),
 public.vendor_store_team_section_v1(uuid,text,uuid,uuid,timestamptz,jsonb),public.vendor_store_team_products_v1(uuid,uuid,integer),
 public.vendor_store_team_product_v1(uuid,uuid,uuid,bigint,text,jsonb),public.vendor_store_team_product_media_v1(uuid,uuid,boolean,text)
 to authenticated;
notify pgrst,'reload schema';
commit;
