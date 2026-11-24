-- Candidate only. Private, default-off price-only catalog authority.
-- This never owns inventory, settlement, a payment or an eBay claim.
begin;
do $guard$
begin
 if encode(sha256(convert_to(pg_get_functiondef('public.square_service_v1(text,jsonb)'::regprocedure),'UTF8')),'hex')
   <> '04c8c150fd3e05fb9a01d1c10863b0f6ff5f383ecf13db16ff509947b87d393f' then
   raise exception 'square_batch_prior_authority_drift';
 end if;
end $guard$;

create table grookai_square.price_batch_controls (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into grookai_square.price_batch_controls(singleton) values(true);
create table grookai_square.price_batches (
 id uuid primary key, connection_id uuid not null, owner_id uuid not null,
 environment text not null check(environment in ('sandbox','production')),
 merchant_id text not null, location_id text not null,
 request_text text not null check(octet_length(request_text)<=1048576),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 request_key text not null check(request_key ~ '^gk-square-price-batch-v1-[a-f0-9]{64}$'),
 plan jsonb not null, member_count smallint not null check(member_count between 1 and 25),
 status text not null default 'prepared' check(status in ('prepared','sending','uncertain','succeeded','cancelled','no_effect')),
 created_at timestamptz not null default clock_timestamp(), started_at timestamptz, finished_at timestamptz,
 error_code text check(error_code ~ '^square_[a-z_]{1,80}$'),
 foreign key(connection_id,owner_id) references grookai_square.connections(id,owner_id) on delete restrict,
 unique(id,connection_id), unique(connection_id,request_key),
 check(request_hash=encode(sha256(convert_to(request_text,'UTF8')),'hex')),
 check(request_text::jsonb=plan->'request'),
 check(request_key=request_text::jsonb->>'idempotency_key')
);
create unique index square_one_unresolved_price_batch_v1 on grookai_square.price_batches(connection_id)
 where status in ('prepared','sending','uncertain');
create table grookai_square.price_batch_members (
 batch_id uuid not null, connection_id uuid not null, ordinal smallint not null check(ordinal between 1 and 25),
 target_id uuid not null, instance_id uuid not null,
 binding jsonb not null, previous_object jsonb not null,
 observed_object jsonb, observed_at timestamptz,
 primary key(batch_id,ordinal), unique(batch_id,target_id),
 foreign key(batch_id,connection_id) references grookai_square.price_batches(id,connection_id) on delete restrict,
 foreign key(target_id,connection_id) references grookai_square.targets(id,connection_id) on delete restrict
);
create table grookai_square.price_batch_attempts (
 id uuid primary key, batch_id uuid not null references grookai_square.price_batches(id) on delete restrict,
 lease_fence bigint not null, lease_token uuid not null,
 status text not null default 'sending' check(status in ('sending','unknown','rejected')),
 started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 error_code text check(error_code ~ '^square_[a-z_]{1,80}$'), provider_status integer
);
alter table grookai_square.price_batch_controls enable row level security;
alter table grookai_square.price_batches enable row level security;
alter table grookai_square.price_batch_members enable row level security;
alter table grookai_square.price_batch_attempts enable row level security;
revoke all on grookai_square.price_batch_controls,grookai_square.price_batches,
 grookai_square.price_batch_members,grookai_square.price_batch_attempts from public,anon,authenticated,service_role;

create function grookai_square.price_batch_projection_v1(o jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('name',o#>'{item_data,name}',
 'variationName',o#>'{item_data,variations,0,item_variation_data,name}',
 'sku',o#>'{item_data,variations,0,item_variation_data,sku}',
 'pricingType',o#>'{item_data,variations,0,item_variation_data,pricing_type}',
 'price',o#>'{item_data,variations,0,item_variation_data,price_money}')
$$;
create function grookai_square.price_batch_result_v1(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(b)||jsonb_build_object('members',b.plan->'members')
 from grookai_square.price_batches b where b.id=p_id
$$;
revoke all on function grookai_square.price_batch_projection_v1(jsonb),grookai_square.price_batch_result_v1(uuid)
 from public,anon,authenticated,service_role;

-- Immutable request and normalized membership survive receipt loss and rollback.
create function grookai_square.price_batch_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_table_name='price_batches' then
  if (to_jsonb(new)-array['status','started_at','finished_at','error_code']) is distinct from
     (to_jsonb(old)-array['status','started_at','finished_at','error_code']) then raise exception 'square_batch_immutable'; end if;
 elsif (to_jsonb(new)-array['observed_object','observed_at']) is distinct from
       (to_jsonb(old)-array['observed_object','observed_at']) then raise exception 'square_batch_immutable';
 end if;
 return new;
end $$;
revoke all on function grookai_square.price_batch_immutable_v1() from public,anon,authenticated,service_role;
create trigger square_price_batch_immutable_v1 before update on grookai_square.price_batches
 for each row execute function grookai_square.price_batch_immutable_v1();
create trigger square_price_member_immutable_v1 before update on grookai_square.price_batch_members
 for each row execute function grookai_square.price_batch_immutable_v1();

-- Barrier is inside the old authority after its connection row lock. It also
-- covers artwork's ordinary prepare/begin path, regardless of worker flags.
-- Claim/release, token recovery, reads, stock and settlement remain untouched.
do $barrier$
declare d text; marker text:='  if p_action=''configure'' then'; replacement text;
begin
 d:=pg_get_functiondef('public.square_service_v1(text,jsonb)'::regprocedure);
 if (length(d)-length(replace(d,marker,'')))/length(marker)<>1 then raise exception 'square_batch_barrier_marker_drift'; end if;
 replacement:=$text$  if p_action in ('prepare','begin','adopt') and exists(
    select 1 from grookai_square.price_batches where connection_id=c.id and status in ('prepared','sending','uncertain')) then
    raise exception 'square_price_batch_pending';
  end if;
  if p_action='configure' then$text$;
 execute replace(d,marker,replacement);
end $barrier$;

create function public.square_price_batch_service_v1(p_action text,p_data jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c grookai_square.connections; ctl grookai_square.controls; b grookai_square.price_batches;
 t grookai_square.targets; m grookai_square.price_batch_members; a grookai_square.price_batch_attempts;
 x jsonb; v_binding jsonb; previous jsonb; object jsonb; snapshot jsonb; desired jsonb; observed jsonb;
 i integer; n integer; accepted integer:=0; original integer:=0; unchanged boolean:=true; enabled boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'square_service_only' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>8388608 then raise exception 'square_invalid_request'; end if;
 c:=grookai_square.locked_connection(p_data);
 -- locked_connection historically permits a null deadline; this authority does
 -- not. A lease token alone is never a batch dispatch capability.
 if c.lease_until is null or c.lease_until<=clock_timestamp() then raise exception 'square_connection_busy'; end if;
 select * into ctl from grookai_square.controls where singleton;
 select pc.enabled and ctl.catalog_enabled and c.status='connected' and c.location_id is not null
  and c.refresh_status='idle' and coalesce(c.retry_after<=clock_timestamp(),true)
  and coalesce(c.owner_id=any(ctl.owner_allowlist) or public.square_onboarding_owner_v1(c.owner_id),false)
  into enabled from grookai_square.price_batch_controls pc where pc.singleton;

 if p_action='state' then
  select * into b from grookai_square.price_batches where connection_id=c.id and status in ('prepared','sending','uncertain') for update;
  if b.status='sending' and exists(select 1 from grookai_square.price_batch_attempts
    where batch_id=b.id and status='sending' and lease_fence<c.lease_fence) then
   update grookai_square.price_batch_attempts set status='unknown',finished_at=clock_timestamp(),error_code='square_worker_interrupted'
    where batch_id=b.id and status='sending' and lease_fence<c.lease_fence;
   update grookai_square.price_batches set status='uncertain',error_code='square_worker_interrupted' where id=b.id;
  end if;
  return jsonb_build_object('pending',grookai_square.price_batch_result_v1(b.id),'admissionEnabled',coalesce(enabled,false),
   'legacyPending',exists(select 1 from grookai_square.operations where connection_id=c.id and status in ('prepared','sending','uncertain')),
   'candidates',case when enabled and b.id is null then coalesce((select jsonb_agg(q.value order by q.changed_at,q.id) from (
    select jsonb_build_object('target',to_jsonb(tt),'offer',f.value) value,tt.updated_at changed_at,tt.id
    from grookai_square.targets tt cross join lateral (select grookai_square.offer(c.owner_id,tt.instance_id) value) f
    where tt.connection_id=c.id and tt.selected and tt.item_id is not null and f.value is not null
     and tt.last_synced_projection is not null
     and tt.last_synced_projection->'price' is distinct from jsonb_build_object('amount',((f.value->>'askingPriceAmount')::numeric*100)::bigint,'currency','USD')
    order by tt.updated_at,tt.id limit 25)q),'[]'::jsonb) else '[]'::jsonb end);
 elsif p_action='prepare' then
  if not coalesce(enabled,false) then raise exception 'square_batch_admission_disabled'; end if;
  if exists(select 1 from grookai_square.operations where connection_id=c.id and status in ('prepared','sending','uncertain')) then raise exception 'square_connection_busy'; end if;
  select * into b from grookai_square.price_batches where id=(p_data->>'batchId')::uuid;
  if b.id is not null then
   if b.connection_id<>c.id or b.plan is distinct from p_data->'batch' or b.request_text is distinct from p_data->>'requestText' then raise exception 'square_request_conflict'; end if;
   return grookai_square.price_batch_result_v1(b.id);
  end if;
  x:=p_data->'batch'; n:=jsonb_array_length(x->'members');
  select * into b from grookai_square.price_batches where connection_id=c.id and request_key=x#>>'{request,idempotency_key}';
  if b.id is not null then
   if b.plan is distinct from x or b.request_text is distinct from p_data->>'requestText' then raise exception 'square_request_conflict'; end if;
   return grookai_square.price_batch_result_v1(b.id);
  end if;
  if n is null or n not between 1 and 25 or jsonb_typeof(p_data->'bindings') is distinct from 'array'
   or jsonb_array_length(p_data->'bindings')<>n
   or x->'scope' is distinct from jsonb_build_object('ownerId',c.owner_id,'environment',c.environment,'merchantId',c.merchant_id,'locationId',c.location_id)
   or x->'request' is distinct from (p_data->>'requestText')::jsonb
   or jsonb_array_length(x#>'{request,batches}')<>1 or jsonb_array_length(x#>'{request,batches,0,objects}')<>n
   or x->>'requestHash' is distinct from encode(sha256(convert_to(p_data->>'requestText','UTF8')),'hex')
   or (x->>'requestBytes')::integer<>octet_length(p_data->>'requestText') or (x->>'objectCount')::integer<>n*2
   then raise exception 'square_batch_invalid_request'; end if;
  insert into grookai_square.price_batches(id,connection_id,owner_id,environment,merchant_id,location_id,
   request_text,request_hash,request_key,plan,member_count) values((p_data->>'batchId')::uuid,c.id,c.owner_id,c.environment,c.merchant_id,c.location_id,
   p_data->>'requestText',x->>'requestHash',x#>>'{request,idempotency_key}',x,n) returning * into b;
  for i in 0..n-1 loop
   v_binding:=x->'members'->i; previous:=p_data->'bindings'->i->'previousObject'; object:=x#>'{request,batches,0,objects}'->i;
   select * into t from grookai_square.targets where id=(p_data->'bindings'->i->>'targetId')::uuid and connection_id=c.id for update;
   snapshot:=grookai_square.offer(c.owner_id,t.instance_id);
   desired:=jsonb_build_object('name',snapshot->'name','variationName',snapshot->'variationName',
    'sku','https://grookaivault.com/q/'||(snapshot->>'gvviId'),'pricingType','FIXED_PRICING',
    'price',jsonb_build_object('amount',((snapshot->>'askingPriceAmount')::numeric*100)::bigint,'currency','USD'));
   if t.id is null or t.owner_id<>c.owner_id or t.instance_id is distinct from (p_data->'bindings'->i->>'instanceId')::uuid
    or not t.selected or snapshot is null or snapshot is distinct from v_binding->'sourceSnapshot'
    or snapshot->>'gvviId' is distinct from v_binding->>'gvviId'
    or t.item_id is distinct from v_binding->>'itemId' or t.variation_id is distinct from v_binding->>'variationId'
    or previous->>'id' is distinct from t.item_id or previous->>'type' is distinct from 'ITEM'
    or jsonb_array_length(previous#>'{item_data,variations}')<>1
    or previous#>>'{item_data,variations,0,id}' is distinct from t.variation_id
    or previous#>>'{item_data,variations,0,type}' is distinct from 'ITEM_VARIATION'
    or previous#>>'{item_data,variations,0,item_variation_data,item_id}' is distinct from t.item_id
    or coalesce((previous->>'is_deleted')::boolean,false) or coalesce((previous#>>'{item_data,variations,0,is_deleted}')::boolean,false)
    or previous->'version' is distinct from v_binding->'itemVersion'
    or previous#>'{item_data,variations,0,version}' is distinct from v_binding->'variationVersion'
    or coalesce((v_binding->>'itemVersion')::numeric,0) not between 1 and 9007199254740991
    or coalesce((v_binding->>'variationVersion')::numeric,0) not between 1 and 9007199254740991
    or grookai_square.price_batch_projection_v1(previous) is distinct from t.last_synced_projection
    or (t.last_synced_projection-'price') is distinct from (desired-'price')
    or t.last_synced_projection->'price' is not distinct from desired->'price'
    or desired is distinct from v_binding->'projection'
    or object is distinct from jsonb_set(previous,'{item_data,variations,0,item_variation_data,price_money}',desired->'price')
    then raise exception 'square_batch_copy_changed'; end if;
   if exists(select 1 from grookai_square.price_batch_members where batch_id=b.id
      and (v_binding->>'itemId'=price_batch_members.binding->>'itemId' or v_binding->>'variationId'=price_batch_members.binding->>'variationId')) then raise exception 'square_batch_duplicate_member'; end if;
   insert into grookai_square.price_batch_members(batch_id,connection_id,ordinal,target_id,instance_id,binding,previous_object)
    values(b.id,c.id,i+1,t.id,t.instance_id,v_binding,previous);
  end loop;
  return grookai_square.price_batch_result_v1(b.id);
 end if;

 select * into b from grookai_square.price_batches where id=(p_data->>'batchId')::uuid and connection_id=c.id and owner_id=c.owner_id for update;
 if b.id is null then raise exception 'square_batch_not_owned'; end if;
 if b.environment<>c.environment or b.merchant_id is distinct from c.merchant_id or b.location_id is distinct from c.location_id then raise exception 'square_environment_mismatch'; end if;
 if p_action='begin' then
  if b.status not in ('prepared','uncertain') then raise exception 'square_batch_not_pending'; end if;
  if b.started_at<clock_timestamp()-interval '23 hours' then raise exception 'square_reconciliation_required'; end if;
  for m in select * from grookai_square.price_batch_members where batch_id=b.id order by ordinal loop
   select * into t from grookai_square.targets where id=m.target_id and connection_id=c.id for update;
   if t.id is null or not t.selected or t.instance_id<>m.instance_id or t.item_id is distinct from m.binding->>'itemId'
    or t.variation_id is distinct from m.binding->>'variationId'
    or grookai_square.offer(c.owner_id,m.instance_id) is distinct from m.binding->'sourceSnapshot' then unchanged:=false; end if;
  end loop;
  if not unchanged then
   if b.started_at is null and not exists(select 1 from grookai_square.price_batch_attempts where batch_id=b.id) then
    update grookai_square.price_batches set status='cancelled',finished_at=clock_timestamp(),error_code='square_batch_copy_changed' where id=b.id;
    return grookai_square.price_batch_result_v1(b.id);
   end if;
   raise exception 'square_reconciliation_required';
  end if;
  if not ctl.catalog_enabled or c.status<>'connected' or not coalesce(c.owner_id=any(ctl.owner_allowlist) or public.square_onboarding_owner_v1(c.owner_id),false)
   or c.retry_after>clock_timestamp() or c.refresh_status<>'idle' then raise exception 'square_sync_disabled'; end if;
  if exists(select 1 from grookai_square.operations where connection_id=c.id and status in ('prepared','sending','uncertain')) then raise exception 'square_connection_busy'; end if;
  insert into grookai_square.price_batch_attempts(id,batch_id,lease_fence,lease_token)
   values((p_data->>'attemptId')::uuid,b.id,c.lease_fence,c.lease_token) returning * into a;
  update grookai_square.price_batches set status='sending',started_at=coalesce(started_at,clock_timestamp()),error_code=null where id=b.id;
  return jsonb_build_object('batch',grookai_square.price_batch_result_v1(b.id),'attempt',to_jsonb(a));
 elsif p_action='failure' then
  select * into a from grookai_square.price_batch_attempts where id=(p_data->>'attemptId')::uuid and batch_id=b.id for update;
  if a.id is null or a.lease_fence<>c.lease_fence or a.lease_token<>c.lease_token or b.status not in ('sending','uncertain') then raise exception 'square_batch_attempt_not_owned'; end if;
  if coalesce(p_data->>'errorCode','')!~'^square_[a-z_]{1,80}$' then raise exception 'square_invalid_error_code'; end if;
  if a.status<>'sending' then return grookai_square.price_batch_result_v1(b.id); end if;
  update grookai_square.price_batch_attempts set status=case when p_data->>'uncertain'='false' and (p_data->>'providerStatus')::integer between 400 and 499 then 'rejected' else 'unknown' end,
   provider_status=(p_data->>'providerStatus')::integer,error_code=p_data->>'errorCode',finished_at=clock_timestamp() where id=a.id;
  update grookai_square.price_batches set status='uncertain',error_code=p_data->>'errorCode' where id=b.id;
  return grookai_square.price_batch_result_v1(b.id);
 elsif p_action='observe' then
  if b.status in ('succeeded','cancelled','no_effect') then return grookai_square.price_batch_result_v1(b.id); end if;
  if b.started_at is null or jsonb_typeof(p_data->'objects') is distinct from 'array'
   or jsonb_array_length(p_data->'objects')<>b.member_count then raise exception 'square_batch_invalid_receipt'; end if;
  for m in select * from grookai_square.price_batch_members where batch_id=b.id order by ordinal loop
   select count(*) into n from jsonb_array_elements(p_data->'objects') o where o->>'id'=m.binding->>'itemId';
   if n<>1 then raise exception 'square_batch_invalid_receipt'; end if;
   select value into observed from jsonb_array_elements(p_data->'objects') where value->>'id'=m.binding->>'itemId';
   if observed->>'type' is distinct from 'ITEM' or coalesce((observed->>'is_deleted')::boolean,false)
    or jsonb_array_length(observed#>'{item_data,variations}') is distinct from 1
    or observed#>>'{item_data,variations,0,id}' is distinct from m.binding->>'variationId'
    or observed#>>'{item_data,variations,0,type}' is distinct from 'ITEM_VARIATION'
    or coalesce((observed#>>'{item_data,variations,0,is_deleted}')::boolean,false)
    or observed#>>'{item_data,variations,0,item_variation_data,item_id}' is distinct from m.binding->>'itemId'
    then raise exception 'square_batch_invalid_receipt'; end if;
   if grookai_square.price_batch_projection_v1(observed)=m.binding->'projection'
    and (observed->>'version')::numeric>(m.binding->>'itemVersion')::numeric
    and (observed#>>'{item_data,variations,0,version}')::numeric>(m.binding->>'variationVersion')::numeric then accepted:=accepted+1; end if;
   if observed=m.previous_object then original:=original+1; end if;
   update grookai_square.price_batch_members set observed_object=observed,observed_at=clock_timestamp() where batch_id=b.id and ordinal=m.ordinal;
  end loop;
  if accepted=b.member_count then
   -- Record the external price fact even after privacy/source changed. Keep all
   -- copy_changes and stock obligations intact for the existing withdrawal path.
   for m in select * from grookai_square.price_batch_members where batch_id=b.id order by ordinal loop
    update grookai_square.targets set last_synced_projection=m.binding->'projection'
     where id=m.target_id and connection_id=c.id and instance_id=m.instance_id
      and item_id=m.binding->>'itemId' and variation_id=m.binding->>'variationId';
    if not found then raise exception 'square_mapping_conflict'; end if;
   end loop;
   update grookai_square.price_batches set status='succeeded',finished_at=clock_timestamp(),error_code=null where id=b.id;
  elsif original=b.member_count and exists(select 1 from grookai_square.price_batch_attempts where batch_id=b.id)
   and not exists(select 1 from grookai_square.price_batch_attempts where batch_id=b.id and status<>'rejected') then
   update grookai_square.price_batches set status='no_effect',finished_at=clock_timestamp(),error_code='square_batch_rejected' where id=b.id;
  else
   update grookai_square.price_batches set status='uncertain',error_code='square_batch_unconfirmed' where id=b.id;
  end if;
  return grookai_square.price_batch_result_v1(b.id);
 end if;
 raise exception 'square_unknown_action';
end $$;
revoke all on function grookai_square.price_batch_projection_v1(jsonb),grookai_square.price_batch_result_v1(uuid),
 grookai_square.price_batch_immutable_v1() from public,anon,authenticated,service_role;
revoke all on function public.square_price_batch_service_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.square_price_batch_service_v1(text,jsonb) to service_role;
commit;
