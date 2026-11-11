-- Default-off catalog authority only. No canonical, stock or payment writer.
begin;
create schema if not exists grookai_square;
revoke all on schema grookai_square from public,anon,authenticated,service_role;

create table grookai_square.controls (
  singleton boolean primary key default true check(singleton),
  linking_enabled boolean not null default false,
  catalog_enabled boolean not null default false,
  revision bigint not null default 0,
  owner_allowlist uuid[] not null default '{}'
);
insert into grookai_square.controls(singleton) values(true);
create table grookai_square.connections (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete restrict,
  environment text not null check(environment in ('sandbox','production')),
  merchant_id text check(merchant_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  location_id text check(location_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  status text not null default 'disconnected' check(status in ('disconnected','connected','reconnect_required')),
  token_ciphertext text check(octet_length(token_ciphertext)<=65536),
  refresh_status text not null default 'idle' check(refresh_status in ('idle','started','uncertain')),
  auto_sync boolean not null default false,
  lease_token uuid, lease_fence bigint not null default 0, lease_until timestamptz,
  created_at timestamptz not null default now(), unique(owner_id,environment), unique(id,owner_id),
  check(status<>'connected' or (merchant_id is not null and token_ciphertext is not null))
);
create unique index square_merchant_binding_v1 on grookai_square.connections(environment,merchant_id) where merchant_id is not null;
create table grookai_square.oauth_attempts (
  id uuid primary key, connection_id uuid not null references grookai_square.connections(id) on delete restrict,
  state_hash text not null unique check(state_hash ~ '^[0-9a-f]{64}$'),
  launch_hash text not null unique check(launch_hash ~ '^[0-9a-f]{64}$'),
  state_ciphertext text not null check(octet_length(state_ciphertext)<=8192),
  browser_hash text check(browser_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'created' check(status in ('created','launched','exchanging','connected','failed','uncertain')),
  expires_at timestamptz not null default clock_timestamp()+interval '10 minutes',
  created_at timestamptz not null default clock_timestamp(), error_code text
);
create table grookai_square.targets (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null,
  owner_id uuid not null, instance_id uuid not null references public.vault_item_instances(id) on delete restrict,
  selected boolean not null default true, item_id text, variation_id text,
  last_synced_projection jsonb, last_error text, updated_at timestamptz not null default now(),
  foreign key(connection_id,owner_id) references grookai_square.connections(id,owner_id) on delete restrict,
  unique(connection_id,instance_id), unique(connection_id,variation_id), unique(id,connection_id),
  check((item_id is null)=(variation_id is null)),
  check(item_id is null or (item_id ~ '^[A-Za-z0-9_-]{1,100}$' and variation_id ~ '^[A-Za-z0-9_-]{1,100}$'))
);
create table grookai_square.operations (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null, target_id uuid not null,
  request_id uuid not null, payload jsonb not null, source_snapshot jsonb not null, projection jsonb not null,
  kind text not null default 'catalog' check(kind in ('catalog','adoption')),
  status text not null default 'prepared' check(status in ('prepared','sending','uncertain','succeeded','failed')),
  created_at timestamptz not null default clock_timestamp(), started_at timestamptz,
  finished_at timestamptz, error_code text, receipt jsonb,
  foreign key(target_id,connection_id) references grookai_square.targets(id,connection_id) on delete restrict,
  unique(connection_id,request_id), check(octet_length(payload::text)<=1048576)
);
create unique index square_one_unresolved_operation_v1 on grookai_square.operations(connection_id)
  where status in ('prepared','sending','uncertain');

alter table grookai_square.controls enable row level security;
alter table grookai_square.connections enable row level security;
alter table grookai_square.oauth_attempts enable row level security;
alter table grookai_square.targets enable row level security;
alter table grookai_square.operations enable row level security;
revoke all on all tables in schema grookai_square from public,anon,authenticated,service_role;

create function grookai_square.offer(p_owner uuid,p_instance uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v public.vault_item_instances; entitlement jsonb; result jsonb;
begin
  if public.vendor_store_copy_reason_v1(p_owner,p_instance) is not null then return null; end if;
  entitlement:=public.grookai_effective_entitlement_v1(p_owner);
  if coalesce((entitlement->>'is_active')::boolean,false) is not true or not coalesce((
    entitlement->>'tier' in ('vendor','founder_admin') or entitlement->>'role' in ('vendor','founder')
    or coalesce((entitlement->'features'->>'vendor_tools')::boolean,false)),false) then return null; end if;
  select * into v from public.vault_item_instances where id=p_instance and user_id=p_owner and archived_at is null;
  if not found or v.asking_price_currency<>'USD' or round(v.asking_price_amount,2)<>v.asking_price_amount then return null; end if;
  select jsonb_build_object('ownerId',p_owner,'gvviId',v.gv_vi_id,'selected',true,'publicVendorOffer',true,'available',true,
    'name',left(cp.name||' · '||coalesce(s.name,cp.set_code)||' #'||coalesce(cp.number,'?'),255),
    'variationName',left(coalesce(f.label,p.finish_key)||' · '||case when v.slab_cert_id is not null
      then coalesce(cert.grader,v.grade_company,'Unknown grader')||' '||coalesce(cert.grade::text,v.grade_label,v.grade_value,'Unknown grade')
      else coalesce(nullif(v.condition_label,''),'Condition unspecified') end,255),
    'askingPriceAmount',v.asking_price_amount::numeric(20,2)::text,'currency',v.asking_price_currency)
  into result from public.card_prints cp join public.card_printings p on p.id=v.card_printing_id and p.card_print_id=cp.id
    left join public.sets s on s.id=cp.set_id left join public.finish_keys f on f.key=p.finish_key
    left join public.slab_certs cert on cert.id=v.slab_cert_id
  where cp.id=coalesce(v.card_print_id,(select card_print_id from public.slab_certs where id=v.slab_cert_id));
  return result;
end $$;

create function public.square_workspace_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'square_sign_in_required' using errcode='28000'; end if;
  select jsonb_build_object('linkingEnabled',c.linking_enabled and actor=any(c.owner_allowlist),
    'catalogEnabled',c.catalog_enabled and actor=any(c.owner_allowlist),
    'connections',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'environment',x.environment,
      'status',x.status,'merchantId',x.merchant_id,'locationId',x.location_id,'autoSync',x.auto_sync,
      'targets',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'instanceId',t.instance_id,
        'selected',t.selected,'mapped',t.item_id is not null,'errorCode',t.last_error,'updatedAt',t.updated_at))
        from grookai_square.targets t where t.connection_id=x.id),'[]'::jsonb)))
      from grookai_square.connections x where x.owner_id=actor),'[]'::jsonb)) into result
    from grookai_square.controls c where singleton;
  return result;
end $$;

-- Only the trusted server dispatches this RPC after shared SDK authentication.
-- Each invocation commits before provider IO; no transaction spans the network.
create function public.square_service_v1(p_action text,p_data jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=(p_data->>'ownerId')::uuid; c grookai_square.connections;
  a grookai_square.oauth_attempts; t grookai_square.targets; op grookai_square.operations;
  ctl grookai_square.controls; snapshot jsonb; instance uuid; token uuid:=(p_data->>'leaseToken')::uuid;
  fence bigint:=(p_data->>'fence')::bigint;
begin
  if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>1200000 then raise exception 'square_invalid_request'; end if;
  select * into ctl from grookai_square.controls where singleton;
  if p_action='oauth_start' then
    if not ctl.linking_enabled or not coalesce(actor=any(ctl.owner_allowlist),false) then raise exception 'square_linking_disabled'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||(p_data->>'environment'),0));
    insert into grookai_square.connections(owner_id,environment) values(actor,p_data->>'environment')
      on conflict(owner_id,environment) do nothing;
    select * into c from grookai_square.connections where owner_id=actor and environment=p_data->>'environment' for update;
    insert into grookai_square.oauth_attempts(id,connection_id,state_hash,launch_hash,state_ciphertext)
      values((p_data->>'attemptId')::uuid,c.id,p_data->>'stateHash',p_data->>'launchHash',p_data->>'stateCiphertext') returning * into a;
    return to_jsonb(a)||jsonb_build_object('ownerId',actor,'environment',c.environment);
  elsif p_action='oauth_launch' then
    select * into a from grookai_square.oauth_attempts where launch_hash=p_data->>'launchHash' for update;
    if a.id is null or a.status<>'created' or a.expires_at<=clock_timestamp() then raise exception 'square_oauth_expired'; end if;
    update grookai_square.oauth_attempts set status='launched',browser_hash=p_data->>'browserHash' where id=a.id returning * into a;
    select * into c from grookai_square.connections where id=a.connection_id;
    return to_jsonb(a)||jsonb_build_object('ownerId',c.owner_id,'environment',c.environment);
  elsif p_action='oauth_consume' then
    select * into a from grookai_square.oauth_attempts where state_hash=p_data->>'stateHash' for update;
    if a.id is null or a.status<>'launched' or a.browser_hash is distinct from p_data->>'browserHash'
      or a.expires_at<=clock_timestamp() then raise exception 'square_oauth_expired'; end if;
    update grookai_square.oauth_attempts set status='exchanging' where id=a.id returning * into a;
    select * into c from grookai_square.connections where id=a.connection_id;
    return to_jsonb(a)||jsonb_build_object('ownerId',c.owner_id,'environment',c.environment);
  elsif p_action in ('oauth_finish','oauth_fail') then
    select * into a from grookai_square.oauth_attempts where id=(p_data->>'attemptId')::uuid for update;
    if a.id is null or a.status<>'exchanging' then raise exception 'square_oauth_not_pending'; end if;
    if p_action='oauth_fail' then
      update grookai_square.oauth_attempts set status='uncertain',error_code='square_exchange_unconfirmed' where id=a.id;
      return jsonb_build_object('status','reconnect_required');
    end if;
    select * into c from grookai_square.connections where id=a.connection_id for update;
    if (c.merchant_id is not null and c.merchant_id is distinct from p_data->>'merchantId')
      or (c.lease_until>clock_timestamp()) then raise exception 'square_connection_conflict'; end if;
    update grookai_square.connections set merchant_id=p_data->>'merchantId',status='connected',
      token_ciphertext=p_data->>'tokenCiphertext',refresh_status='idle' where id=c.id returning * into c;
    update grookai_square.oauth_attempts set status='connected' where id=a.id;
    return jsonb_build_object('status','connected','connectionId',c.id);
  end if;

  select * into c from grookai_square.connections where id=(p_data->>'connectionId')::uuid and owner_id=actor for update;
  if c.id is null then raise exception 'square_connection_not_owned'; end if;
  if p_action='configure' then
    if not ctl.catalog_enabled or not coalesce(actor=any(ctl.owner_allowlist),false) or c.status<>'connected'
      or token is null or fence is null or c.lease_token is distinct from token or c.lease_fence<>fence
      or coalesce(c.lease_until<=clock_timestamp(),true) then raise exception 'square_sync_disabled'; end if;
    if c.location_id is not null and c.location_id is distinct from p_data->>'locationId'
      and exists(select 1 from grookai_square.targets where connection_id=c.id) then raise exception 'square_location_locked'; end if;
    update grookai_square.connections set location_id=p_data->>'locationId',auto_sync=coalesce((p_data->>'autoSync')::boolean,false) where id=c.id;
    return jsonb_build_object('configured',true);
  elsif p_action='select' then
    if not ctl.catalog_enabled or not coalesce(actor=any(ctl.owner_allowlist),false) or c.status<>'connected' or c.location_id is null
      or p_data->>'confirmed' is distinct from 'true' then raise exception 'square_sync_disabled'; end if;
    if jsonb_typeof(p_data->'instanceIds') is distinct from 'array' or jsonb_array_length(p_data->'instanceIds') not between 1 and 1000 then raise exception 'square_invalid_selection'; end if;
    for instance in select value::uuid from jsonb_array_elements_text(p_data->'instanceIds') loop
      if grookai_square.offer(actor,instance) is null then raise exception 'square_copy_ineligible'; end if;
      insert into grookai_square.targets(connection_id,owner_id,instance_id) values(c.id,actor,instance)
        on conflict(connection_id,instance_id) do update set selected=true;
    end loop;
    return jsonb_build_object('selected',true);
  elsif p_action='pause' then
    update grookai_square.connections set auto_sync=false where id=c.id;
    return jsonb_build_object('paused',true);
  elsif p_action='deselect' then
    if jsonb_typeof(p_data->'instanceIds') is distinct from 'array' or jsonb_array_length(p_data->'instanceIds') not between 1 and 1000 then raise exception 'square_invalid_selection'; end if;
    update grookai_square.targets set selected=false,updated_at=clock_timestamp() where connection_id=c.id
      and instance_id in (select value::uuid from jsonb_array_elements_text(p_data->'instanceIds'));
    return jsonb_build_object('deselected',true);
  elsif p_action='disconnect' then
    update grookai_square.connections set status='disconnected',auto_sync=false,token_ciphertext=null,
      lease_token=null,lease_until=null,lease_fence=lease_fence+1 where id=c.id;
    update grookai_square.operations set status='uncertain',error_code='square_disconnected_during_operation'
      where connection_id=c.id and status='sending';
    return jsonb_build_object('status','disconnected');
  elsif p_action='claim' then
    if c.status<>'connected' then raise exception 'square_reconnect_required'; end if;
    if token is null then raise exception 'square_invalid_lease'; end if;
    if c.lease_until>clock_timestamp() then
      if c.lease_token=token then return to_jsonb(c); end if;
      raise exception 'square_connection_busy';
    end if;
    if c.lease_token=token then raise exception 'square_stale_lease'; end if;
    update grookai_square.connections set lease_token=token,lease_fence=lease_fence+1,
      lease_until=clock_timestamp()+interval '120 seconds',
      refresh_status=case when refresh_status='started' then 'uncertain' else refresh_status end
      where id=c.id returning * into c;
    update grookai_square.operations set status='uncertain',error_code='square_worker_interrupted'
      where connection_id=c.id and status='sending';
    return to_jsonb(c);
  end if;
  if token is null or fence is null or c.lease_token is distinct from token or c.lease_fence<>fence
    or coalesce(c.lease_until<=clock_timestamp(),true) then raise exception 'square_stale_lease'; end if;
  if p_action='release' then
    update grookai_square.connections set lease_until=null where id=c.id;
    return jsonb_build_object('released',true);
  elsif p_action='refresh_prepare' then
    if c.refresh_status<>'idle' then raise exception 'square_refresh_unconfirmed'; end if;
    update grookai_square.connections set refresh_status='started' where id=c.id;
    return jsonb_build_object('prepared',true);
  elsif p_action='refresh_finish' then
    if c.refresh_status<>'started' then raise exception 'square_refresh_unconfirmed'; end if;
    update grookai_square.connections set refresh_status='idle',token_ciphertext=p_data->>'tokenCiphertext' where id=c.id;
    return jsonb_build_object('refreshed',true);
  elsif p_action='refresh_fail' then
    update grookai_square.connections set refresh_status='uncertain',status='reconnect_required' where id=c.id;
    return jsonb_build_object('status','reconnect_required');
  end if;
  select * into t from grookai_square.targets where id=(p_data->>'targetId')::uuid and connection_id=c.id for update;
  if t.id is null then raise exception 'square_target_not_owned'; end if;
  snapshot:=grookai_square.offer(actor,t.instance_id);
  if p_action='no_change' then
    update grookai_square.targets set last_error=null,updated_at=clock_timestamp() where id=t.id;
    return jsonb_build_object('unchanged',true);
  elsif p_action='target' then
    select * into op from grookai_square.operations where connection_id=c.id and status in ('prepared','sending','uncertain');
    return jsonb_build_object('target',to_jsonb(t),'offer',snapshot,'pendingOperation',case when op.id is null then null else to_jsonb(op) end);
  elsif p_action='prepare' then
    if not ctl.catalog_enabled or not coalesce(actor=any(ctl.owner_allowlist),false) or not t.selected or snapshot is null
      or snapshot is distinct from p_data->'sourceSnapshot' then raise exception 'square_copy_changed'; end if;
    select * into op from grookai_square.operations where connection_id=c.id and request_id=(p_data->>'requestId')::uuid;
    if op.id is not null then
      if op.target_id<>t.id or op.payload is distinct from p_data->'payload' then raise exception 'square_request_conflict'; end if;
      return to_jsonb(op);
    end if;
    insert into grookai_square.operations(connection_id,target_id,request_id,payload,source_snapshot,projection)
      values(c.id,t.id,(p_data->>'requestId')::uuid,p_data->'payload',snapshot,p_data->'projection') returning * into op;
    return to_jsonb(op);
  elsif p_action='adopt' then
    if not ctl.catalog_enabled or not coalesce(actor=any(ctl.owner_allowlist),false) or not t.selected or snapshot is null
      or p_data->>'confirmed' is distinct from 'true' or snapshot is distinct from p_data->'sourceSnapshot'
      or coalesce(p_data->>'itemId','') !~ '^[A-Za-z0-9_-]{1,100}$'
      or coalesce(p_data->>'variationId','') !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'square_adoption_requires_review'; end if;
    if t.item_id is not null then
      if t.item_id is distinct from p_data->>'itemId' or t.variation_id is distinct from p_data->>'variationId' then raise exception 'square_mapping_conflict'; end if;
      return jsonb_build_object('adopted',true);
    end if;
    if exists(select 1 from grookai_square.operations where connection_id=c.id and status in ('prepared','sending','uncertain')) then raise exception 'square_reconciliation_required'; end if;
    insert into grookai_square.operations(connection_id,target_id,request_id,payload,source_snapshot,projection,kind,status,finished_at,receipt)
      values(c.id,t.id,(p_data->>'requestId')::uuid,jsonb_build_object('adoption',true),snapshot,p_data->'projection','adoption','succeeded',clock_timestamp(),
        jsonb_build_object('itemId',p_data->>'itemId','variationId',p_data->>'variationId'));
    update grookai_square.targets set item_id=p_data->>'itemId',variation_id=p_data->>'variationId',
      last_synced_projection=p_data->'projection',last_error=null,updated_at=clock_timestamp() where id=t.id;
    return jsonb_build_object('adopted',true);
  elsif p_action in ('begin','finish','recover_finish','fail') then
    select * into op from grookai_square.operations where id=(p_data->>'operationId')::uuid and target_id=t.id and connection_id=c.id for update;
    if op.id is null then raise exception 'square_operation_not_owned'; end if;
    if p_action='begin' then
      if op.status not in ('prepared','uncertain') then raise exception 'square_operation_not_pending'; end if;
      if op.started_at<clock_timestamp()-interval '23 hours' then raise exception 'square_reconciliation_required'; end if;
      if not ctl.catalog_enabled or not coalesce(actor=any(ctl.owner_allowlist),false)
        or not t.selected or snapshot is distinct from op.source_snapshot then raise exception 'square_copy_changed'; end if;
      update grookai_square.operations set status='sending',started_at=coalesce(started_at,clock_timestamp()) where id=op.id returning * into op;
      return to_jsonb(op);
    elsif p_action in ('finish','recover_finish') then
      if op.status='succeeded' then return to_jsonb(op); end if;
      if (p_action='finish' and op.status<>'sending') or
        (p_action='recover_finish' and (op.status<>'uncertain' or p_data->'observedProjection' is distinct from op.projection))
        or coalesce(p_data->>'itemId','') !~ '^[A-Za-z0-9_-]{1,100}$'
        or coalesce(p_data->>'variationId','') !~ '^[A-Za-z0-9_-]{1,100}$' then raise exception 'square_invalid_receipt'; end if;
      if t.item_id is not null and (t.item_id is distinct from p_data->>'itemId' or t.variation_id is distinct from p_data->>'variationId') then raise exception 'square_mapping_conflict'; end if;
      update grookai_square.targets set item_id=p_data->>'itemId',variation_id=p_data->>'variationId',
        last_synced_projection=op.projection,last_error=null,updated_at=clock_timestamp() where id=t.id;
      update grookai_square.operations set status='succeeded',receipt=jsonb_build_object('itemId',p_data->>'itemId',
        'variationId',p_data->>'variationId'),finished_at=clock_timestamp(),error_code=null where id=op.id returning * into op;
      return to_jsonb(op);
    end if;
    if op.status not in ('prepared','sending','uncertain') then raise exception 'square_operation_not_pending'; end if;
    if coalesce(p_data->>'errorCode','') !~ '^square_[a-z_]{1,80}$' then raise exception 'square_invalid_error_code'; end if;
    update grookai_square.operations set status=case when p_data->>'uncertain'='true' then 'uncertain' else 'failed' end,
      error_code=p_data->>'errorCode',finished_at=clock_timestamp() where id=op.id returning * into op;
    update grookai_square.targets set last_error=p_data->>'errorCode',updated_at=clock_timestamp() where id=t.id;
    return to_jsonb(op);
  elsif p_action='target_error' then
    if coalesce(p_data->>'errorCode','') !~ '^square_[a-z_]{1,80}$' then raise exception 'square_invalid_error_code'; end if;
    update grookai_square.targets set last_error=p_data->>'errorCode',updated_at=clock_timestamp() where id=t.id;
    return jsonb_build_object('recorded',true);
  end if;
  raise exception 'square_unknown_action';
end $$;

revoke all on function grookai_square.offer(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.square_workspace_v1() from public,anon,authenticated,service_role;
grant execute on function public.square_workspace_v1() to authenticated;
revoke all on function public.square_service_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.square_service_v1(text,jsonb) to service_role;
comment on function public.square_service_v1(text,jsonb) is 'Server-only default-off Square catalog authority. No inventory allocation or payment mutations.';

create function public.square_poll_v1(p_limit integer default 10) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 25 then raise exception 'square_invalid_limit'; end if;
  return coalesce((select jsonb_agg(row) from (select t.id as "targetId",c.id as "connectionId",c.owner_id as "ownerId"
    from grookai_square.targets t join grookai_square.connections c on c.id=t.connection_id
    cross join grookai_square.controls ctl where ctl.singleton and ctl.catalog_enabled
      and c.owner_id=any(ctl.owner_allowlist) and c.status='connected' and c.auto_sync and t.selected
    order by t.updated_at,t.id limit p_limit) row),'[]'::jsonb);
end $$;
revoke all on function public.square_poll_v1(integer) from public,anon,authenticated,service_role;
grant execute on function public.square_poll_v1(integer) to service_role;

create table grookai_square.control_history (
  revision bigint primary key, changed_at timestamptz not null default clock_timestamp(),
  linking_enabled boolean not null, catalog_enabled boolean not null, owner_allowlist uuid[] not null
);
alter table grookai_square.control_history enable row level security;
revoke all on grookai_square.control_history from public,anon,authenticated,service_role;
create function public.square_controls_set_v1(p_expected_revision bigint,p_linking boolean,p_catalog boolean,p_owners uuid[])
returns bigint language plpgsql volatile security definer set search_path='' as $$
declare current_revision bigint;
begin
  select revision into current_revision from grookai_square.controls where singleton for update;
  if p_expected_revision is distinct from current_revision or p_linking is null or p_catalog is null or p_owners is null
    or cardinality(p_owners)>100 or array_position(p_owners,null) is not null
    or exists(select 1 from unnest(p_owners) owner where not exists(select 1 from auth.users where id=owner))
    then raise exception 'square_controls_conflict' using errcode='PT409'; end if;
  update grookai_square.controls set revision=revision+1,linking_enabled=p_linking,catalog_enabled=p_catalog,
    owner_allowlist=p_owners where singleton returning revision into current_revision;
  insert into grookai_square.control_history(revision,linking_enabled,catalog_enabled,owner_allowlist)
    values(current_revision,p_linking,p_catalog,p_owners);
  return current_revision;
end $$;
revoke all on function public.square_controls_set_v1(bigint,boolean,boolean,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.square_controls_set_v1(bigint,boolean,boolean,uuid[]) to service_role;
commit;
