-- Review hardening: reserved section name and safe retained-grant edits.
begin;
create or replace function public.vendor_store_team_section_v1(p_store uuid,p_action text,p_request uuid,p_section uuid,p_expected timestamptz,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; w public.wall_sections; existing uuid; copy uuid; copy_updated timestamptz; section_name text;
begin
 s:=public.vendor_store_team_workflow_access_v1(p_store,'sections');
 if p_action is null or p_action not in('create','rename','assign') or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2048 then raise exception 'Invalid section action' using errcode='22023'; end if;
 if p_action in ('create','rename') then
  if p_data-array['name']::text[]<>'{}'::jsonb or jsonb_typeof(p_data->'name') is distinct from 'string' then raise exception 'Invalid section name' using errcode='22023'; end if;
  section_name:=regexp_replace(btrim(p_data->>'name'),'\s+',' ','g');
  if lower(section_name)='wall' or length(section_name) not between 1 and 80 then raise exception 'Invalid section name' using errcode='22023'; end if;
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
      then
      -- Retaining/removing dormant grants is safe; never introduce a new one.
      if p_action<>'permissions' or not exists(select 1 from public.vendor_store_team_members m
        where m.store_id=s.id and m.user_id=p_subject and m.revoked_at is null
        and not exists(select 1 from unnest(p_permissions) x
          where x in ('intake','sections','custom') and not x=any(m.permissions)))
      then raise exception 'Manager workflows are not enabled' using errcode='42501'; end if;
    end if;
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
commit;
